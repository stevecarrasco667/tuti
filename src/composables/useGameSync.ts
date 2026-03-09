import { watch } from 'vue';
import { useSocket } from './useSocket';
import { applyPatch } from 'fast-json-patch';
import { ServerMessage, PrivateRolePayload } from '../../shared/types';
import { EVENTS, APP_VERSION } from '../../shared/consts';
import { useGameState } from './useGameState';

export function useGameSync(
    state: ReturnType<typeof useGameState>
) {
    const { socket, lastMessage, setRoomId, isConnected, connectToParty } = useSocket();

    // Inbound: Receive and Mutate
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
            } else if (parsed.type === EVENTS.PATCH_STATE) {
                // Check Delta Sync Sequence
                const { stateVersion, patches } = parsed.payload;

                if (stateVersion === state.gameState.value.stateVersion + 1) {
                    applyPatch(state.gameState.value, patches);
                    state.gameState.value.stateVersion = stateVersion;
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
            }
        } catch (e) {
            console.error('Failed to parse message:', e);
        }
    });

    return {
        socket,
        isConnected,
        setRoomId,
        connectToParty
    };
}
