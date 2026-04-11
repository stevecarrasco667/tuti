import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router';
import HomeView from '../components/HomeView.vue';
import LobbyView from '../components/LobbyView.vue';
import GameView from '../components/GameView.vue';
import GameOverView from '../components/GameOverView.vue';
import { useSocket } from '../composables/useSocket';
import { useGameState } from '../composables/useGameState';
import { generateRandomName } from '../utils/random';

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

// Guard de Rutas: Protección de Deep Links
router.beforeEach((to) => {
    const roomId = to.params.roomId as string | undefined;
    if (!roomId) return true; // Ruta sin sala (Home) -> continuar normalmente

    const { socket, setRoomId } = useSocket();
    if (socket.value) return true; // Ya hay conexión activa -> no interferir

    // Deep Link detectado: iniciar conexión WS automáticamente
    const state = useGameState();
    const userId = state.myUserId.value;
    const name = state.myUserName.value || generateRandomName();
    const avatar = state.myUserAvatar.value || '👤';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('tuti-session-token') || undefined : undefined;

    setRoomId(roomId, { userId, name, avatar, token });
    return true; // Permitimos la navegación temporal. syncRoute ajustará según Server Auth
});
