import { ref, computed, watch, nextTick, onUnmounted } from 'vue';
import { RoomState } from '../../shared/types';
import { useSound } from './useSound';
import { useReactions } from './useReactions';
import { useToast } from './useToast';

export function useGameEffects(
    gameState: import('vue').Ref<RoomState>,
    _myUserId: import('vue').Ref<string>,
    amIHost: import('vue').Ref<boolean>
) {
    const { playClick, playJoin, playTick, playAlarm, playSuccess, playUrgency } = useSound();
    const { clearReactions } = useReactions();

    // --- TIMERS ---
    const timeRemaining = ref<number | null>(null);
    let timerInterval: NodeJS.Timeout | null = null;

    const updateTimer = () => {
        const now = Date.now();
        const targetTime = gameState.value?.uiMetadata?.targetTime;

        if (gameState.value?.uiMetadata?.showTimer && targetTime) {
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

    // Fix Bug 2: observar uiMetadata.targetTime directamente (valor escalar) en lugar del
    // objeto timers completo con deep:true. Eso evita la race condition donde el watch se
    // disparaba con el targetTime stale de la fase anterior (RESULTS) antes de que el nuevo
    // estado (PLAYING) fuera aplicado en su totalidad.
    // nextTick garantiza que el gameState completo fue asignado antes de leer targetTime.
    watch(
        () => gameState.value?.uiMetadata?.targetTime,
        () => {
            if (timerInterval) clearInterval(timerInterval);

            // Diferir la lectura un tick para que todo el UPDATE_STATE esté aplicado
            nextTick(() => {
                updateTimer();
                if (gameState.value?.uiMetadata?.showTimer) {
                    timerInterval = setInterval(updateTimer, 1000);
                }
            });
        },
        { immediate: true }
    );

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
    // [Sprint H4 — FE-2] Delegated to unified useToast system (was a local sessionToasts ref).
    // App.vue renders all toasts from the global store — no separate in-game renderer needed.
    const { addToast } = useToast();



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
        if (newStatus === 'ENDING_COUNTDOWN') {
            // [P11] M4: Sonido de urgencia al activarse el panic countdown
            playUrgency();
        } else if (newStatus === 'REVIEW' && (oldStatus === 'PLAYING' || oldStatus === 'ENDING_COUNTDOWN')) {
            showStopAlert.value = true;
            playAlarm();
            setTimeout(() => {
                showStopAlert.value = false;
            }, 3000);
        } else if (newStatus === 'RESULTS') {
            playSuccess();
        } else if (['LOADING_ROUND', 'PLAYING', 'ROLE_REVEAL', 'LOBBY'].includes(newStatus)) {
            clearReactions();
        } else if (newStatus !== 'REVIEW') {
            showStopAlert.value = false;
        }
    });

    return {
        timeRemaining,
        timerColor,
        addToast,
        showStopAlert,
        stopperPlayer,
        playClick,
        playAlarm
    };
}
