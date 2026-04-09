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
