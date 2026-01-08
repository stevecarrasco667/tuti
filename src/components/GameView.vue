<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useGame } from '../composables/useGame';
import { useSmartReview } from '../composables/useSmartReview';
import { useGameEffects } from '../composables/useGameEffects';

// Child Components
import GameHUD from './game/GameHUD.vue';
import ActiveBoard from './game/ActiveBoard.vue';
import ReviewPhase from './game/ReviewPhase.vue';
import ResultsRanking from './game/ResultsRanking.vue';
import GameFooter from './game/GameFooter.vue';

const { gameState, stopRound, submitAnswers, debouncedUpdateAnswers, shouldSubmit, toggleVote, confirmVotes, myUserId, amIHost, startGame, leaveGame } = useGame();

// Initialize Effects (Timers, Sounds, Toasts)
const { 
    timeRemaining, 
    timerColor, 
    sessionToasts, 
    addToast, 
    showStopAlert, 
    stopperPlayer,
    playClick,
    playAlarm
} = useGameEffects(gameState, myUserId, amIHost);

const answers = ref<Record<string, string>>({});
const hasConfirmed = ref(false);

// Anti-Troll Logic
const canStopRound = computed(() => {
    // Must have a non-empty answer for EVERY category in the current list
    return gameState.value.categories.every(cat => {
        const val = answers.value[cat];
        return val && val.trim().length > 0;
    });
});


const validationCooldown = ref(false);

const handleStop = () => {
    if (validationCooldown.value) return; // Throttle spam

    if (!canStopRound.value) {
        // Validation Failed: Show subtle feedback
        addToast("⚠️ Completa todas las categorías para parar", 'stop-warning', 'stop-validation'); 
        
        // Activate cooldown
        validationCooldown.value = true;
        setTimeout(() => {
            validationCooldown.value = false;
        }, 800); // 800ms throttle for interactions

        // Play error/blocked sound if available (optional)
        return;
    }
    stopRound(answers.value);
    playAlarm();
};

// Carousel Logic for Review Phase
const activeCategoryIndex = ref(0);
const currentCategory = computed(() => {
    return gameState.value.categories[activeCategoryIndex.value] || '';
});

const { getPlayerStatus } = useSmartReview(gameState, currentCategory);

// Helper for UI
const getReviewItem = (playerId: string) => getPlayerStatus(playerId);

const nextCategory = () => {
    if (activeCategoryIndex.value < gameState.value.categories.length - 1) {
        activeCategoryIndex.value++;
    }
};

const prevCategory = () => {
    if (activeCategoryIndex.value > 0) {
        activeCategoryIndex.value--;
    }
};

const handleConfirmVotes = () => {
    confirmVotes();
    hasConfirmed.value = true;
    playClick();
};

// Check if we need to auto-submit answers (transition from PLAYING to REVIEW by someone else)
watch(shouldSubmit, (needsSubmit) => {
    if (needsSubmit) {
        submitAnswers(answers.value);
    }
});

// Reset local state on new round
watch(() => gameState.value.status, (newStatus) => {
    if (newStatus === 'PLAYING') {
        answers.value = {};
        hasConfirmed.value = false;
        // Reset review index
        activeCategoryIndex.value = 0;
    }
});

const handleInput = (category: string, event: Event) => {
    const input = event.target as HTMLInputElement;
    let val = input.value;

    // Strict Blocking: enforce start char
    if (gameState.value.currentLetter && val.length > 0) {
        const firstChar = val.charAt(0).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const targetChar = gameState.value.currentLetter.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (firstChar !== targetChar) {
            // Block input
            val = ""; 
            input.value = ""; // Force clear UI
            // Visual feedback
            input.classList.add('bg-red-500/20', 'animate-pulse');
            setTimeout(() => input.classList.remove('bg-red-500/20', 'animate-pulse'), 500);
        }
    }

    answers.value[category] = val;
    
    // Auto-save to server (Debounced)
    debouncedUpdateAnswers(answers.value);
};

// --- Hydration ---
const hydrateLocalState = () => {
    if (!myUserId.value) return;
    const myServerAnswers = gameState.value.answers[myUserId.value];
    if (myServerAnswers) {
        console.log('💧 Hydrating local state with server answers');
        // Merge with existing to avoid overwriting current typing if any
        answers.value = { ...answers.value, ...myServerAnswers };
    }
};

watch(() => gameState.value.roomId, (newRoomId) => {
    if (newRoomId) {
        hydrateLocalState();
    }
}, { immediate: true });

// --- Navigation & Modal ---
const showExitModal = ref(false);

const handleExit = () => {
    leaveGame();
    showExitModal.value = false;
};

// Mobile Keyboard Fix
const handleInputFocus = (event: Event) => {
    const target = event.target as HTMLElement;
    setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
};

