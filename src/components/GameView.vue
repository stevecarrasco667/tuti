<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useGame } from '../composables/useGame';
import { useSmartReview } from '../composables/useSmartReview';
import { useGameEffects } from '../composables/useGameEffects';
import ConnectionBanner from './ConnectionBanner.vue';

import GameHUD from './game/GameHUD.vue';
import RivalsHeader from './game/RivalsHeader.vue';
import ActiveRound from './game/ActiveRound.vue';
import ReviewPhase from './game/ReviewPhase.vue';
import ResultsRanking from './game/ResultsRanking.vue';
import GameFooter from './game/GameFooter.vue';

const { gameState, stopRound, submitAnswers, shouldSubmit, toggleVote, confirmVotes, myUserId, amIHost, startGame, leaveGame, isConnected, isStopping } = useGame();

const { 
    timeRemaining, timerColor, sessionToasts, addToast, showStopAlert, stopperPlayer, playClick, playAlarm
} = useGameEffects(gameState, myUserId, amIHost);

const answers = ref<Record<string, string>>({});
const hasConfirmed = ref(false);

const canStopRound = computed(() => {
    return gameState.value.categories.every(cat => {
        const val = answers.value[cat];
        return val && val.trim().length > 0;
    });
});

const validationCooldown = ref(false);

const handleStop = () => {
    if (validationCooldown.value) return;
    if (!canStopRound.value) {
        addToast("⚠️ Completa todas las categorías para parar", 'stop-warning', 'stop-validation'); 
        validationCooldown.value = true;
        setTimeout(() => { validationCooldown.value = false; }, 800);
        return;
    }
    stopRound(answers.value);
    playAlarm();
};

const activeCategoryIndex = ref(0);
const currentCategory = computed(() => gameState.value.categories[activeCategoryIndex.value] || '');
const { getPlayerStatus } = useSmartReview(gameState, currentCategory);
const getReviewItem = (playerId: string) => getPlayerStatus(playerId);

const nextCategory = () => { if (activeCategoryIndex.value < gameState.value.categories.length - 1) activeCategoryIndex.value++; };
const prevCategory = () => { if (activeCategoryIndex.value > 0) activeCategoryIndex.value--; };

const handleConfirmVotes = () => {
    confirmVotes();
    hasConfirmed.value = true;
    playClick();
};

watch(shouldSubmit, (needsSubmit) => { if (needsSubmit) submitAnswers(answers.value); });

watch(() => gameState.value.status, (newStatus) => {
    if (newStatus === 'PLAYING') {
        answers.value = {};
        hasConfirmed.value = false;
        activeCategoryIndex.value = 0;
    }
});

const hydrateLocalState = () => {
    if (!myUserId.value) return;
    const myServerAnswers = gameState.value.answers[myUserId.value];
    if (myServerAnswers) answers.value = { ...answers.value, ...myServerAnswers };
};

watch(() => gameState.value.roomId, (newRoomId) => { if (newRoomId) hydrateLocalState(); }, { immediate: true });

const showExitModal = ref(false);
const handleExit = () => { leaveGame(); showExitModal.value = false; };

const sortedPlayers = computed(() => [...gameState.value.players].sort((a,b) => b.score - a.score));

const getPlayerStatusForRanking = (playerId: string, category: string) => {
    const votes = gameState.value.votes[playerId]?.[category] || [];
    const isRejected = votes.length > (gameState.value.players.length / 2);
    const status = gameState.value.answerStatuses?.[playerId]?.[category];
    return { state: status || (isRejected ? 'REJECTED' : 'UNKNOWN') };
};

const rivalsActivity = computed(() => {
    const totalCategories = gameState.value.categories.length;
    return gameState.value.players
        .filter(p => p.id !== myUserId.value) // Show everyone, even disconnected
        .map(p => {
            const pAnswers = gameState.value.answers[p.id] || {};
            // [SILENT UPDATE] Use specific field if available (O(1)), fallback to calculation (O(K))
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
    <div class="h-[100dvh] w-full flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900 via-indigo-950 to-black text-slate-100 overflow-hidden font-sans">
        
        <ConnectionBanner :is-connected="!!isConnected" />

        <GameHUD 
            :round="gameState.roundsPlayed + 1"
            :total-rounds="gameState.config?.totalRounds || 5"
            :current-letter="gameState.currentLetter"
            :time-left="timeRemaining"
            :timer-color="timerColor"
            @exit="showExitModal = true"
        />

        <div class="flex-1 overflow-y-auto flex flex-col items-center justify-start p-4 relative w-full scroll-smooth">
            
            <Transition name="fade" mode="out-in">
                <component :is="'div'" class="w-full flex flex-col items-center"> <!-- Wrapper for transition -->
                    <!-- ORCHESTRATOR: RIVALS HEADER -->
                    <RivalsHeader 
                        v-if="rivalsActivity.length > 0 && gameState.status === 'PLAYING'"
                        :rivals="rivalsActivity" 
                    />

                    <!-- ORCHESTRATOR: ACTIVE ROUND -->
                    <ActiveRound 
                        v-if="gameState.status === 'PLAYING'"
                        :categories="gameState.categories"
                        :current-letter="gameState.currentLetter"
                        :rivals-activity="rivalsActivity"
                        v-model="answers"
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
                        @vote="(pid) => toggleVote(pid, currentCategory)"
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
                </component>
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
            @next-round="startGame"
            :is-stopping="isStopping"
        />

        <div class="fixed top-20 right-4 z-[60] flex flex-col items-end gap-2 pointer-events-none">
            <TransitionGroup name="toast">
                <div v-for="toast in sessionToasts" :key="toast.id" class="px-4 py-3 rounded-xl backdrop-blur-md border text-sm font-bold shadow-xl pointer-events-auto" :class="toast.type === 'stop-warning' ? 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30' : 'bg-slate-900/80 text-white border-white/10'">{{ toast.text }}</div>
            </TransitionGroup>
        </div>
        <div v-if="showExitModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
             <div class="bg-indigo-950 border border-white/10 rounded-3xl p-6 shadow-2xl max-w-xs w-full text-center">
                 <h3 class="text-white font-black text-xl mb-6">¿Salir de la partida?</h3>
                 <div class="flex gap-4">
                     <button @click="showExitModal = false" class="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-colors">Cancelar</button>
                     <button @click="handleExit" class="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 shadow-lg transition-colors">Salir</button>
                 </div>
             </div>
        </div>
    </div>
</template>

<style>
/* Global Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
