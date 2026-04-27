import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router';
import { ref } from 'vue';
import HomeView from '../components/HomeView.vue';
import { useSocket, pendingRoomExpiredConfig } from '../composables/useSocket';
import { useGameState } from '../composables/useGameState';
import { useToast } from '../composables/useToast';
import { i18n } from '../i18n';
import { generateRoomId } from '../utils/random';
import { EVENTS } from '../../shared/consts';

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
        component: () => import('../components/LobbyView.vue'),
    },
    {
        path: '/game/:roomId',
        name: 'game',
        component: () => import('../components/GameView.vue'),
    },
    {
        path: '/results/:roomId',
        name: 'results',
        component: () => import('../components/GameOverView.vue'),
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
//
// [Room TTL] EXTENSIÓN: Si el servidor rechaza con ROOM_EXPIRED, el guard
// auto-clona la sala con la configuración heredada y redirige al nuevo lobby.
// ═══════════════════════════════════════════════════════════════════════════════

// Estado global de bootstrapping — leído por App.vue para mostrar el loading overlay.
// Vive fuera del guard porque App.vue necesita observarlo reactivamente.
export const isBootstrapping = ref(false);

router.beforeEach(async (to, _from, next) => {
    const roomId = to.params.roomId as string | undefined;

    // Solo interceptar rutas con :roomId (lobby, game, results)
    if (!roomId) return next();

    const { socket, setRoomId, waitForFirstState, disconnectIntentionally } = useSocket();

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
        isBootstrapping.value = false;
        const errMsg = err instanceof Error ? err.message : String(err);

        // ── [Room TTL — Tier 1] SALA EXPIRADA — AUTO-CLONAR ─────────────────
        if (errMsg === 'ROOM_EXPIRED') {
            console.info('[ColdStart] Sala expirada detectada. Iniciando auto-clonación...');

            // Limpiar la conexión al socket muerto antes de abrir uno nuevo
            disconnectIntentionally();

            const inheritedConfig = pendingRoomExpiredConfig.value;
            pendingRoomExpiredConfig.value = null; // Limpiar el singleton global

            // Generar nueva sala con un ID fresco
            const newRoomId = generateRoomId();

            const userId = state.myUserId.value;
            const name = state.myUserName.value;
            const avatar = state.myUserAvatar.value;
            const token = typeof localStorage !== 'undefined'
                ? localStorage.getItem('tuti-session-token') || undefined
                : undefined;

            // Conectar a la nueva sala en background (sin await — optimistic navigation)
            setRoomId(newRoomId, { userId, name, avatar, token });

            // Si el servidor nos devolvió la config, aplicarla una vez el socket esté listo.
            // Usamos un delay de 1.5s para dar tiempo al WebSocket de completar el handshake.
            if (inheritedConfig) {
                setTimeout(() => {
                    const { socket: freshSocket } = useSocket();
                    if (freshSocket.value) {
                        freshSocket.value.send(JSON.stringify({
                            type: EVENTS.UPDATE_CONFIG,
                            payload: inheritedConfig
                        }));
                    }
                }, 1500);
            }

            addToast(i18n.global.t('system.roomExpired'), 'success');

            // Navegar al nuevo lobby de forma optimista
            next(`/lobby/${newRoomId}`);
            return;
        }

        // ── [Room TTL — Tier 2] SALA PURGADA — REDIRIGIR AL HOME ────────────
        if (errMsg === 'ROOM_DEAD') {
            console.info('[ColdStart] Sala purgada definitivamente.');
            disconnectIntentionally();
            addToast(i18n.global.t('system.roomPurged'), 'info');
            next('/');
            return;
        }
        // ── TIMEOUT O ERROR DE CONEXIÓN GENÉRICO ─────────────────────────
        // La sala no existe, el servidor no responde, o la red es muy lenta.
        // Redirigimos al Home con un Toast de error para no dejar al usuario atrapado.
        console.error('[ColdStart] Bootstrap falló:', err);
        addToast(i18n.global.t('system.connectionFailed'), 'error');
        next('/');
    }
});
