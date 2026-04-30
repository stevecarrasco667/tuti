
import { useSocket } from './useSocket';
import { useGameState } from './useGameState';
import { debounce } from '../utils/timing';
import { EVENTS } from '../../shared/consts';
import { DeepPartial, GameConfig, createDefaultRoomState } from '../../shared/types';

export function useGameActions(
    state: ReturnType<typeof useGameState>,
    onNavigate: (path: string) => void
) {
    const { socket, setRoomId, disconnectIntentionally } = useSocket();

    const joinGame = async (name: string, targetRoomId: string, avatar: string, isPublic?: boolean) => {
        const userId = state.myUserId.value;
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('tuti-session-token') || undefined : undefined;

        // [Bug Fix] Establecer el socket PRIMERO, navegar DESPUÉS.
        // El patrón anterior navegaba optimísticamente antes de que el socket existiera,
        // causando que el Navigation Guard (router.beforeEach) asumiera un "cold start"
        // y re-conectara SIN el parámetro `public=true`, descartando la sala del Lobby.
        await setRoomId(targetRoomId, { userId, name, avatar, token, public: isPublic ? 'true' : undefined });
        onNavigate(`/lobby/${targetRoomId}`);
    };


    const startGame = () => {
        if (!socket.value) return;
        socket.value.send(JSON.stringify({ type: EVENTS.START_GAME }));
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

    const leaveGame = () => {
        if (socket.value) {
            try {
                socket.value.send(JSON.stringify({ type: EVENTS.EXIT_GAME }));
            } catch (e) { /* ignore */ }

            // [BUG-4 FIX] Dar tiempo al buffer del WebSocket para que envíe el mensaje 
            // antes de destruirlo. Si se cierra inmediatamente, el mensaje puede perderse.
            setTimeout(() => disconnectIntentionally(), 150);
        }

        setRoomId(null);

        // Reset state using factory — avoids stale fields when new RoomState fields are added
        state.gameState.value = createDefaultRoomState(null);
        state.localImpostorRole.value = null;

        // [Sprint 2 - P2] Navegar a HOME usando el router (no window.history)
        // Esto garantiza que la vista cambie inmediatamente sin esperar un mensaje del servidor
        onNavigate('/');
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
        leaveGame,
        sendChatMessage,
        sendReaction,
        updateImpostorDraft,
        debouncedUpdateImpostorDraft,
        confirmImpostorWord
    };
}
