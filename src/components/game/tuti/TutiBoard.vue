<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue';
import { RoomState, Player } from '../../../../shared/types';
import { useSmartReview } from '../../../composables/useSmartReview';
import { calcGracePeriod } from '../../../../shared/engines/tuti-engine';

import RoundStatusHeader from './RoundStatusHeader.vue';
import RivalsHeader from './RivalsHeader.vue';
import ActiveRound from './ActiveRound.vue';
import ReviewPhase from './ReviewPhase.vue';
import ResultsRanking from './ResultsRanking.vue';
import GameFooter from './GameFooter.vue';
import ChatWidget from '../../chat/ChatWidget.vue';

// --- CLEAN PROP DRILLING ---
// The Board only receives global context, it calculates everything internal relative to its game phase.
const props = defineProps<{
    gameState: RoomState;
    myUserId: string;
    amIHost: boolean;
    isStopping: boolean;
    timeRemaining: number;
    timerColor: string;
    isSpectator: boolean;
    showStopAlert: boolean;
    stopperPlayer: Player | null;
}>();

const emit = defineEmits<{
    (e: 'exit'): void;
    (e: 'stop', answers: Record<string, string>): void;
    (e: 'confirm-votes'): void;
    (e: 'next-round'): void;
    (e: 'submit-answers', answers: Record<string, string>): void;
    (e: 'toggle-vote', playerId: string, category: string): void;
    (e: 'toast', msg: string, style: 'default' | 'stop-warning', iconId: string): void;
}>();

// Internal Tuti State
const answers = ref<Record<string, string>>({});
const hasConfirmed = ref(false);
const validationCooldown = ref(false);

// [P11] Grace period: tiempo elapsed desde que empezó PLAYING
const _roundStartedAt = ref<number | null>(null);
const elapsedMs = ref(0);
let _graceInterval: ReturnType<typeof setInterval> | null = null;

const startGraceTracking = () => {
    _roundStartedAt.value = Date.now();
    elapsedMs.value = 0;
    if (_graceInterval) clearInterval(_graceInterval);
    _graceInterval = setInterval(() => {
        if (_roundStartedAt.value !== null) {
            elapsedMs.value = Date.now() - _roundStartedAt.value;
        }
    }, 100);
};

onUnmounted(() => { if (_graceInterval) clearInterval(_graceInterval); });

const gracePeriodMs = computed(() => calcGracePeriod(props.gameState.categories.length));
const isGracePeriodActive = computed(() => elapsedMs.value < gracePeriodMs.value);
const graceSecondsLeft = computed(() =>
    Math.max(0, Math.ceil((gracePeriodMs.value - elapsedMs.value) / 1000))
);

const canStopRound = computed(() => {
    return props.gameState.categories.every(cat => {
        const val = answers.value[cat.name];
        return val && val.trim().length > 0;
    });
});

// Smart Review — no longer bound to a single category index
const { getPlayerStatus } = useSmartReview(computed(() => props.gameState), ref(''));
const getReviewItem = (playerId: string, category: string) => getPlayerStatus(playerId, category);

const handleStop = () => {
    if (validationCooldown.value) return;
    // [P11] Candado Anti-Troll: bloquear si aún está en grace period
    if (isGracePeriodActive.value) return;
    if (!canStopRound.value) {
        emit('toast', "⚠️ Completa todas las categorías para parar", 'stop-warning', 'stop-validation'); 
        validationCooldown.value = true;
        setTimeout(() => { validationCooldown.value = false; }, 800);
        return;
    }
    emit('stop', answers.value);
};

const handleConfirmVotes = () => {
    emit('confirm-votes');
    hasConfirmed.value = true;
};

// Auto state transitions resets
// [P11 BUG FIX] immediate:true → arranca el tracking aunque el componente monte con PLAYING ya activo
watch(() => props.gameState.status, (newStatus, oldStatus) => {
    if (newStatus === 'PLAYING') {
        // Sólo resetear respuestas cuando venimos de una fase anterior (no en el mount inicial)
        if (oldStatus !== undefined) {
            answers.value = {};
            hasConfirmed.value = false;
        }
        startGraceTracking();
    } else if (newStatus !== 'ENDING_COUNTDOWN') {
        // Limpiar el interval cuando ya no estamos jugando
        if (_graceInterval) { clearInterval(_graceInterval); _graceInterval = null; }
    }
}, { immediate: true });

const hydrateLocalState = () => {
    if (!props.myUserId) return;
    const myServerAnswers = props.gameState.answers[props.myUserId];
    if (myServerAnswers) answers.value = { ...answers.value, ...myServerAnswers };
};

watch(() => props.gameState.roomId, (newRoomId) => { if (newRoomId) hydrateLocalState(); }, { immediate: true });

// LiveSync answers implicitly by listening to emit bindings in ActiveRound where needed, 
// or simply submitting when asked:
// watch(shouldSubmit...) -> GameView will govern the global "shouldSubmit", we might need an event for this
// We let the proxy handle this natively by exposing a method or just relying on model bindings.
// If GameView detects shouldSubmit, it could trigger a ref method, but for now we emit on change if we want real-time.

// In original: `watch(shouldSubmit, (needsSubmit) => { if (needsSubmit) submitAnswers(answers.value); });`
// Instead of complex ref methods, watch answers and emit submit-answers on debounce or simply export answers.
// To keep it simple, we expose `answers`:
defineExpose({
    getAnswers: () => answers.value
});

