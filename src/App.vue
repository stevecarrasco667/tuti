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
  <div class="h-[100dvh] w-screen overflow-hidden bg-gradient-to-br from-tuti-base to-tuti-soft flex flex-col items-center relative transition-all duration-500 font-sans text-ink-main"
       :class="currentView === 'GAME' ? 'p-0' : 'p-4'">
    
    <!-- MAIN TITLE (Header) - Hidden in Game Mode -->
    <header v-if="currentView !== 'GAME'" class="flex-none flex flex-col items-center mb-4 z-10 transition-all duration-500 drop-shadow-md">
        <h1 class="text-4xl md:text-5xl font-black text-ink-inverse tracking-tight">
          Tutifruti <span class="text-tuti-soft">Online</span>
        </h1>
        <p class="text-ink-inverse/80 text-sm font-light tracking-wide mt-1">Project Phoenix</p>
    </header>

    <!-- CONNECTION STATUS (Top Right) -->
    <div class="fixed top-4 right-4 flex items-center gap-2 bg-panel-card/90 px-3 py-1.5 rounded-full backdrop-blur-md shadow-game-card z-50">
      <div 
        class="w-2.5 h-2.5 rounded-full transition-colors duration-500"
        :class="isConnected ? 'bg-action-primary shadow-[0_0_8px_rgba(46,204,113,0.5)]' : 'bg-action-error shadow-[0_0_8px_rgba(239,68,68,0.5)]'"
      ></div>
      <span class="text-xs font-bold tracking-wide" :class="isConnected ? 'text-ink-soft' : 'text-action-error'">
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
