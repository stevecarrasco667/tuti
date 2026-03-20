<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

import { useGame } from './composables/useGame';
import LobbyView from './components/LobbyView.vue';
import HomeView from './components/HomeView.vue';
import GameView from './components/GameView.vue';
import GameOverView from './components/GameOverView.vue';



const { gameState, myUserId, isConnected } = useGame();


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
    <!-- El MUTE BUTTON se ha migrado a componentes individuales por directiva arquitectónica -->    <!-- MAIN CONTENT (Flex Child) -->
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
