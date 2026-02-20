import { ref, computed, watch, onUnmounted, Ref } from 'vue';
import { RoomState } from '../../shared/types';
import { useSound } from './useSound';

interface Toast {
    id: number;
    text: string;
    type: 'join' | 'leave' | 'stop-warning';
    groupId?: string;
}

export function useGameEffects(
    gameState: Ref<RoomState>,
    myUserId: Ref<string>,
    amIHost: Ref<boolean>
) {
    const { playClick, playJoin, playTick, playAlarm, playSuccess } = useSound();

    // --- TIMERS ---
    const timeRemaining = ref<number | null>(null);
    let timerInterval: NodeJS.Timeout | null = null;

    const updateTimer = () => {
        const now = Date.now();
        const status = gameState.value.status;
        let targetTime: number | null = null;

        // Classic mode timers
        if (status === 'PLAYING' && gameState.value.timers.roundEndsAt) {
            targetTime = gameState.value.timers.roundEndsAt;
        } else if (status === 'REVIEW' && gameState.value.timers.votingEndsAt) {
            targetTime = gameState.value.timers.votingEndsAt;
        } else if (status === 'RESULTS' && gameState.value.timers.resultsEndsAt) {
            targetTime = gameState.value.timers.resultsEndsAt;
            // Impostor mode timers
        } else if (status === 'ROLE_REVEAL' && gameState.value.timers.roundEndsAt) {
            targetTime = gameState.value.timers.roundEndsAt;
        } else if (status === 'TYPING' && gameState.value.timers.roundEndsAt) {
            targetTime = gameState.value.timers.roundEndsAt;
        } else if (status === 'EXPOSITION' && gameState.value.timers.roundEndsAt) {
            targetTime = gameState.value.timers.roundEndsAt;
        } else if (status === 'VOTING' && gameState.value.timers.votingEndsAt) {
            targetTime = gameState.value.timers.votingEndsAt;
        }

        if (targetTime) {
            const remaining = Math.max(0, Math.ceil((targetTime - now) / 1000));
            timeRemaining.value = remaining;

            // Tick Sound
            if (remaining <= 10 && remaining > 0) {
                playTick();
            }
        } else {
            timeRemaining.value = null;
        }
    };

    watch(() => [gameState.value.status, gameState.value.timers], () => {
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        updateTimer();

        const activeTimerStates = ['PLAYING', 'REVIEW', 'RESULTS', 'ROLE_REVEAL', 'TYPING', 'EXPOSITION', 'VOTING'];
        if (activeTimerStates.includes(gameState.value.status)) {
            timerInterval = setInterval(updateTimer, 1000);
        }
    }, { immediate: true, deep: true });

    onUnmounted(() => {
        if (timerInterval) {
            clearInterval(timerInterval);
        }
    });

    const timerColor = computed(() => {
        if (timeRemaining.value === null) return 'text-white/20';
        if (timeRemaining.value <= 10) return 'text-red-500 animate-pulse';
        return 'text-yellow-400';
    });

    // --- TOASTS ---
    const sessionToasts = ref<Toast[]>([]);

    const addToast = (text: string, type: 'join' | 'leave' | 'stop-warning', uniqueGroupId?: string) => {
        if (uniqueGroupId) {
            const existing = sessionToasts.value.find(t => t.groupId === uniqueGroupId);
            if (existing) {
                return;
            }
        }

        const id = Date.now();
        sessionToasts.value.push({ id, text, type, groupId: uniqueGroupId });
        setTimeout(() => {
            sessionToasts.value = sessionToasts.value.filter(t => t.id !== id);
        }, 3000);
    };

    watch(() => gameState.value.players, (newPlayers, oldPlayers) => {
        if (!oldPlayers || oldPlayers.length === 0) return;

        // Detect Joins
        const joined = newPlayers.filter(np => !oldPlayers.some(op => op.id === np.id));

        // Check for status changes in existing players
        newPlayers.forEach(np => {
            const op = oldPlayers.find(p => p.id === np.id);
            if (op && np.id !== myUserId.value) {
                if (np.isConnected && !op.isConnected) {
                    addToast(`${np.avatar || '👤'} ${np.name} volvió.`, 'join');
                } else if (!np.isConnected && op.isConnected) {
                    addToast(`${np.avatar || '👤'} ${np.name} salió.`, 'leave');
                }
            }
        });

        // New players (first join)
        joined.forEach(p => {
            if (p.id !== myUserId.value) {
                addToast(`${p.avatar || '👤'} ${p.name} entró.`, 'join');
            }
        });

    }, { deep: true });

    // Host Notification
    watch(amIHost, (isHost, wasHost) => {
        if (isHost && !wasHost) {
            addToast("👑 ¡Ahora eres el Anfitrión!", 'join');
        }
    });

    // Connection Sounds (Simplified logic from original view)
    watch(() => gameState.value.players.length, (newCount, oldCount) => {
        if (newCount > oldCount && gameState.value.status !== 'LOBBY') {
            playJoin();
        }
    });


    // --- STOP ALERT (Flare) ---
    const showStopAlert = ref(false);
    const stopperPlayer = computed(() => {
        if (!gameState.value.stoppedBy) return null;
        return gameState.value.players.find(p => p.id === gameState.value.stoppedBy);
    });

    watch(() => gameState.value.status, (newStatus, oldStatus) => {
        if (newStatus === 'REVIEW' && oldStatus === 'PLAYING') {
            showStopAlert.value = true;
            playAlarm();
            setTimeout(() => {
                showStopAlert.value = false;
            }, 3000);
        } else if (newStatus === 'RESULTS') {
            playSuccess();
        } else if (newStatus !== 'REVIEW') {
            showStopAlert.value = false;
        }
    });

    return {
        timeRemaining,
        timerColor,
        sessionToasts,
        addToast,
        showStopAlert,
        stopperPlayer,
        playClick, // Exporting simple sound trigger for specific interactions
        playAlarm // Exporting for manual trigger if needed (e.g. invalid stop)
    };
}