// --- SMART BOARD ENGINE (Responsive Logic) ---
const boardConfig = computed(() => {
    const count = gameState.value.categories.length;
    if (count <= 5) {
        return {
            containerMaxWidth: "max-w-md",
            gridCols: "grid-cols-1",
            inputSize: "py-3 px-3 text-2xl h-14",
            labelSize: "text-sm"
        };
    } else {
        return {
            containerMaxWidth: "max-w-4xl",
            gridCols: "grid-cols-2",
            inputSize: "py-2 px-3 text-lg h-12",
            labelSize: "text-xs"
        };
    }
});

// Sorted players for Ranking
const sortedPlayers = computed(() => {
    return [...gameState.value.players].sort((a,b) => b.score - a.score);
});

// Helper for Ranking
const getPlayerStatusForRanking = (playerId: string, category: string) => {
    // We can reuse the smart review helper but check category
    // Actually we need a simple stat check.
    // The smart helper is `getPlayerStatus(playerId)` for `currentCategory`.
    // We can adapt it or just read raw.
    // Raw is faster here:
    const votes = gameState.value.votes[playerId]?.[category] || [];
    const isRejected = votes.length > (gameState.value.players.length / 2); // Simple consensus
    // Actually duplication check is complex, let's just check 'state' from engine if available? 
    // Engine computes results at RESULTS phase.
    // GameEngine `roundScores` doesn't give per-answer status.
    // But `answerStatuses` MIGHT be in state?
    // Looking at Types... RoomState has `answerStatuses`.
    const status = gameState.value.answerStatuses?.[playerId]?.[category];
    return { state: status || (isRejected ? 'REJECTED' : 'UNKNOWN') };
};

const rivalsActivity = computed(() => {
    const totalCategories = gameState.value.categories.length;
    
    return gameState.value.players
        .filter(p => p.id !== myUserId.value && p.isConnected)
        .map(p => {
            const pAnswers = gameState.value.answers[p.id] || {};
            // Count non-empty answers
            const filledCount = Object.values(pAnswers).filter(val => val && val.trim().length > 0).length;
            
            return {
                id: p.id,
                name: p.name,
                avatar: p.avatar,
                filledCount,
                totalCategories,
                isFinished: filledCount === totalCategories,
                isActive: filledCount > 0 && filledCount < totalCategories
            };
        });
});

</script>

<template>
    <div class="h-[100dvh] w-full flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900 via-indigo-950 to-black text-slate-100 overflow-hidden font-sans">
        
        <!-- === CONNECTION STATUS (Floating) === -->
         <div v-if="!gameState.players.find(p => p.id === myUserId)?.isConnected" class="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse pointer-events-none">
            ⚠️ Conexión Perdida
        </div>

        <!-- === A. HEADER (Fixed HUD) === -->
        <GameHUD 
            :round="gameState.roundsPlayed + 1"
            :total-rounds="gameState.config?.totalRounds || 5"
            :current-letter="gameState.currentLetter"
            :time-left="timeRemaining"
            :timer-color="timerColor"
            @exit="showExitModal = true"
        />

        <!-- === B. MAIN STAGE (The Board) === -->
        <div class="flex-1 overflow-y-auto flex items-center justify-center p-4 relative w-full scroll-smooth">
            
            <!-- PLAYING PHASE -->
            <ActiveBoard 
                v-if="gameState.status === 'PLAYING'"
                :categories="gameState.categories"
                :model-value="answers"
                :current-letter="gameState.currentLetter"
                :board-config="boardConfig"
                :rivals-activity="rivalsActivity"
                @update:model-value="(val) => answers = val"
                @input-focus="handleInputFocus"
                @input-change="handleInput"
            />

            <!-- REVIEW PHASE -->
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
            
            <!-- RESULTS PHASE -->
            <ResultsRanking
                v-else-if="gameState.status === 'RESULTS'"
                :players="sortedPlayers"
                :my-answers="answers"
                :categories="gameState.categories"
                :my-user-id="myUserId"
                :get-player-status="getPlayerStatusForRanking"
            />

        </div>

        <!-- === C. FOOTER (Action Zone) === -->
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

        <!-- TOASTS (Top Right) -->
        <div class="fixed top-20 right-4 z-[60] flex flex-col items-end gap-2 pointer-events-none">
            <TransitionGroup name="toast">
                <div v-for="toast in sessionToasts" :key="toast.id" 
                     class="px-4 py-3 rounded-xl backdrop-blur-md border text-sm font-bold shadow-xl pointer-events-auto"
                     :class="toast.type === 'stop-warning' ? 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30' : 'bg-slate-900/80 text-white border-white/10'"
                >
                    {{ toast.text }}
                </div>
            </TransitionGroup>
        </div>

        <!-- EXIT MODAL -->
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

