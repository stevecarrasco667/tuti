<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

import { useGame } from './composables/useGame';
import { useSound } from './composables/useSound';
import { useToast } from './composables/useToast';
import LobbyView from './components/LobbyView.vue';
import HomeView from './components/HomeView.vue';
import GameView from './components/GameView.vue';
import GameOverView from './components/GameOverView.vue';

const { gameState, myUserId, isConnected, leaveGame } = useGame();
const { isMuted, toggleMute } = useSound();
const { toasts, addToast } = useToast();

onMounted(() => {
    // Si la URL tiene '?room=', el composable useSocket intentará restaurar si hay token
    if (isConnected.value) {
        console.log('🔄 Session restored.');
    }
});
const currentView = ref<'HOME' | 'LOBBY' | 'GAME' | 'GAME_OVER'>('HOME');

const handleNavigate = (view: 'HOME' | 'LOBBY' | 'GAME' | 'GAME_OVER') => {
  currentView.value = view;
};

// Auto-switch views based on game state changes
// NOTA: Este watcher tiene protección anti-regresión.
// PartyKit reconecta automáticamente (ej. tras refresh de token de Supabase) y el primer
// mensaje de reconexión puede llegar con un estado transitorio (roomId vacío o activeView
// = 'LOBBY'). Sin protección, Vue desmont aría GameView causando pantalla negra.
const VIEW_ORDER: Record<string, number> = { HOME: 0, LOBBY: 1, GAME: 2, GAME_OVER: 3 };

watch(
    () => [gameState.value.status, gameState.value.roomId, gameState.value.uiMetadata?.activeView] as const,
    ([_newStatus, newRoomId, newActiveView]) => {
        // GUARDIA 1: Sin sala → siempre HOME (salida definitiva del juego)
        if (!newRoomId) {
            currentView.value = 'HOME';
            return;
        }

        const targetView = newActiveView as 'HOME' | 'LOBBY' | 'GAME' | 'GAME_OVER' | undefined;

        if (!targetView) return; // Sin destino explícito del servidor, no mover

        // GUARDIA 2: Anti-regresión — nunca retroceder desde una vista avanzada
        // a menos que sea un avance legítimo en el flujo del juego.
        // Esto previene que una reconexión transitoria con estado LOBBY revierta GameView.
        const currentOrder = VIEW_ORDER[currentView.value] ?? 0;
        const targetOrder = VIEW_ORDER[targetView] ?? 0;

        if (targetOrder < currentOrder && targetView !== 'HOME') {
            // Regresión no autorizada (ej. GAME → LOBBY por reconexión de PartyKit).
            // Solo se permite retroceder a HOME (salida intencional).
            console.warn(`[Router] Regresión bloqueada: ${currentView.value} → ${targetView}`);
            return;
        }

        currentView.value = targetView;
    }
);


// Detect if current user has been kicked
let wasInGame = false; // Track if we were previously in the game
watch(() => gameState.value.players, (newPlayers) => {
    // If we have a userId and we're not in HOME view
    if (myUserId.value && currentView.value !== 'HOME') {
        // Check if we're still in the players list
        const stillInGame = newPlayers.some(p => p.id === myUserId.value);
        
        // If we're not in the list anymore BUT we were before, we were kicked
        if (!stillInGame && wasInGame && newPlayers.length > 0) {
            addToast('Has sido expulsado de la sala por el anfitrión.', 'error');
            // Salida suave (limpia estado reactivo sin recargar página)
            leaveGame();
        }
        
        // Update tracking flag
        if (stillInGame) {
            wasInGame = true;
        }
    } else {
        // Reset flag when returning to HOME
        wasInGame = false;
    }
}, { deep: true });
</script>

<template>
  <div class="h-[100dvh] max-h-[100dvh] w-screen overflow-hidden bg-panel-base text-ink-main flex flex-col items-center relative transition-all duration-500 font-sans group"
       :class="currentView === 'GAME' ? 'p-0' : 'p-2'">
    
    <!-- MUTE BUTTON LAYER -->
    <button 
        @click="toggleMute"
        class="absolute z-50 p-2 rounded-full bg-panel-card/80 border-2 border-white/10 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-white/10 active:scale-95"
        :class="currentView === 'GAME' ? 'bottom-6 left-4' : 'top-4 right-4'"
        :title="isMuted ? 'Activar Sonido' : 'Silenciar Sonido'"
    >
        <svg v-if="!isMuted" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 opacity-90">
            <path d="M9.348 14.651l-2.853-2.852H4V8.201h2.495l2.853-2.852v9.302zM15.536 10a5.002 5.002 0 00-2.316-4.195v8.39A5.002 5.002 0 0015.536 10z" />
            <path d="M12.22 3.102v13.796A7.003 7.003 0 0018.5 10a7.003 7.003 0 00-6.28-6.898z" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 opacity-50 text-red-400">
            <path fill-rule="evenodd" d="M9.383 3.076a.75.75 0 011.066.079l.067.086 5.86 8.371a.75.75 0 01-1.127.949l-.067-.086-1.503-2.148H12v3.633a.75.75 0 01-1.077.677l-4.14-2.192H4a2 2 0 01-2-2V9.5a2 2 0 011.66-1.972l.34-.028h1.841l4.14-2.192a.75.75 0 011.402.399l.001 5.863L9.304 3.14a.75.75 0 01.079-1.064zM16.53 4.47a.75.75 0 011.06 0l1.94 1.94 1.94-1.94a.75.75 0 111.06 1.06L20.59 7.47l1.94 1.94a.75.75 0 11-1.06 1.06l-1.94-1.94-1.94 1.94a.75.75 0 01-1.06-1.06l1.94-1.94-1.94-1.94a.75.75 0 010-1.06z" clip-rule="evenodd" />
        </svg>
    </button>    <!-- MAIN CONTENT (Flex Child) -->
    <main class="flex-1 w-full relative flex flex-col min-h-0">
        <Transition name="fade" mode="out-in">
            <HomeView key="home" v-if="currentView === 'HOME'" @navigate="handleNavigate" class="flex-1 overflow-y-auto" />
            <LobbyView key="lobby" v-else-if="currentView === 'LOBBY'" class="flex-1 flex flex-col min-h-0" />
            <GameView key="game" v-else-if="currentView === 'GAME'" class="flex-1 flex flex-col min-h-0" />
            <GameOverView key="gameover" v-else-if="currentView === 'GAME_OVER'" class="flex-1 flex flex-col min-h-0" />
        </Transition>
    </main>

    <!-- GLOBAL TOASTS (Overlay) -->
    <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <TransitionGroup name="toast">
            <div 
                v-for="toast in toasts" 
                :key="toast.id" 
                class="px-5 py-3.5 rounded-2xl backdrop-blur-md border-[3px] text-xs font-black uppercase tracking-wider shadow-game-panel pointer-events-auto"
                :class="toast.type === 'error' ? 'bg-red-500 text-white border-white' : (toast.type === 'success' ? 'bg-green-500 text-white border-white' : 'bg-panel-base text-ink-main border-white/50')"
            >
                {{ toast.text }}
            </div>
        </TransitionGroup>
    </div>
  </div>
</template>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease-out;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Toast Transitions */
.toast-enter-active, .toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(40px) scale(0.9);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(40px) scale(0.9);
}
</style>
