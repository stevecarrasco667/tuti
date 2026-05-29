import { watch, toRaw } from 'vue';
import { useSocket } from './useSocket';
import { applyPatch } from 'fast-json-patch';
import { ServerMessage, PrivateRolePayload, RoomState } from '../../shared/types';
import { useGameState } from './useGameState';
import { EVENTS, APP_VERSION } from '../../shared/consts';
import { useToast } from './useToast';
import { i18n } from '../i18n';
import type { ChatMessage } from '../../shared/types';

let globalOnNavigate: ((path: string) => void) | null = null;

// [Sprint 2 - P2] Helper centralizado para sincronizar la URL con el estado del servidor.
// Se llama tanto desde UPDATE_STATE como desde PATCH_STATE para garantizar que
// cualquier cambio de vista del servidor se refleje en el router.
// activeView: 'LOBBY' | 'GAME' | 'GAME_OVER' — no existe 'HOME' en el tipo del servidor.
function syncRoute(roomId: string | null, view?: 'LOBBY' | 'GAME' | 'GAME_OVER') {
    if (roomId && view && globalOnNavigate) {
        const viewToRoute: Record<string, string> = {
            'LOBBY': `/lobby/${roomId}`,
            'GAME': `/game/${roomId}`,
            'GAME_OVER': `/results/${roomId}`,
        };
        const targetRoute = viewToRoute[view];
        if (targetRoute) {
            globalOnNavigate(targetRoute);
        }
    }
    // Nota: la navegación a '/' cuando !roomId la maneja leaveGame() explícitamente
    // en useGameActions.ts — no aquí, para no tocar casos donde roomId es null
    // al inicio antes de que el usuario haya hecho cualquier acción.
}

// ─── MODULE-LEVEL SINGLETON INBOUND LISTENER ───────────────────────────────
// El watcher se inicializa UNA SOLA VEZ a nivel de módulo, NO dentro de la
// función exportada. Esto garantiza que no importa cuántas veces se invoque
// useGameSync() (por montaje de componentes, HMR, etc.), el listener de red
// existe exactamente una instancia por toda la vida del módulo.
// ─────────────────────────────────────────────────────────────────────────────

// Lazy refs: se obtienen del singleton de useSocket en el primer import del módulo.
const { lastMessage, socket, disconnectIntentionally } = useSocket();
const { addToast } = useToast();
// State singleton (same ref exported by useGameState module)
const state = useGameState();

// UI and Room language are fully decoupled.
// The UI language obeys the user's LocalStorage/Global Selector,
// while the game engine obeys state.config.lang.

