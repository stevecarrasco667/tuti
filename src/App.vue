<script setup lang="ts">
import { watch } from 'vue';
import { useRouter } from 'vue-router';
import { useGame } from './composables/useGame';
import { useSound } from './composables/useSound';
import { useToast } from './composables/useToast';

const { gameState, myUserId, leaveGame, isConnected } = useGame();
const { isMuted, toggleMute } = useSound();
const { toasts, addToast } = useToast();
const router = useRouter();

// Detectar jugador kickeado — solo en LOBBY para evitar falsos positivos durante
// la transición de fase LOBBY → GAME donde el array de jugadores puede fluctuar.
let wasInGame = false;
let joinedAt = 0;
watch(() => gameState.value.players, (newPlayers) => {
    const currentPath = router.currentRoute.value.path;
    const gameStatus = gameState.value.status;

    // Solo verificar kicks durante el LOBBY (no durante PLAYING ni GAME_OVER)
    // Las transiciones de fase limpian/reconstruyen la lista de jugadores — no son kicks reales.
    if (myUserId.value && currentPath !== '/' && gameStatus === 'LOBBY') {
        const stillInGame = newPlayers.some(p => p.id === myUserId.value);
        const enoughTimeElapsed = (Date.now() - joinedAt) > 2000;

        if (!stillInGame && wasInGame && newPlayers.length > 0 && enoughTimeElapsed) {
            addToast('Has sido expulsado de la sala por el anfitrión.', 'error');
            leaveGame();
        }
        if (stillInGame) {
            if (!wasInGame) joinedAt = Date.now();
            wasInGame = true;
        }
    } else if (currentPath === '/') {
        wasInGame = false;
    }
}, { deep: true });


// Detectar si la vista actual está en GAME (para posicionar el botón mute)
const isGameView = () => router.currentRoute.value.path.startsWith('/game/');
</script>

<template>
  <div class="h-[100dvh] max-h-[100dvh] w-screen overflow-hidden bg-panel-base text-ink-main flex flex-col items-center relative transition-all duration-500 font-sans group"
       :class="isGameView() ? 'p-0' : 'p-2'">

    <!-- MUTE BUTTON LAYER -->
    <button
        @click="toggleMute"
        class="fixed z-50 w-12 h-12 flex items-center justify-center rounded-full bg-panel-card/80 border-[3px] border-white/10 text-white shadow-xl backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
        :class="isGameView() ? 'bottom-[152px] right-4' : 'top-4 right-4'"
        :title="isMuted ? 'Activar Sonido' : 'Silenciar Sonido'"
    >
        <svg v-if="!isMuted" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 opacity-90">
            <path d="M9.348 14.651l-2.853-2.852H4V8.201h2.495l2.853-2.852v9.302zM15.536 10a5.002 5.002 0 00-2.316-4.195v8.39A5.002 5.002 0 0015.536 10z" />
            <path d="M12.22 3.102v13.796A7.003 7.003 0 0018.5 10a7.003 7.003 0 00-6.28-6.898z" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 opacity-50 text-red-400">
            <path fill-rule="evenodd" d="M9.383 3.076a.75.75 0 011.066.079l.067.086 5.86 8.371a.75.75 0 01-1.127.949l-.067-.086-1.503-2.148H12v3.633a.75.75 0 01-1.077.677l-4.14-2.192H4a2 2 0 01-2-2V9.5a2 2 0 011.66-1.972l.34-.028h1.841l4.14-2.192a.75.75 0 011.402.399l.001 5.863L9.304 3.14a.75.75 0 01.079-1.064zM16.53 4.47a.75.75 0 011.06 0l1.94 1.94 1.94-1.94a.75.75 0 111.06 1.06L20.59 7.47l1.94 1.94a.75.75 0 11-1.06 1.06l-1.94-1.94-1.94 1.94a.75.75 0 01-1.06-1.06l1.94-1.94-1.94-1.94a.75.75 0 010-1.06z" clip-rule="evenodd" />
        </svg>
    </button>

    <!-- RECONNECTION BANNER -->
    <!-- Solo visible cuando la conexión WebSocket cae fuera de la pantalla de inicio.
         No bloquea la UI: permite ver y tipear, pero el servidor rechazará cualquier
         acción enviada. El botones BASTA/Votar quedan deshabilitados via isConnected. -->
    <Transition name="banner">
        <div
            v-if="!isConnected && router.currentRoute.value.path !== '/'"
            class="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 py-2 px-4 bg-amber-500/90 backdrop-blur-sm text-panel-base text-xs font-black uppercase tracking-widest animate-pulse shadow-lg"
        >
            <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Reconectando al servidor...
        </div>
    </Transition>

    <!-- MAIN CONTENT con router-view -->
    <main class="flex-1 w-full relative flex flex-col min-h-0">
        <RouterView v-slot="{ Component }">
            <Transition name="fade">
                <component :is="Component" class="flex-1 flex flex-col min-h-0" />
            </Transition>
        </RouterView>
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
  transition: opacity 0.15s ease-out;
  position: absolute;
  width: 100%;
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
/* Banner Transition */
.banner-enter-active, .banner-leave-active {
  transition: all 0.3s ease-out;
}
.banner-enter-from, .banner-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
</style>
