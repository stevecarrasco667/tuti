<script setup lang="ts">
import { watch } from 'vue';
import { useRouter } from 'vue-router';
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { useGame } from './composables/useGame';
import { useToast } from './composables/useToast';
import { useI18n } from 'vue-i18n';
import { isBootstrapping } from './router/index';
import ErrorBoundary from './components/ui/ErrorBoundary.vue';
import { useKeyboard } from './composables/useKeyboard';
import { App as CapacitorApp } from '@capacitor/app';
import AppLayout from './components/layout/AppLayout.vue';
import ActiveReactionsOverlay from './components/game/ActiveReactionsOverlay.vue';
import TacticalReactionWheel from './components/game/TacticalReactionWheel.vue';

useKeyboard();
const { gameState, myUserId, leaveGame, isConnected } = useGame();
const { toasts, addToast } = useToast();
const { t } = useI18n();
const router = useRouter();

// ─── Service Worker: Desactivar en Capacitor Nativo ────────────────────────
// En Capacitor, los assets se sirven desde el filesystem, NO desde la red.
// El SW de PWA (workbox) cachea los JS del build y puede servir versiones VIEJAS
// indefinidamente porque no hay "red" para triggear la actualización.
// Solución: desregistrar todos los SWs existentes y limpiar caches en nativo.
const isCapacitorNative = !!(window as any).Capacitor?.isNativePlatform?.();

if (isCapacitorNative) {
    // Limpiar cualquier SW viejo que haya quedado cacheado en el WebView
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for (const registration of registrations) {
                registration.unregister();
                console.log('[TUTI] Unregistered stale Service Worker');
            }
        });
    }
    // Limpiar todas las caches de workbox/CacheStorage
    if ('caches' in window) {
        caches.keys().then(names => {
            for (const name of names) {
                caches.delete(name);
                console.log('[TUTI] Deleted cache:', name);
            }
        });
    }
} else {
    // Solo registrar el SW en la versión WEB (no en Capacitor)
    useRegisterSW({
        onRegisteredSW(_scriptUrl: string, registration: ServiceWorkerRegistration | undefined) {
            // Revisar actualizaciones cada 60 segundos (útil cuando la pestaña queda abierta)
            if (registration) {
                setInterval(() => {
                    registration.update();
                }, 60 * 1000);
            }
        },
        onNeedRefresh() {
            const isHome = router.currentRoute.value.path === '/';
            const isInGame = gameState.value.status !== 'LOBBY';

            if (isHome && !isInGame) {
                // Usuario en home y sin partida activa → recargar silenciosamente
                window.location.reload();
            }
            // Si está en juego, el nuevo SW ya está instalado.
            // Tomará control automáticamente la próxima vez que naveguen a /.
        },
    });
}

// Detectar jugador kickeado — solo en LOBBY para evitar falsos positivos durante
// la transición de fase LOBBY → GAME donde el array de jugadores puede fluctuar.
// [Sprint H11 — Perf] Observamos una cadena derivada plana de IDs (O(n) de strings)
// en lugar de deep:true (recorrido recursivo completo del arreglo de objetos).
let wasInGame = false;
let joinedAt = 0;
watch(() => gameState.value.players.map(p => p.id).join(','), () => {
    const newPlayers = gameState.value.players;
    const currentPath = router.currentRoute.value.path;
    const gameStatus = gameState.value.status;

    // Solo verificar kicks durante el LOBBY (no durante PLAYING ni GAME_OVER)
    // Las transiciones de fase limpian/reconstruyen la lista de jugadores — no son kicks reales.
    if (myUserId.value && currentPath !== '/' && gameStatus === 'LOBBY') {
        const stillInGame = newPlayers.some(p => p.id === myUserId.value);
        const enoughTimeElapsed = (Date.now() - joinedAt) > 2000;

        if (!stillInGame && wasInGame && newPlayers.length > 0 && enoughTimeElapsed) {
            addToast(t('system.kicked'), 'error');
            leaveGame();
        }
        if (stillInGame) {
            if (!wasInGame) joinedAt = Date.now();
            wasInGame = true;
        }
    } else if (currentPath === '/') {
        wasInGame = false;
    }
});




// Detectar si la vista requiere pantalla completa absoluta (sin padding de borde)
const isFullFrameView = () => {
    const path = router.currentRoute.value.path;
    return path.startsWith('/game/') || path.startsWith('/lobby/') || path.startsWith('/results/');
};

// ── [Capacitor] Hardware Back Button Interceptor ──────────────────────────────
// Evita que el usuario salga del juego accidentalmente al usar el gesto de 
// "Atrás" o el botón físico en Android.
CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    const currentPath = router.currentRoute.value.path;
    const gameStatus = gameState.value.status;

    if (currentPath === '/') {
        // Estamos en el inicio, permitir salir de la app
        CapacitorApp.exitApp();
    } else if (gameStatus !== 'LOBBY') {
        // En partida, ignoramos el botón para evitar accidentes
        addToast(t('system.actionDisabled'), 'stop-warning');
    } else if (canGoBack) {
        // Si no estamos jugando y el router puede retroceder
        router.back();
    }
});
</script>

