<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useGame } from '../composables/useGame';
import { useGameEffects } from '../composables/useGameEffects';
import ReloadPrompt from './ReloadPrompt.vue';
import CountdownOverlay from './overlays/CountdownOverlay.vue';
import StopSignal from './overlays/StopSignal.vue';
import MobileChatDrawer from './chat/MobileChatDrawer.vue';

// --- GAME BOARDS ---
import TutiBoard from './game/tuti/TutiBoard.vue';
import ImpostorBoard from './game/impostor/ImpostorBoard.vue';

// Use the activeBoard reference to expose internals
const boardRef = ref<any>(null);

const { gameState, stopRound, submitAnswers, shouldSubmit, toggleVote, confirmVotes, myUserId, amIHost, startGame, leaveGame, isStopping } = useGame();

const showCountdown = ref(false);
const showStopSignal = ref(false);

const isSpectator = computed(() => !gameState.value.players.some(p => p.id === myUserId.value));

const handleCountdownFinished = () => {
    showCountdown.value = false;
};

const { 
    timeRemaining, timerColor, sessionToasts, addToast, showStopAlert, stopperPlayer, playClick, playAlarm
} = useGameEffects(gameState, myUserId, amIHost);

// Polimorfismo del tablero
const activeBoard = computed(() => {
  return gameState.value.config.mode === 'IMPOSTOR' ? ImpostorBoard : TutiBoard;
});

// Auto-submit en el orquestador global
watch(shouldSubmit, (needsSubmit) => { 
    if (needsSubmit && boardRef.value && typeof boardRef.value.getAnswers === 'function') {
        submitAnswers(boardRef.value.getAnswers()); 
    }
});

// Global state overlays
watch(() => gameState.value.status, (newStatus) => {
    if (newStatus === 'PLAYING') {
        showCountdown.value = true;
    } else if (newStatus === 'REVIEW') {
        showStopSignal.value = true;
    }
});

const showExitModal = ref(false);
const handleExit = () => { leaveGame(); showExitModal.value = false; };

const handleBoardStop = (answers: Record<string, string>) => {
    stopRound(answers);
    playAlarm();
};

const handleBoardVote = (playerId: string, category: string) => {
    toggleVote(playerId, category);
};

const handleBoardConfirm = () => {
    confirmVotes();
    playClick();
};

const handleToast = (msg: string, style: 'join' | 'leave' | 'stop-warning', iconId: string) => {
    addToast(msg, style, iconId);
};
</script>

<template>
    <div class="h-full w-full flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900 via-indigo-950 to-black text-slate-100 overflow-hidden font-sans">
        
        <ReloadPrompt />

        <!-- [Phoenix] SPECTATOR MODE BANNER -->
        <div v-if="isSpectator" class="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md pointer-events-none">
            <div class="text-center space-y-4 animate-pulse">
                <span class="text-6xl">🍿</span>
                <h2 class="text-3xl font-black text-white tracking-tight">Modo Espectador</h2>
                <p class="text-slate-300 text-lg max-w-xs mx-auto">Partida en curso. Entrarás automáticamente en la siguiente ronda...</p>
            </div>
        </div>
        
        <CountdownOverlay v-if="showCountdown" @finished="handleCountdownFinished" />
        <StopSignal v-if="showStopSignal" @finished="showStopSignal = false" />

        <!-- ARCHITECTURE PROXY (El Renderizador Camaleónico) -->
        <!-- CLEAN PROP DRILLING: Only passing agnostic props, the board resolves the rest -->
        <component 
            :is="activeBoard" 
            ref="boardRef"
            :gameState="gameState"
            :myUserId="myUserId"
            :amIHost="amIHost"
            :isStopping="isStopping"
            :timeRemaining="timeRemaining ?? 0"
            :timerColor="timerColor"
            :isSpectator="isSpectator"
            :showStopAlert="showStopAlert"
            :stopperPlayer="stopperPlayer"
            @exit="showExitModal = true"
            @stop="handleBoardStop"
            @confirm-votes="handleBoardConfirm"
            @next-round="startGame"
            @submit-answers="(ans : Record<string, string>) => submitAnswers(ans)"
            @toggle-vote="handleBoardVote"
            @toast="handleToast"
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

        <!-- Chat global en mobile sigue persistiendo fuera de los tableros si es requerido -->
        <MobileChatDrawer v-if="activeBoard !== ImpostorBoard" class="lg:hidden" />
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
