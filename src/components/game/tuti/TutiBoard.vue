<script setup lang="ts">
import { computed, ref, watch, onUnmounted, onMounted } from 'vue';
import { RoomState, Player } from '../../../../shared/types';
import { useSmartReview } from '../../../composables/useSmartReview';

import RoundStatusHeader from './RoundStatusHeader.vue';
import RivalsHeader from './RivalsHeader.vue';
import ActiveRound from './ActiveRound.vue';
import ReviewPhase from './ReviewPhase.vue';
import ResultsRanking from './ResultsRanking.vue';
import GameFooter from './GameFooter.vue';
import ChatWidget from '../../chat/ChatWidget.vue';
import { useI18n } from 'vue-i18n';
import { useKeyboard } from '../../../composables/useKeyboard';

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

const { t } = useI18n();
const { keyboardHeight } = useKeyboard();

// [Sync] Ticker reactivo de baja frecuencia para evaluar el Grace Period contra el timestamp del servidor.
// _now se actualiza cada 500ms, haciendo que los computed de grace period se re-evalúen automáticamente.
// El timestamp de referencia (graceEndsAt) lo emite el servidor — todos los clientes ven el mismo valor.
const _now = ref(Date.now());
let _graceTicker: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
    _graceTicker = setInterval(() => { _now.value = Date.now(); }, 500);
});

onUnmounted(() => {
    if (_graceTicker) clearInterval(_graceTicker);
});

const isGracePeriodActive = computed(() => {
    const graceEndsAt = props.gameState.timers.graceEndsAt;
    if (!graceEndsAt) return false;
    return _now.value < graceEndsAt;
});

const graceSecondsLeft = computed(() => {
    const graceEndsAt = props.gameState.timers.graceEndsAt;
    if (!graceEndsAt) return 0;
    return Math.max(0, Math.ceil((graceEndsAt - _now.value) / 1000));
});

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
        emit('toast', t('gameHUD.completeToStop'), 'stop-warning', 'stop-validation'); 
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
        // [Sync] Grace period ya no necesita startGraceTracking() — lo controla el servidor vía graceEndsAt
    } else if (newStatus === 'RESULTS') {
        hasConfirmed.value = false;
    } else if (newStatus !== 'ENDING_COUNTDOWN') {
        // Nada que limpiar localmente — el servidor pone graceEndsAt = null al pasar a ENDING_COUNTDOWN
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
            
            // [GD-2] AFK Indicator: No interactions in last 15 seconds
            const isAFK = Boolean(
                props.gameState.status === 'PLAYING' &&
                p.lastTypedAt &&
                (_now.value - p.lastTypedAt > 15000) &&
                filledCount < totalCategories
            );

            return {
                id: p.id, name: p.name, avatar: p.avatar, filledCount, totalCategories,
                isFinished: filledCount === totalCategories, isActive: filledCount > 0 && filledCount < totalCategories,
                isConnected: p.isConnected,
                isAFK
            };
        });
});

