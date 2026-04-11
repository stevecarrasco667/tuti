import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router';
import { ref } from 'vue';
import HomeView from '../components/HomeView.vue';
import LobbyView from '../components/LobbyView.vue';
import GameView from '../components/GameView.vue';
import GameOverView from '../components/GameOverView.vue';
import { useSocket } from '../composables/useSocket';
import { useGameState } from '../composables/useGameState';
import { useToast } from '../composables/useToast';

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

// ═══════════════════════════════════════════════════════════════════════════════
// [Sprint 4 — Cold Start] Navigation Guard: Auto-Bootstrapping de Deep Links
//
// PROBLEMA: Cuando un usuario abre un enlace directo (/game/PNUQ, /lobby/ABCD),
// GameView monta pero NADIE llama setRoomId() → WebSocket queda null → WSOD.
//
// SOLUCIÓN: Este guard intercepta todas las rutas con :roomId. Si no hay conexión
// WebSocket activa, la establece automáticamente con el perfil del localStorage,
// espera que el servidor confirme con UPDATE_STATE, y SOLO ENTONCES permite la
// navegación, garantizando que el componente siempre monte con estado real.
// ═══════════════════════════════════════════════════════════════════════════════

// Estado global de bootstrapping — leído por App.vue para mostrar el loading overlay.
// Vive fuera del guard porque App.vue necesita observarlo reactivamente.
export const isBootstrapping = ref(false);

router.beforeEach(async (to, _from, next) => {
    const roomId = to.params.roomId as string | undefined;

    // Solo interceptar rutas con :roomId (lobby, game, results)
    if (!roomId) return next();

    const { socket, setRoomId, waitForFirstState } = useSocket();

    // Si ya hay una conexión activa → warm start normal, no interferir
    if (socket.value) return next();

    // ── COLD START DETECTADO ─────────────────────────────────────────────
    // El usuario llegó por deep link sin pasar por HomeView.
    // Necesitamos bootstrapear la conexión antes de dejar que el componente monte.

    const { addToast } = useToast();
    const state = useGameState();

    isBootstrapping.value = true;

    try {
        // 1. Leer perfil del usuario desde la capa de estado (ya tiene defaults resilientes)
        const userId = state.myUserId.value;
        const name = state.myUserName.value;
        const avatar = state.myUserAvatar.value;
        const token = typeof localStorage !== 'undefined'
            ? localStorage.getItem('tuti-session-token') || undefined
            : undefined;

        // 2. Establecer conexión WebSocket con el servidor
        await setRoomId(roomId, { userId, name, avatar, token });

        // 3. Esperar el primer UPDATE_STATE del servidor (timeout: 8s para redes 3G/Latam)
        await waitForFirstState(8000);

        // 4. Conexión exitosa — el gameState ya está hidratado con datos reales.
        //    syncRoute() del useGameSync se encargará de redirigir a la ruta
        //    correcta si el servidor dice que la vista debería ser diferente
        //    (ej. usuario llega a /game/ pero la partida ya terminó → /results/).
        isBootstrapping.value = false;
        next();

    } catch (err) {
        // ── TIMEOUT O ERROR DE CONEXIÓN ──────────────────────────────────
        // La sala no existe, el servidor no responde, o la red es muy lenta.
        // Redirigimos al Home con un Toast de error para no dejar al usuario atrapado.
        isBootstrapping.value = false;
        console.error('[ColdStart] Bootstrap falló:', err);
        addToast('No se pudo conectar a la sala. Verifica tu conexión a internet.', 'error');
        next('/');
    }
});
