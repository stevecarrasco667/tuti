<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

import { useGame } from './composables/useGame';
import { useSound } from './composables/useSound';
import LobbyView from './components/LobbyView.vue';
import HomeView from './components/HomeView.vue';
import GameView from './components/GameView.vue';
import GameOverView from './components/GameOverView.vue';



const { gameState, myUserId, isConnected } = useGame();
const { isMuted, toggleMute } = useSound();

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
watch(
    () => [gameState.value.status, gameState.value.roomId] as const,
    ([_newStatus, newRoomId]) => {
        // GUARDIA: Si no hay sala, cualquier status → HOME (previene bucle de salida)
        if (!newRoomId) {
            currentView.value = 'HOME';
            return;
        }

        // Enrutamiento dictado por el Servidor (Agnosticismo)
        if (gameState.value?.uiMetadata?.activeView) {
            currentView.value = gameState.value.uiMetadata.activeView;
        }
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
            alert('Has sido expulsado de la sala por el anfitrión.');
            // Reload page to reset state
            window.location.reload();
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
        class="absolute top-4 right-4 z-50 p-2 rounded-full bg-panel-card/80 border-2 border-white/10 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-white/10 active:scale-95"
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

  </div>
</template>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease-out;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