const currentBoardView = computed(() => {
    if (['PLAYING', 'ENDING_COUNTDOWN'].includes(props.gameState.status)) {
        return 'PLAYING';
    }
    return props.gameState.status;
});
</script>
<template>
    <div class="flex flex-col w-full h-full">
        <RoundStatusHeader 
            :round="gameState.roundsPlayed + 1"
            :total-rounds="gameState.config?.classic?.rounds || 5"
            :current-letter="gameState.currentLetter"
            :time-left="timeRemaining"
            :timer-color="timerColor"
            :status="gameState.status"
            :is-last-round="gameState.isLastRound"
            @exit="emit('exit')"
        />

        <div :class="[
            'flex-1 w-full scroll-smooth p-2 relative',
            ['REVIEW', 'RESULTS'].includes(gameState.status) ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'
        ]" :style="{ paddingBottom: keyboardHeight + 'px' }">
            <Transition name="fade" mode="out-in">
                    <!-- Grid dinámico: 3 columnas en PLAYING, 2 columnas en las demás fases -->
                    <div :key="currentBoardView" class="w-full flex flex-col items-center lg:grid lg:gap-8 lg:max-w-[1600px] lg:mx-auto" 
                        :class="[
                            ['PLAYING', 'ENDING_COUNTDOWN'].includes(gameState.status) ? 'lg:grid-cols-[220px_1fr_200px] min-h-full' : 'lg:grid-cols-[1fr_200px] h-full min-h-0 flex-1 lg:items-stretch'
                        ]"> 
                    
                    <!-- COLUMN 1: RIVALS (SOLO EN PLAYING / ENDING_COUNTDOWN) -->
                    <div v-if="gameState.status === 'PLAYING' || gameState.status === 'ENDING_COUNTDOWN'" class="w-full lg:h-full lg:overflow-y-auto order-1 lg:order-1">
                         <RivalsHeader 
                            v-if="rivalsActivity.length > 0 && (gameState.status === 'PLAYING' || gameState.status === 'ENDING_COUNTDOWN')"
                            :rivals="rivalsActivity" 
                        />
                    </div>

                    <!-- COLUMN 2: GAME CENTER -->
                    <div class="w-full flex order-2 lg:order-2"
                         :class="[
                             ['REVIEW', 'RESULTS'].includes(gameState.status) ? 'h-full min-h-0 overflow-hidden flex-col' : 'min-h-full lg:h-full lg:overflow-y-auto flex-col',
                             ['PLAYING', 'ENDING_COUNTDOWN'].includes(gameState.status) ? 'items-center' : ''
                         ]"
                    >
                        <ActiveRound 
                            v-if="gameState.status === 'PLAYING' || gameState.status === 'ENDING_COUNTDOWN'"
                            :categories="gameState.categories"
                            :current-letter="gameState.currentLetter"
                            :rivals-activity="rivalsActivity"
                            v-model="answers"
                            :is-blocked="isStopping"
                            :is-spectator="isSpectator"
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
                            :is-spectator="isSpectator"
                            :ready-count="gameState.whoFinishedVoting?.length || 0"
                            :total-count="gameState.players?.filter(p => p.isConnected && !p.isBot).length || 0"
                            @vote="(pid: string, cat: string) => emit('toggle-vote', pid, cat)"
                            @submit-votes="handleConfirmVotes"
                            class="h-full min-h-0 w-full flex flex-col"
                        />
                        
                        <ResultsRanking
                            v-else-if="gameState.status === 'RESULTS'"
                            :players="sortedPlayers"
                            :my-answers="answers"
                            :categories="gameState.categories"
                            :my-user-id="myUserId"
                            :get-player-status="getPlayerStatusForRanking"
                            :answer-statuses="gameState.answerStatuses"
                            :is-last-round="gameState.isLastRound"
                            class="my-auto"
                        />
                    </div>

                    <!-- COLUMN 3: CHAT -->
                    <ChatWidget class="hidden lg:flex order-3 lg:order-3 w-full h-full max-h-[calc(100dvh-140px)]" />
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
            :is-stopping="isStopping"
            :is-spectator="isSpectator"
            :active-players-count="gameState.players?.filter(p => p.isConnected).length || 0"
            @stop="handleStop"
            @confirm-votes="handleConfirmVotes"
            @next-round="emit('next-round')"
        />

        <!-- [P11] M3: Viñeteado de Pánico — ENDING_COUNTDOWN overlay -->
        <!-- [GD-2] También se muestra en los últimos 5 segundos de la ronda normal -->
        <Teleport to="body">
            <div
                v-if="gameState.status === 'ENDING_COUNTDOWN' || (gameState.status === 'PLAYING' && timeRemaining <= 5 && timeRemaining > 0)"
                class="fixed inset-0 pointer-events-none z-modal animate-pulse shadow-glow-panic transition-opacity duration-300"
            />
        </Teleport>
    </div>
</template>
