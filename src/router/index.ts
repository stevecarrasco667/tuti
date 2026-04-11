import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router';
import HomeView from '../components/HomeView.vue';
import LobbyView from '../components/LobbyView.vue';
import GameView from '../components/GameView.vue';
import GameOverView from '../components/GameOverView.vue';

// [Sprint 2 - P2] Vue Router: URLs navegables para Viralidad (Sprint 4)
// El backend sigue siendo la autoridad. useGameSync hace router.push() cuando el
// servidor cambia uiMetadata.activeView. Las rutas aquí son "puertas de entrada"
// para compartir links, no para control de flujo interno.
const routes = [
    {
        path: '/',
        name: 'home',
        component: HomeView,
    },
    {
        path: '/lobby/:roomId',
        name: 'lobby',
        component: LobbyView,
    },
    {
        path: '/game/:roomId',
        name: 'game',
        component: GameView,
    },
    {
        path: '/results/:roomId',
        name: 'results',
        component: GameOverView,
    },
    // Fallback: cualquier ruta desconocida vuelve al Home
    {
        path: '/:pathMatch(.*)*',
        redirect: '/',
    },
];

export const router = createRouter({
    history: typeof window === 'undefined' ? createMemoryHistory() : createWebHistory(),
    routes,
});

// ── [Bug Fix: Deep Links] Barrera de Seguridad Global ───────────────────────
// Problema: Al abrir un link de sala directo (/game/ABCD, /lobby/ABCD),
// el usuario se salta HomeView. Sin HomeView, el socket nunca se conecta y
// gameState queda vacío → pantalla en blanco.
//
// Solución: Si el usuario llega "en frío" (sin roomId en el gameState singleton),
// bloqueamos la navegación y lo enviamos a '/?join=ROOMCODE'.
// HomeView lo detecta en onMounted, pre-rellena el código y lo une automáticamente.
// Cuando el servidor luego emite UPDATE_STATE, syncRoute() empuja la ruta correcta.
//
// EXCEPCIÓN: Si el socket ya está vivo (roomId presente), dejamos pasar normal.
// Esto cubre el flujo interno (LOBBY→GAME→RESULTS via syncRoute).
import { gameState } from '../composables/useGameState';

const GAME_ROUTES = ['/lobby', '/game', '/results'];

router.beforeEach((to) => {
    // ¿Es una ruta "profunda" del juego?
    const isDeepRoute = GAME_ROUTES.some(prefix => to.path.startsWith(prefix));
    if (!isDeepRoute) return true; // Home, fallback → dejar pasar siempre

    // ¿Ya tenemos conexión activa? (el singleton gameState ya tiene roomId)
    // Esto ocurre en flujos normales (syncRoute interno) — no bloquear.
    if (gameState.value.roomId) return true;

    // Cold deep-link: extraer roomId del path (/game/ABCD → "ABCD")
    const roomId = to.params.roomId as string | undefined;
    if (roomId) {
        // Redirigir a Home con el código de sala como parámetro de query.
        // HomeView lo leerá y ejecutará joinGame automáticamente.
        return { path: '/', query: { join: roomId } };
    }

    // Si por alguna razón no hay roomId en la ruta dinámica, redirigir a Home.
    return { path: '/' };
});
