import { onMounted, watch } from 'vue';
import { useSocket } from './useSocket';
import { useGameState, STORAGE_KEY_SESSION_TOKEN } from './useGameState';
import { useToast } from './useToast';
import { generateRandomName } from '../utils/random';
import { router } from '../router/index';

/**
 * [Sprint 4 - Factor K] useDeepLink
 *
 * Resuelve el bug de "pantalla en blanco" cuando un usuario llega a la app
 * directamente a través de un link compartido (e.g. /lobby/ABCD o /game/ABCD).
 *
 * El flujo normal requiere pasar por HomeView para llamar a joinGame() y abrir
 * el WebSocket. Este composable actúa como portero: si el socket no está activo
 * al montar la vista, lo lanza automáticamente con la identidad del localStorage.
 *
 * Una vez conectado, useGameSync.syncRoute() se encarga de redirigir a la vista
 * correcta según el estado que devuelva el servidor (LOBBY / GAME / GAME_OVER).
 * Si la sala ya no existe, redirigimos al Home con un Toast informativo.
 *
 * @param roomId - El roomId extraído de los params del router (route.params.roomId)
 */
export function useDeepLink(roomId: string) {
    const { socket, setRoomId } = useSocket();
    const { myUserId, myUserName, myUserAvatar } = useGameState();
    const { addToast } = useToast();

    onMounted(async () => {
        // Si el socket ya está activo (el usuario navegó internamente desde HomeView),
        // no hacer nada: el flujo normal ya gestionó la conexión.
        if (socket.value && (socket.value.readyState === WebSocket.OPEN || socket.value.readyState === WebSocket.CONNECTING)) {
            return;
        }

        // ── Auto-conexión via Deep Link ──────────────────────────────────────
        // Recuperamos la identidad persistida en localStorage. Si no hay nombre
        // guardado (usuario completamente nuevo), generamos uno aleatorio.
        const name = myUserName.value?.trim() || generateRandomName();
        const avatar = myUserAvatar.value || '👻';
        const token = typeof localStorage !== 'undefined'
            ? localStorage.getItem(STORAGE_KEY_SESSION_TOKEN) || undefined
            : undefined;

        // Si el nombre estaba vacío, guardamos el generado para coherencia
        if (!myUserName.value?.trim()) {
            myUserName.value = name;
        }

        try {
            await setRoomId(roomId, {
                userId: myUserId.value,
                name,
                avatar,
                token,
            });
        } catch {
            // setRoomId no lanza excepciones normalmente — este catch es por
            // futuros cambios en la firma o errores de red inesperados.
            addToast('No pudimos conectar. Intenta de nuevo.', 'error');
            router.push('/');
        }
    });

    // ── Guardia de Sala Inexistente ──────────────────────────────────────────
    // Cuando la sala no existe en el servidor, PartyKit igualmente acepta la
    // conexión WebSocket pero crea una sala nueva y vacía (roomId null en el
    // estado inicial). Detectamos esto: si tras 4 segundos de conexión el
    // roomId del servidor no coincide con el de la URL, la sala fue borrada.
    // En ese caso, avisamos al usuario y lo mandamos al Home.
    //
    // IMPORTANTE: El watch solo se activa si el roomId del servidor viene vacío
    // (null). Si hay un roomId válido pero diferente, syncRoute() ya lo maneja.
    let validationTimer: ReturnType<typeof setTimeout> | null = null;

    const startValidation = () => {
        if (validationTimer) return;
        validationTimer = setTimeout(() => {
            // Si no llegó ningún roomId del servidor después de 4s, la sala no existe
            const { gameState } = useGameState();
            const serverRoomId = gameState.value.roomId;
            if (!serverRoomId) {
                addToast('Esta sala ya no existe. ¡Crea una nueva!', 'info');
                router.push('/');
            }
        }, 4000);
    };

    // Arranca la validación cuando el socket se conecta
    watch(
        () => socket.value?.readyState,
        (state) => {
            if (state === WebSocket.OPEN) startValidation();
        }
    );
}
