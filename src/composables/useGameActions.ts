import { watch } from 'vue';
import { useSocket } from './useSocket';
import { useGameState } from './useGameState';
import { debounce } from '../utils/timing';
import { EVENTS } from '../../shared/consts';
import { DeepPartial, GameConfig } from '../../shared/types';

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

        // Reset state
        state.gameState.value = {
            stateVersion: 0,
            status: 'LOBBY',
            players: [],
            spectators: [],
            roomId: null,
            currentLetter: null,
            categories: [],
            answers: {},
            answerStatuses: {},
            roundsPlayed: 0,
            votes: {},
            whoFinishedVoting: [],
            roundScores: {},
            config: {
                mode: 'CLASSIC',
                isPublic: false,
                maxPlayers: 8,
                classic: {
                    rounds: 5,
                    timeLimit: 60,
                    votingDuration: 30,
                    categories: [],
                    customCategories: [],
                    mutators: { suicidalStop: false, anonymousVoting: false }
                },
                impostor: { rounds: 3, typingTime: 30, votingTime: 40 }
            },
            timers: { roundEndsAt: null, votingEndsAt: null, resultsEndsAt: null },
            remainingTime: 0,
            stoppedBy: null,
            gameOverReason: undefined,
            uiMetadata: { activeView: 'LOBBY', showTimer: false, targetTime: null }
        };
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