const sortedPlayers = computed(() => [...props.gameState.players].sort((a,b) => b.score - a.score));

const getPlayerStatusForRanking = (playerId: string, category: string) => {
    const votes = props.gameState.votes[playerId]?.[category] || [];
    const isRejected = votes.length > (props.gameState.players.length / 2);
    const status = props.gameState.answerStatuses?.[playerId]?.[category];
    return { state: status || (isRejected ? 'REJECTED' : 'UNKNOWN') };
};

const rivalsActivity = computed(() => {
    const totalCategories = props.gameState.categories.length;
    return props.gameState.players
        .filter(p => p.id !== props.myUserId)
        .map(p => {
            const pAnswers = props.gameState.answers[p.id] || {};
            const filledCount = p.filledCount !== undefined 
                ? p.filledCount 
                : Object.values(pAnswers).filter(val => val && val.trim().length > 0).length;
            
            return {
                id: p.id, name: p.name, avatar: p.avatar, filledCount, totalCategories,
                isFinished: filledCount === totalCategories, isActive: filledCount > 0 && filledCount < totalCategories,
                isConnected: p.isConnected
            };
        });
});
</script>

<template>
    <div class="flex flex-col h-full w-full">
        <RoundStatusHeader 
            :round="gameState.roundsPlayed + 1"
            :total-rounds="gameState.config?.classic?.rounds || 5"
            :current-letter="gameState.currentLetter"
            :time-left="timeRemaining"
            :timer-color="timerColor"
            :status="gameState.status"
            @exit="emit('exit')"
        />

        <div class="flex-1 overflow-y-auto w-full scroll-smooth p-2 relative">
            <Transition name="fade" mode="out-in">
                <!-- Grid dinámico: 3 columnas en PLAYING, 2 columnas en las demás fases -->
                <div :key="gameState.status" class="w-full h-full flex flex-col items-center lg:grid lg:gap-8 lg:items-start lg:max-w-[1600px] lg:mx-auto" 
                    :class="gameState.status === 'PLAYING' ? 'lg:grid-cols-[280px_1fr_200px]' : 'lg:grid-cols-[1fr_200px]'"> 
                    
                    <!-- COLUMN 1: RIVALS (SOLO EN PLAYING) -->
                    <div v-if="gameState.status === 'PLAYING'" class="w-full lg:h-full lg:overflow-y-auto order-1 lg:order-1">
                         <RivalsHeader 
                            v-if="rivalsActivity.length > 0 && gameState.status === 'PLAYING'"
                            :rivals="rivalsActivity" 
                        />
                    </div>

                    <!-- COLUMN 2: GAME CENTER -->
                    <div class="w-full flex order-2 lg:order-2 lg:h-full lg:overflow-y-auto h-full"
                         :class="gameState.status === 'PLAYING' ? 'flex-col justify-center items-center' : 'flex-col'"
                    >
                        <ActiveRound 
                            v-if="gameState.status === 'PLAYING'"
                            :categories="gameState.categories"
                            :current-letter="gameState.currentLetter"
                            :rivals-activity="rivalsActivity"
                            v-model="answers"
                            :is-blocked="isStopping"
                        />

                        <ReviewPhase 
                            v-else-if="gameState.status === 'REVIEW'"
                            :categories="gameState.categories"
                            :players="gameState.players"
                            :votes="gameState.votes"
                            :my-user-id="myUserId"
                            :get-review-item="getReviewItem"
                            :show-stop-alert="showStopAlert"
                            :stopper-player="stopperPlayer || undefined"
                            :has-confirmed="hasConfirmed"
                            @vote="(pid: string, cat: string) => emit('toggle-vote', pid, cat)"
                            @submit-votes="handleConfirmVotes"
                            class="my-auto"
                        />
                        
                        <ResultsRanking
                            v-else-if="gameState.status === 'RESULTS'"
                            :players="sortedPlayers"
                            :my-answers="answers"
                            :categories="gameState.categories"
                            :my-user-id="myUserId"
                            :get-player-status="getPlayerStatusForRanking"
                            class="my-auto"
                        />
                    </div>

                    <!-- COLUMN 3: CHAT -->
                    <ChatWidget class="hidden lg:flex order-3 lg:order-3 w-full h-full max-h-[calc(100vh-140px)]" />
                </div>
            </Transition>
        </div>

        <GameFooter 
            :status="gameState.status"
            :am-i-host="amIHost"
            :can-stop="canStopRound"
            :cooldown="validationCooldown"
            :has-confirmed="hasConfirmed"
            :my-progress="{ current: Object.values(answers).filter(v => v?.trim()).length, total: gameState.categories.length }"
            :grace-seconds-left="graceSecondsLeft"
            :is-grace-active="isGracePeriodActive"
            :ending-countdown-by="gameState.endingCountdownBy ?? null"
            @stop="handleStop"
            @confirm-votes="handleConfirmVotes"
            @next-round="emit('next-round')"
            :is-stopping="isStopping"
        />

        <!-- [P11] M3: Viñeteado de Pánico — ENDING_COUNTDOWN overlay -->
        <Teleport to="body">
            <div
                v-if="gameState.status === 'ENDING_COUNTDOWN'"
                class="fixed inset-0 pointer-events-none z-50 animate-pulse shadow-glow-panic"
            />
        </Teleport>
    </div>
</template>
