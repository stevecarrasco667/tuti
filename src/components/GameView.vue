<script setup lang="ts">
import { ref, watch, computed, defineAsyncComponent } from 'vue';
import { useGame } from '../composables/useGame';
import { useGameEffects } from '../composables/useGameEffects';
import ReloadPrompt from './ReloadPrompt.vue';
import CountdownOverlay from './overlays/CountdownOverlay.vue';
import StopSignal from './overlays/StopSignal.vue';
import MobileChatDrawer from './chat/MobileChatDrawer.vue';

// --- GAME BOARDS (Lazy-loaded — no forman parte del bundle inicial) ---
// El pre-fetch ocurre en LobbyView mientras el usuario espera el inicio de la partida.
// defineAsyncComponent garantiza que el JS de los motores solo se descargue cuando
// el modo de juego está confirmado, evitando race conditions en redes lentas.
const TutiBoard = defineAsyncComponent(() => import('./game/tuti/TutiBoard.vue'));
const ImpostorBoard = defineAsyncComponent(() => import('./game/impostor/ImpostorBoard.vue'));

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
    timeRemaining, timerColor, addToast, showStopAlert, stopperPlayer, playClick, playAlarm
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
    <div class="h-full w-full flex flex-col bg-panel-base text-ink-main overflow-hidden font-sans">
        <ReloadPrompt />

        <!-- [Sprint 5 - Spectator Mode] BANNER ELEGANTE NO INTRUSIVO -->
        <div v-if="isSpectator" class="absolute top-[80px] left-1/2 -translate-x-1/2 z-modal flex items-center gap-2 bg-red-900 border-2 border-red-500 rounded-full px-6 py-2 shadow-[0_0_15px_rgba(239,68,68,0.5)] pointer-events-none w-max">
            <span class="text-xl animate-pulse">🍿</span>
            <span class="text-white font-black text-xs md:text-sm tracking-widest uppercase" style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">MODO ESPECTADOR - ESPERANDO SIGUIENTE PARTIDA</span>
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

        <div v-if="showExitModal" class="fixed inset-0 z-overlay flex items-center justify-center bg-ink-main/50 backdrop-blur-sm p-4">
             <div class="bg-panel-base border-[3px] border-white/50 rounded-3xl p-6 shadow-game-panel max-w-xs w-full text-center">
                 <h3 class="text-ink-main font-black uppercase tracking-widest text-lg mb-6">¿Salir de la partida?</h3>
                 <div class="flex gap-3">
                     <button @click="showExitModal = false" class="flex-1 py-3 rounded-2xl bg-panel-input border-2 border-panel-card text-ink-soft font-black uppercase tracking-wide hover:bg-panel-card text-xs shadow-inner active:scale-95 transition-all">Cancelar</button>
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
