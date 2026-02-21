<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RoomState, Player } from '../../../../shared/types';
import { useSmartReview } from '../../../composables/useSmartReview';

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
const activeCategoryIndex = ref(0);
const validationCooldown = ref(false);

const canStopRound = computed(() => {
    return props.gameState.categories.every(cat => {
        const val = answers.value[cat];
        return val && val.trim().length > 0;
    });
});

const currentCategory = computed(() => props.gameState.categories[activeCategoryIndex.value] || '');
// We mock a getter since useSmartReview technically accesses the ref'd state directly in GameView. 
// For better refactoring, we proxy the getter:
const { getPlayerStatus } = useSmartReview(computed(() => props.gameState), currentCategory);
const getReviewItem = (playerId: string) => getPlayerStatus(playerId);

const nextCategory = () => { if (activeCategoryIndex.value < props.gameState.categories.length - 1) activeCategoryIndex.value++; };
const prevCategory = () => { if (activeCategoryIndex.value > 0) activeCategoryIndex.value--; };

const handleStop = () => {
    if (validationCooldown.value) return;
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
watch(() => props.gameState.status, (newStatus) => {
    if (newStatus === 'PLAYING') {
        answers.value = {};
        hasConfirmed.value = false;
        activeCategoryIndex.value = 0;
    }
});

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
            @exit="emit('exit')"
        />

        <div class="flex-1 overflow-y-auto w-full scroll-smooth p-4 relative">
            <Transition name="fade" mode="out-in">
                <div :key="gameState.status" class="w-full h-full flex flex-col items-center lg:grid lg:grid-cols-[280px_1fr_200px] lg:gap-8 lg:items-start lg:max-w-[1600px] lg:mx-auto"> 
                    
                    <!-- COLUMN 1: RIVALS -->
                    <div class="w-full lg:h-full lg:overflow-y-auto order-1 lg:order-1">
                         <RivalsHeader 
                            v-if="rivalsActivity.length > 0 && gameState.status === 'PLAYING'"
                            :rivals="rivalsActivity" 
                        />
                    </div>

                    <!-- COLUMN 2: GAME CENTER -->
                    <div class="w-full flex justify-center order-2 lg:order-2 lg:h-full lg:overflow-y-auto">
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
                            :current-category="currentCategory"
                            :players="gameState.players"
                            :votes="gameState.votes"
                            :my-user-id="myUserId"
                            :get-review-item="getReviewItem"
                            :nav-index="activeCategoryIndex"
                            :total-categories="gameState.categories.length"
                            :show-stop-alert="showStopAlert"
                            :stopper-player="stopperPlayer || undefined"
                            @vote="(pid) => emit('toggle-vote', pid, currentCategory)"
                            @prev-cat="prevCategory"
                            @next-cat="nextCategory"
                        />
                        
                        <ResultsRanking
                            v-else-if="gameState.status === 'RESULTS'"
                            :players="sortedPlayers"
                            :my-answers="answers"
                            :categories="gameState.categories"
                            :my-user-id="myUserId"
                            :get-player-status="getPlayerStatusForRanking"
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
            @stop="handleStop"
            @confirm-votes="handleConfirmVotes"
            @next-round="emit('next-round')"
            :is-stopping="isStopping"
        />
    </div>
</template>
