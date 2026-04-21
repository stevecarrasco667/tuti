import { watch } from 'vue';
import { useSocket } from './useSocket';
import { applyPatch } from 'fast-json-patch';
import { ServerMessage, PrivateRolePayload } from '../../shared/types';
import { useGameState } from './useGameState';
import { EVENTS, APP_VERSION } from '../../shared/consts';
import { useToast } from './useToast';

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

watch(lastMessage, (newMsg) => {
    if (!newMsg) return;

    try {
        const parsed: ServerMessage = JSON.parse(newMsg);

        if (parsed.type === EVENTS.UPDATE_STATE) {
            const newState = parsed.payload;

            // Fix: Reset filledCount to 0 initially during round transitions
            if (newState.status === 'PLAYING' && newState.players) {
                newState.players.forEach((p: any) => { p.filledCount = 0; });
            }

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
                applyPatch(state.gameState.value, patches);
                state.gameState.value.stateVersion = stateVersion;

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

            // Deduplicate players after patch
            if (state.gameState.value.players) {
                const seen = new Set<string>();
                state.gameState.value.players = state.gameState.value.players.filter(p => {
                    if (seen.has(p.id)) return false;
                    seen.add(p.id);
                    return true;
                });
            }
        } else if (parsed.type === EVENTS.AUTH_GRANTED) {
            // Update Session IDs (persisted automatically by watchers)
            const { userId, sessionToken } = parsed.payload;

            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('tuti-session-token', sessionToken);
            }

            if (userId !== state.myUserId.value) {
                console.warn(`[Security] Server assigned new ID: ${userId}`);
                state.myUserId.value = userId;
            }
        } else if (parsed.type === EVENTS.RIVAL_UPDATE) {
            const { playerId, filledCount } = parsed.payload;
            const player = state.gameState.value.players.find(p => p.id === playerId);
            if (player) {
                player.filledCount = filledCount;
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
        } else if (parsed.type === EVENTS.PLAYER_JOINED) {
            // [Sprint 3 - P2] Disparador imperativo — desde evento discreto del WebSocket,
            // NO desde array-diffing de Vue (evita race conditions con proxies mutados).
            const name = (parsed.payload as { name: string }).name;
            addToast(`👥 ${name} se unió a la sala`, 'success');
        } else if (parsed.type === EVENTS.PLAYER_LEFT) {
            const name = (parsed.payload as { name: string }).name;
            addToast(`🚪 ${name} abandonó la sala`, 'info');
        } else if (parsed.type === EVENTS.ROOM_DEAD) {
            // [Room TTL — Tier 2] Hard expiry: el servidor purgo la sala.
            // Afecta a usuarios YA conectados que estaban en la pantalla de resultados.
            console.info('[GameSync] ROOM_DEAD recibido — limpiando estado y redirigiendo al Home.');
            disconnectIntentionally();
            addToast('👋 Esta sala fue eliminada por inactividad. ¡Hasta la próxima!', 'info');
            if (globalOnNavigate) globalOnNavigate('/');
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
