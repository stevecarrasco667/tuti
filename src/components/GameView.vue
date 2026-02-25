<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useGame } from '../composables/useGame';
import { useGameEffects } from '../composables/useGameEffects';
import ReloadPrompt from './ReloadPrompt.vue';
import CountdownOverlay from './overlays/CountdownOverlay.vue';
import StopSignal from './overlays/StopSignal.vue';
import MobileChatDrawer from './chat/MobileChatDrawer.vue';
import ConnectionBanner from './overlays/ConnectionBanner.vue';

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
    <div class="h-full w-full flex flex-col bg-gradient-to-br from-tuti-base to-tuti-soft text-ink-main overflow-hidden font-sans">
        <ConnectionBanner />
        <ReloadPrompt />

        <!-- [Phoenix] SPECTATOR MODE BANNER -->
        <div v-if="isSpectator" class="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-ink-main/60 backdrop-blur-md pointer-events-none">
            <div class="text-center space-y-4 animate-pulse">
                <span class="text-6xl">🍿</span>
                <h2 class="text-3xl font-black text-ink-inverse tracking-tight uppercase">Modo Espectador</h2>
                <p class="text-ink-inverse/80 font-bold text-lg max-w-xs mx-auto">Partida en curso. Entrarás automáticamente en la siguiente ronda...</p>
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
                <div v-for="toast in sessionToasts" :key="toast.id" class="px-5 py-3.5 rounded-2xl backdrop-blur-md border-[3px] text-xs font-black uppercase tracking-wider shadow-game-panel pointer-events-auto" :class="toast.type === 'stop-warning' ? 'bg-yellow-400 text-ink-main border-white' : 'bg-panel-base text-ink-main border-white/50'">{{ toast.text }}</div>
            </TransitionGroup>
        </div>

        <div v-if="showExitModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-ink-main/50 backdrop-blur-sm p-4">
             <div class="bg-panel-base border-[3px] border-white/50 rounded-3xl p-6 shadow-game-panel max-w-xs w-full text-center">
                 <h3 class="text-ink-main font-black uppercase tracking-widest text-lg mb-6">¿Salir de la partida?</h3>
                 <div class="flex gap-3">
                     <button @click="showExitModal = false" class="flex-1 py-3 rounded-2xl bg-panel-input border-2 border-panel-card text-ink-soft font-black uppercase tracking-wide hover:bg-white text-xs shadow-inner active:scale-95 transition-all">Cancelar</button>
                     <button @click="handleExit" class="flex-1 py-3 rounded-2xl bg-action-error border-[3px] border-red-400 text-white font-black uppercase tracking-wide hover:bg-red-500 shadow-game-btn active:scale-95 transition-all text-xs">Salir</button>
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
