<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useGame } from '../composables/useGame';
import { useSmartReview } from '../composables/useSmartReview';
import { useGameEffects } from '../composables/useGameEffects';

import GameHUD from './game/GameHUD.vue';
import ActiveBoard from './game/ActiveBoard.vue';
import ReviewPhase from './game/ReviewPhase.vue';
import ResultsRanking from './game/ResultsRanking.vue';
import GameFooter from './game/GameFooter.vue';

const { gameState, stopRound, submitAnswers, debouncedUpdateAnswers, shouldSubmit, toggleVote, confirmVotes, myUserId, amIHost, startGame, leaveGame } = useGame();

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

const handleInput = (category: string, event: Event) => {
    const input = event.target as HTMLInputElement;
    let val = input.value;
    if (gameState.value.currentLetter && val.length > 0) {
        const firstChar = val.charAt(0).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const targetChar = gameState.value.currentLetter.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (firstChar !== targetChar) {
            val = ""; input.value = "";
            input.classList.add('bg-red-500/20', 'animate-pulse');
            setTimeout(() => input.classList.remove('bg-red-500/20', 'animate-pulse'), 500);
        }
    }
    answers.value[category] = val;
    debouncedUpdateAnswers(answers.value);
};

const hydrateLocalState = () => {
    if (!myUserId.value) return;
    const myServerAnswers = gameState.value.answers[myUserId.value];
    if (myServerAnswers) answers.value = { ...answers.value, ...myServerAnswers };
};

watch(() => gameState.value.roomId, (newRoomId) => { if (newRoomId) hydrateLocalState(); }, { immediate: true });

const showExitModal = ref(false);
const handleExit = () => { leaveGame(); showExitModal.value = false; };

const handleInputFocus = (event: Event) => {
    const target = event.target as HTMLElement;
    setTimeout(() => { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
};

// LÓGICA ELIMINADA: boardConfig ya no existe.

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
        .filter(p => p.id !== myUserId.value && p.isConnected)
        .map(p => {
            const pAnswers = gameState.value.answers[p.id] || {};
            const filledCount = Object.values(pAnswers).filter(val => val && val.trim().length > 0).length;
            return {
                id: p.id, name: p.name, avatar: p.avatar, filledCount, totalCategories,
                isFinished: filledCount === totalCategories, isActive: filledCount > 0 && filledCount < totalCategories
            };
        });
});
</script>

<template>
    <div class="h-[100dvh] w-full flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900 via-indigo-950 to-black text-slate-100 overflow-hidden font-sans">
         <div v-if="!gameState.players.find(p => p.id === myUserId)?.isConnected" class="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse pointer-events-none">
            ⚠️ Conexión Perdida
        </div>

        <GameHUD 
            :round="gameState.roundsPlayed + 1"
            :total-rounds="gameState.config?.totalRounds || 5"
            :current-letter="gameState.currentLetter"
            :time-left="timeRemaining"
            :timer-color="timerColor"
            @exit="showExitModal = true"
        />

        <div class="flex-1 overflow-y-auto flex flex-col items-center justify-start p-4 relative w-full scroll-smooth">
            
            <!-- RIVALS HEADER (Medal Row) -->
            <div v-if="rivalsActivity.length > 0 && gameState.status === 'PLAYING'" class="flex flex-wrap items-center justify-center gap-6 mb-6 w-full max-w-6xl mx-auto z-10">
                <div v-for="rival in rivalsActivity" :key="rival.id" 
                     class="flex flex-col items-center gap-1 group"
                >
                    <!-- Avatar -->
                    <div class="relative transition-transform group-hover:scale-110">
                         <div class="w-16 h-16 rounded-full bg-gradient-to-b from-indigo-500 to-indigo-700 border-2 border-white/20 flex items-center justify-center text-3xl shadow-xl relative z-10">
                            {{ rival.avatar || '👤' }}
                        </div>
                        <!-- Status Ring (Optional visual flare) -->
                         <div v-if="rival.isActive" class="absolute inset-0 rounded-full border-2 border-yellow-400/50 animate-pulse"></div>
                    </div>
                    
                    <!-- Progress Badge -->
                    <div class="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs font-mono font-bold text-white shadow-lg flex items-center gap-1">
                        <span :class="rival.isFinished ? 'text-green-400' : 'text-yellow-400'">{{ rival.filledCount }}</span>
                        <span class="text-white/40">/</span>
                        <span class="text-white/60">{{ rival.totalCategories }}</span>
                    </div>
                </div>
            </div>
            <ActiveBoard 
                v-if="gameState.status === 'PLAYING'"
                :categories="gameState.categories"
                :model-value="answers"
                :current-letter="gameState.currentLetter"
                :rivals-activity="rivalsActivity"
                @update:model-value="(val) => answers = val"
                @input-focus="handleInputFocus"
                @input-change="handleInput"
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
