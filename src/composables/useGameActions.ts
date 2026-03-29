import { watch } from 'vue';
import { useSocket } from './useSocket';
import { useGameState } from './useGameState';
import { debounce } from '../utils/timing';
import { EVENTS } from '../../shared/consts';
import { DeepPartial, GameConfig, createDefaultRoomState } from '../../shared/types';

export function useGameActions(
    state: ReturnType<typeof useGameState>
) {
    const { socket, setRoomId, isConnected, disconnectIntentionally } = useSocket();

    const joinGame = async (name: string, targetRoomId: string, avatar: string, isPublic?: boolean) => {
        const userId = state.myUserId.value;
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('tuti-session-token') || undefined : undefined;

        setRoomId(targetRoomId, { userId, name, avatar, token, public: isPublic ? 'true' : undefined });

        // Update URL for deep linking
        const url = new URL(window.location.href);
        url.searchParams.set('room', targetRoomId);
        window.history.pushState({}, '', url);

        // Simple polling to wait for connection
        const waitForConnection = () => {
            return new Promise<void>((resolve) => {
                if (isConnected.value) {
                    resolve();
                    return;
                }
                const unwatch = watch(isConnected, (connected) => {
                    if (connected) {
                        unwatch();
                        resolve();
                    }
                });
            });
        };

        await waitForConnection();
    };

    const startGame = async () => {
        if (!socket.value) {
            console.warn('[startGame] socket es null — abortando.');
            return;
        }

        // WS_OPEN = 1 (WebSocket.OPEN). Usamos el literal para compatibilidad con Node/Vitest.
        const WS_OPEN = 1;

        // Envío inmediato si el socket ya está OPEN
        if (socket.value.readyState === WS_OPEN) {
            socket.value.send(JSON.stringify({ type: EVENTS.START_GAME }));
            return;
        }

        // Cold-start de PartyKit: esperar hasta 3 s a que la conexión abra
        console.warn(`[startGame] readyState=${socket.value.readyState}. Esperando conexión...`);
        const MAX_WAIT_MS = 3000;
        const startTs = Date.now();

        await new Promise<void>((resolve) => {
            const check = () => {
                if (!socket.value) { resolve(); return; }
                if (socket.value.readyState === WS_OPEN) {
                    socket.value.send(JSON.stringify({ type: EVENTS.START_GAME }));
                    resolve();
                    return;
                }
                if (Date.now() - startTs > MAX_WAIT_MS) {
                    console.error('[startGame] Timeout: socket no abrió en 3 s.');
                    resolve();
                    return;
                }
                setTimeout(check, 200);
            };
            check();
        });
    };


    const submitAnswers = (answers: Record<string, string>) => {
        if (!socket.value) return;
        socket.value.send(JSON.stringify({
            type: EVENTS.SUBMIT_ANSWERS,
            payload: { answers }
        }));
    };

    const stopRound = (answers: Record<string, string>) => {
        if (!socket.value) return;
        state.setStopping(true); // Optimistic Lock
        socket.value.send(JSON.stringify({
            type: EVENTS.STOP_ROUND,
            payload: { answers }
        }));

        // Safety timeout
        setTimeout(() => { state.setStopping(false); }, 3000);
    };

    const updateAnswers = (answers: Record<string, string>) => {
        if (!socket.value) return;
        socket.value.send(JSON.stringify({
            type: EVENTS.UPDATE_ANSWERS,
            payload: { answers }
        }));
    };

    // Continuous Sync (Debounced)
    const debouncedUpdateAnswers = debounce(updateAnswers, 500);

    const shouldSubmit = () => state.gameState.value.status === 'REVIEW';

    const toggleVote = (targetUserId: string, category: string) => {
        if (!socket.value) return;
        socket.value.send(JSON.stringify({
            type: EVENTS.TOGGLE_VOTE,
            payload: { targetUserId, category }
        }));
    };

    const confirmVotes = () => {
        if (!socket.value) return;
        socket.value.send(JSON.stringify({
            type: EVENTS.CONFIRM_VOTES
        }));
    };

    const updateConfig = (config: DeepPartial<GameConfig>) => {
        if (!socket.value) return;
        socket.value.send(JSON.stringify({
            type: EVENTS.UPDATE_CONFIG,
            payload: config
        }));
    };

    const resetGame = () => {
        if (!socket.value) return;
        socket.value.send(JSON.stringify({
            type: EVENTS.RESTART_GAME
        }));
    };

    const kickPlayer = (targetUserId: string) => {
        if (!socket.value) return;
        socket.value.send(JSON.stringify({
            type: EVENTS.KICK_PLAYER,
            payload: { targetUserId }
        }));
    };

    const forceDictionaryReload = () => {
        socket.value?.send(JSON.stringify({ type: EVENTS.ADMIN_RELOAD_DICTS, userId: state.myUserId.value }));
    };

    const leaveGame = () => {
        if (socket.value) {
            try {
                socket.value.send(JSON.stringify({ type: EVENTS.EXIT_GAME }));
            } catch (e) { /* ignore */ }

            disconnectIntentionally();
        }

        setRoomId(null);

        // Reset state using factory — avoids stale fields when new RoomState fields are added
        state.gameState.value = createDefaultRoomState(null);
        state.localImpostorRole.value = null;
    };

    const sendChatMessage = (text: string) => {
        if (!socket.value) return;
        socket.value.send(JSON.stringify({
            type: EVENTS.CHAT_SEND,
            payload: { text }
        }));
    };

    const sendReaction = (targetPlayerId: string, categoryId: string, emoji: string) => {
        if (!socket.value) return;
        socket.value.send(JSON.stringify({
            type: EVENTS.WORD_REACT,
            payload: { targetPlayerId, categoryId, emoji, senderId: state.myUserId.value }
        }));
    };

    // [P12] Live Drafts autoguardado vía socket
    const updateImpostorDraft = (word: string) => {
        if (!socket.value) return;
        socket.value.send(JSON.stringify({
            type: EVENTS.UPDATE_IMPOSTOR_DRAFT,
            payload: { word }
        }));
    };

    const debouncedUpdateImpostorDraft = debounce(updateImpostorDraft, 500);

    // [P12] Confirmación explícita (el botón 'Listo')
    const confirmImpostorWord = () => {
        if (!socket.value) return;
        socket.value.send(JSON.stringify({
            type: EVENTS.CONFIRM_IMPOSTOR_WORD
        }));
    };

    return {
        joinGame,
        startGame,
        submitAnswers,
        stopRound,
        updateAnswers,
        debouncedUpdateAnswers,
        shouldSubmit,
        toggleVote,
        confirmVotes,
        updateConfig,
        resetGame,
        kickPlayer,
        forceDictionaryReload,
        leaveGame,
        sendChatMessage,
        sendReaction,
        updateImpostorDraft,
        debouncedUpdateImpostorDraft,
        confirmImpostorWord
    };
}
