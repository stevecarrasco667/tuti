<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useSocket } from './composables/useSocket';
import { useGame } from './composables/useGame';
import LobbyView from './components/LobbyView.vue';
import HomeView from './components/HomeView.vue';
import GameView from './components/GameView.vue';
import GameOverView from './components/GameOverView.vue';

const { isConnected } = useSocket();
const { gameState, myUserId, tryRestoreSession } = useGame();

onMounted(() => {
    // Attempt auto-reconnect if URL has room param
    if (tryRestoreSession()) {
        console.log('🔄 Attempting to restore session...');
    }
});
const currentView = ref<'HOME' | 'LOBBY' | 'GAME' | 'GAME_OVER'>('HOME');

const handleNavigate = (view: 'HOME' | 'LOBBY' | 'GAME' | 'GAME_OVER') => {
  currentView.value = view;
};

// Auto-switch views based on game state changes
watch(
    () => [gameState.value.status, gameState.value.roomId] as const,
    ([newStatus, newRoomId]) => {
        // GUARDIA: Si no hay sala, cualquier status → HOME (previene bucle de salida)
        if (!newRoomId) {
            currentView.value = 'HOME';
            return;
        }

        // Transiciones normales y reconexiones (solo con roomId válido)
        const gameStates = ['PLAYING', 'REVIEW', 'ROLE_REVEAL', 'TYPING', 'VOTING', 'RESULTS'];
        if (gameStates.includes(newStatus)) {
            currentView.value = 'GAME';
        } else if (newStatus === 'LOBBY') {
            currentView.value = 'LOBBY';
        } else if (newStatus === 'GAME_OVER') {
            currentView.value = 'GAME_OVER';
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
  <div class="h-[100dvh] w-screen overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex flex-col items-center relative transition-all duration-500"
       :class="currentView === 'GAME' ? 'p-0' : 'p-4'">
    
    <!-- MAIN TITLE (Header) - Hidden in Game Mode -->
    <header v-if="currentView !== 'GAME'" class="flex-none flex flex-col items-center mb-4 z-10 transition-all duration-500">
        <h1 class="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 drop-shadow-lg tracking-tight">
          Tutifruti Online
        </h1>
        <p class="text-purple-200 text-sm font-light tracking-wide">Project Phoenix</p>
    </header>

    <!-- CONNECTION STATUS (Top Right) -->
    <div class="fixed top-4 right-4 flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 z-50">
      <div 
        class="w-2.5 h-2.5 rounded-full transition-colors duration-500 shadow-[0_0_10px_currentColor]"
        :class="isConnected ? 'bg-green-500 text-green-500' : 'bg-red-500 text-red-500'"
      ></div>
      <span class="text-xs font-mono text-gray-300">
        {{ isConnected ? 'Connected' : 'Disconnected' }}
      </span>
    </div>

    <!-- MAIN CONTENT (Flex Child) -->
    <main class="flex-1 w-full relative overflow-hidden flex flex-col min-h-0">
        <HomeView v-if="currentView === 'HOME'" @navigate="handleNavigate" class="flex-1 overflow-y-auto" />
        <LobbyView v-else-if="currentView === 'LOBBY'" class="flex-1 flex flex-col min-h-0" />
        <GameView v-else-if="currentView === 'GAME'" class="flex-1 flex flex-col min-h-0" />
        <GameOverView v-else-if="currentView === 'GAME_OVER'" class="flex-1 flex flex-col min-h-0" />
    </main>

  </div>
</template>