watch(lastMessage, (newMsg) => {
    if (!newMsg) return;

    try {
        const parsed: ServerMessage = JSON.parse(newMsg);

        if (parsed.type === EVENTS.UPDATE_STATE) {
            const newState = parsed.payload;

            // [Bot Fix] filledCount reset removed — the server already resets it
            // in round-manager.ts startRound(). Resetting here was destructive:
            // it wiped bot progress on every reconnection or full-sync mid-round.

            state.gameState.value = newState;

            if (newState.status === 'LOBBY' || newState.status === 'GAME_OVER') {
                state.localImpostorRole.value = null;
            }

            if (state.isStopping.value && state.gameState.value.status !== 'PLAYING') {
                state.setStopping(false);
            }

            // El servidor es autoritativo — sincroniza URL según activeView
            syncRoute(newState.roomId, newState.uiMetadata?.activeView);

        } else if (parsed.type === EVENTS.PATCH_STATE) {
            // Check Delta Sync Sequence
            const { stateVersion, patches } = parsed.payload;

            if (stateVersion === state.gameState.value.stateVersion + 1) {
                // 1. Obtener el estado plano desprovisto de proxies reactivos y clonarlo
                const nextState = JSON.parse(JSON.stringify(toRaw(state.gameState.value))) as RoomState;

                // 2. Aplicar el parche sobre el objeto plano crudo (0 triggers de Vue)
                applyPatch(nextState, patches);
                nextState.stateVersion = stateVersion;

                // 3. Deduplicar jugadores en el objeto plano
                if (nextState.players) {
                    const seen = new Set<string>();
                    nextState.players = nextState.players.filter(p => {
                        if (seen.has(p.id)) return false;
                        seen.add(p.id);
                        return true;
                    });
                }

                // 4. Asignar el nuevo estado de una sola vez, gatillando exactamente 1 ciclo de renderizado
                state.gameState.value = nextState;

                // También sincronizar URL en patches: el servidor puede cambiar
                // activeView via un patch delta (ej. LOBBY→GAME al iniciar partida)
                syncRoute(
                    state.gameState.value.roomId,
                    state.gameState.value.uiMetadata?.activeView
                );
            } else if (stateVersion > state.gameState.value.stateVersion + 1) {
                console.warn(`[Red] Desfase Crítico (Local: ${state.gameState.value.stateVersion} vs Requerido: ${stateVersion}). Solicitando FULL SYNC...`);
                if (socket.value && socket.value.readyState === WebSocket.OPEN) {
                    socket.value.send(JSON.stringify({ type: EVENTS.REQUEST_FULL_SYNC }));
                }
            } else {
                console.debug(`[Red] Ignorando parche obsoleto: ${stateVersion}`);
            }
        } else if (parsed.type === EVENTS.AUTH_GRANTED) {
            // Update Session IDs (persisted automatically by watchers)
            const { userId, sessionToken } = parsed.payload;

            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('tuti-session-token', sessionToken);
                localStorage.setItem('tuti-session-token-expiry', (Date.now() + 7 * 24 * 60 * 60 * 1000).toString());
            }

            if (userId !== state.myUserId.value) {
                console.warn(`[Security] Server assigned new ID: ${userId}`);
                state.myUserId.value = userId;
            }
        } else if (parsed.type === EVENTS.RIVAL_UPDATE) {
            const { playerId, filledCount, lastTypedAt } = parsed.payload;
            const player = state.gameState.value.players.find(p => p.id === playerId);
            if (player) {
                player.filledCount = filledCount;
                if (lastTypedAt) player.lastTypedAt = lastTypedAt;
                // Force Vue reactivity trigger for deep changes (like rival filledCount)
                state.gameState.value = { ...state.gameState.value };
            }
        } else if (parsed.type === EVENTS.PRIVATE_ROLE_ASSIGNMENT) {
            state.localImpostorRole.value = parsed.payload as PrivateRolePayload;
            console.log('[Sprint3.4] Private role received:', state.localImpostorRole.value?.role);
        } else if (parsed.type === EVENTS.SYSTEM_VERSION) {
            const serverVersion = (parsed.payload as any).version;
            if (serverVersion && serverVersion !== APP_VERSION) {
                console.warn(`[VERSION MISMATCH] Client: ${APP_VERSION}, Server: ${serverVersion}`);
                state.isUpdateAvailable.value = true;
            }
        } else if (parsed.type === EVENTS.SERVER_ERROR) {
            console.error('[Server Error]:', (parsed.payload as { message: string }).message);
        } else if (parsed.type === EVENTS.ROOM_DEAD) {
            // [Room TTL — Tier 2] Hard expiry: el servidor purgo la sala.
            // Afecta a usuarios YA conectados que estaban en la pantalla de resultados.
            console.info('[GameSync] ROOM_DEAD recibido — limpiando estado y redirigiendo al Home.');
            disconnectIntentionally();
            addToast(i18n.global.t('system.roomDead'), 'info');
            if (globalOnNavigate) globalOnNavigate('/');
        } else if (parsed.type === EVENTS.CHAT_NEW) {
            const msg = parsed.payload as ChatMessage;
            if (msg.type === 'SYSTEM' && msg.code) {
                const style = msg.code === 'PLAYER_JOINED' ? 'success' : 'info';
                addToast(i18n.global.t(`system.${msg.code}`, msg.args || {}, { locale: state.gameState.value?.config?.lang || 'es' }), style);
            }
        }
        // WORD_REACT is handled by the singleton in useSocket.ts — do NOT handle it here
    } catch (e) {
        console.error('Failed to parse message:', e);
    }
});

export function useGameSync(
    _state: ReturnType<typeof useGameState>,
    onNavigate: (path: string) => void
) {
    const { setRoomId, isConnected, connectToParty } = useSocket();

    if (!globalOnNavigate) {
        globalOnNavigate = onNavigate;
    }

    return {
        socket,
        isConnected,
        setRoomId,
        connectToParty
    };
}