<template>
  <div class="w-screen h-[100dvh] overflow-hidden bg-panel-base text-ink-main flex flex-col items-center relative transition-all duration-300 font-sans group"
       :class="isFullFrameView() ? 'p-0' : 'p-2'">



    <!-- RECONNECTION BANNER -->
    <!-- Solo visible cuando la conexión WebSocket cae fuera de la pantalla de inicio.
         No bloquea la UI: permite ver y tipear, pero el servidor rechazará cualquier
         acción enviada. El botones BASTA/Votar quedan deshabilitados via isConnected. -->
    <Transition name="banner">
        <div
            v-if="!isConnected && router.currentRoute.value.path !== '/'"
            class="fixed top-0 left-0 right-0 z-overlay flex items-center justify-center gap-2 py-2 px-4 bg-amber-500/90 backdrop-blur-sm text-panel-base text-xs font-black uppercase tracking-widest animate-pulse shadow-lg"
            role="alert"
        >
            <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {{ t('app.reconnecting') }}
        </div>
    </Transition>
    <!-- [Sprint 4 — Cold Start] LOADING OVERLAY GLOBAL -->
    <!-- Renderizado FUERA del RouterView: mientras el Navigation Guard bloquea la
         resolución de next(), el componente destino no monta, pero App.vue sí.
         Este overlay evita que el usuario vea una pantalla en blanco durante
         el bootstrapping de la conexión WebSocket (hasta 8s en redes lentas). -->
    <Transition name="fade">
        <div
            v-if="isBootstrapping"
            class="fixed inset-0 z-loading flex flex-col items-center justify-center bg-gradient-to-br from-[#1a0533] via-[#0f0a1a] to-[#1a0533]"
        >
            <!-- Spinner principal -->
            <div class="relative mb-8">
                <div class="w-20 h-20 rounded-full border-4 border-white/10 border-t-purple-400 animate-spin"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                    <span class="text-3xl animate-pulse">🎮</span>
                </div>
            </div>

            <!-- Texto de estado -->
            <h2 class="text-white font-black text-xl uppercase tracking-[0.2em] mb-2 animate-pulse">
                {{ t('app.connecting') }}
            </h2>
            <p class="text-white/40 text-xs font-bold uppercase tracking-widest">
                {{ t('app.preparingGame') }}
            </p>

            <!-- Barra de progreso sutil -->
            <div class="mt-8 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-loading-bar"></div>
            </div>
        </div>
    </Transition>

    <!-- MAIN CONTENT con AppLayout y router-view -->
    <AppLayout class="flex-1 w-full relative flex flex-col min-h-0">
        <ErrorBoundary>
            <RouterView v-slot="{ Component }">
                <Transition name="fade">
                    <component :is="Component" class="flex-1 flex flex-col min-h-0" />
                </Transition>
            </RouterView>
        </ErrorBoundary>

        <!-- Active reactions animated overlays — Lobby ONLY -->
        <!-- La rueda de emojis y el overlay de partículas se restringen al Lobby.
             En partida (PLAYING/GAME_OVER) interferirían con la jugabilidad. -->
        <template v-if="isConnected && gameState.roomId && gameState.status === 'LOBBY'">
            <ActiveReactionsOverlay />
            <TacticalReactionWheel />
        </template>
    </AppLayout>

    <!-- GLOBAL TOASTS (Overlay) — [Sprint H4 FE-2] unified renderer for all toast types -->
    <div class="fixed top-4 right-4 z-toast flex flex-col gap-2 pointer-events-none" aria-live="polite">
        <TransitionGroup name="toast">
            <div
                v-for="toast in toasts"
                :key="toast.id"
                class="px-5 py-3.5 rounded-2xl backdrop-blur-md border-[3px] text-xs font-black uppercase tracking-wider shadow-game-panel pointer-events-auto"
                :class="{
                    'bg-red-500 text-white border-white':           toast.type === 'error',
                    'bg-green-500 text-white border-white':         toast.type === 'success' || toast.type === 'join',
                    'bg-yellow-400 text-ink-main border-white':     toast.type === 'stop-warning',
                    'bg-panel-base text-ink-main border-white/50':  toast.type === 'info' || toast.type === 'leave',
                }"
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
/* Cold Start Loading Bar */
@keyframes loading-bar {
  0% { width: 0%; margin-left: 0; }
  50% { width: 60%; margin-left: 20%; }
  100% { width: 0%; margin-left: 100%; }
}
.animate-loading-bar {
  animation: loading-bar 1.8s ease-in-out infinite;
}
</style>
