import { ref, watch } from 'vue';
import PartySocket from "partysocket";
import { supabase } from '../lib/supabase';
import { useReactions } from './useReactions';
import { useToast } from './useToast';
import { EVENTS } from '../../shared/consts';

// Si es DEV, usa localhost. Si es PROD, usa el host actual del navegador.
// Si es DEV, usa localhost. Si es PROD, usa la variable de entorno, o el host actual como respaldo.
const PARTYKIT_HOST = import.meta.env.DEV
    ? "127.0.0.1:1999"
    : import.meta.env.VITE_PARTYKIT_HOST || window.location.host;

// Global state (Singleton pattern) to ensure App.vue and useGame.ts share the connection
const socket = ref<PartySocket | null>(null);
const isConnected = ref(false);
const lastMessage = ref<string>('');
const isIntentionalDisconnect = ref(false);
// [Bug Fix] True while setRoomId() is in progress (async, before socket.value is assigned).
// The router navigation guard checks this to avoid creating a second socket when
// joinGame() already started a connection (push → guard race condition).
export const isConnecting = ref(false);

// [P10] Texto en vivo que escribe el Impostor durante last_wish (singleton)
export const lastWishText = ref<string>('');

// [Room TTL] Config heredada de una sala expirada, lista para auto-clonar.
// El router lo lee al detectar el rechazo ROOM_EXPIRED y crea una sala nueva con estos ajustes.
export const pendingRoomExpiredConfig = ref<import('../../shared/types').GameConfig | null>(null);

// ─── Singleton ephemeral message handlers ──────────────────────────────────
// Se llaman directamente desde el onmessage del socket (no desde watch),
// garantizando que se ejecuten exactamente 1 vez por mensaje.
function handleEphemeralMessages(raw: string) {
    try {
        const msg = JSON.parse(raw);
        if (msg.type === EVENTS.WORD_REACT) {
            const { targetPlayerId, categoryId, emoji, senderId } = msg.payload;
            const { registerReaction } = useReactions();
            registerReaction(targetPlayerId, categoryId, emoji, senderId ?? 'unknown');
        } else if (msg.type === EVENTS.LAST_WISH_TYPING) {
            // [P10] Actualizar el texto en tiempo real del Impostor
            lastWishText.value = msg.payload.text ?? '';
        } else if (msg.type === EVENTS.ROOM_EXPIRED) {
            // [Room TTL — Tier 1] Guardar la configuracion heredada para que el router pueda auto-clonar la sala.
            pendingRoomExpiredConfig.value = msg.payload?.config ?? null;
        } else if (msg.type === EVENTS.ROOM_DEAD) {
            // [Room TTL — Tier 2] Sala purgada definitivamente. No hay config. El router redirige al Home.
            // No hay estado que guardar — solo señalizará via el rechazo de waitForFirstState.
        } else if (msg.type === EVENTS.PLAYER_JOINED) {
            // [Bug Fix] Movido aquí desde watch(lastMessage) en useGameSync.
            // El watch se registra N veces (1 por componente que llama useGame()),
            // causando N toasts idénticos. Este handler es un singleton anclado al
            // socket — se ejecuta exactamente 1 vez por mensaje.
            const { addToast } = useToast();
            addToast(`👥 ${msg.payload?.name} se unió a la sala`, 'success');
        } else if (msg.type === EVENTS.PLAYER_LEFT) {
            // [Bug Fix] Igual que PLAYER_JOINED — singleton para garantizar 1 toast.
            const { addToast } = useToast();
            addToast(`🚪 ${msg.payload?.name} abandonó la sala`, 'info');
        }
    } catch { /* ignorar mensajes no-JSON */ }
}

export function useSocket() {
    const setRoomId = async (roomId: string | null, userInfo?: { userId: string, name: string, avatar: string, token?: string, public?: string }) => {
        // [Bug Fix] Signal that a connection is in progress IMMEDIATELY (before any await).
        // This prevents the router guard from calling setRoomId() again when it sees
        // socket.value===null during the async supabase handshake phase.
        isConnecting.value = true;

        // 1. Close existing connection if any
        if (socket.value) {
            console.log('🔌 Switching rooms... Closing old connection.');
            // Allow immediate reconnection for room switch (unless intentional exit was called before, but here we want to connect to new room)
            isIntentionalDisconnect.value = false;
            socket.value.close();
            socket.value = null;
            isConnected.value = false;
        }

        if (!roomId) return;

        // --- FASE 4: HANDSHAKE BLINDADO ZERO-TRUST ---
        let currentToken = userInfo?.token;

        // Solo intentar obtener sesión de Supabase si hay credenciales reales configuradas.
        // Si VITE_SUPABASE_URL no existe (CI, dummy, etc.) saltamos el paso
        // para no bloquear la conexión con un timeout de red innecesario.
        const hasRealSupabase = !!import.meta.env.VITE_SUPABASE_URL;
        if (hasRealSupabase) {
            try {
                // getSession() puede intentar refrescar token vía red — timeout de seguridad
                const sessionResult = await Promise.race([
                    supabase.auth.getSession(),
                    new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500))
                ]);
                if (sessionResult && 'data' in sessionResult && sessionResult.data?.session?.access_token) {
                    currentToken = sessionResult.data.session.access_token;
                }
            } catch (error) {
                console.warn('No se pudo obtener el token de identidad:', error);
            }
        }


        const enrichedUserInfo = userInfo ? { ...userInfo, token: currentToken } : undefined;

        // 2. Create new connection
        console.log(`🔌 Connecting to room: ${roomId} on host: ${PARTYKIT_HOST}`);

        if (import.meta.env.DEV) {
            // Mock Server Connection (Native WebSocket)
            const query = new URLSearchParams({ roomId });
            if (enrichedUserInfo) {
                query.append('userId', enrichedUserInfo.userId);
                query.append('name', enrichedUserInfo.name);
                query.append('avatar', enrichedUserInfo.avatar);
                if (enrichedUserInfo.token) query.append('token', enrichedUserInfo.token);
                if (enrichedUserInfo.public) query.append('public', enrichedUserInfo.public);
            }
            const ws = new WebSocket(`ws://${PARTYKIT_HOST}?${query.toString()}`);

            ws.addEventListener('open', () => {
                isConnected.value = true;
                console.log('✅ Connected to Mock Server!');
            });

            ws.addEventListener('close', () => {
                isConnected.value = false;
                if (!isIntentionalDisconnect.value) {
                    console.log('❌ Disconnected from Mock Server (Unexpected)');
                } else {
                    console.log('🛑 Disconnected from Mock Server (Intentional)');
                }
            });

            ws.addEventListener('message', (event) => {
                lastMessage.value = event.data;
                // Singleton handler — se ejecuta 1 sola vez sin importar cuántos useGame() estén montados
                handleEphemeralMessages(event.data);
            });

            socket.value = ws as any; // Cast for compatibility
            isConnecting.value = false; // Connection object created — guard can now see socket.value
        } else {
            // Production PartyKit Connection
            socket.value = new PartySocket({
                host: PARTYKIT_HOST,
                room: roomId,
                query: enrichedUserInfo // PartySocket handles object to query string conversion
            });
            isConnecting.value = false; // Connection object created — guard can now see socket.value

            socket.value.addEventListener('open', () => {
                isConnected.value = true;
                console.log('✅ Connected to PartyKit Cloud!');
            });

            socket.value.addEventListener('close', () => {
                isConnected.value = false;
                if (!isIntentionalDisconnect.value) {
                    console.log('❌ Disconnected from PartyKit Cloud (Unexpected)');
                } else {
                    console.log('🛑 Disconnected from PartyKit Cloud (Intentional)');
                }
            });

            socket.value.addEventListener('message', (event: MessageEvent) => {
                lastMessage.value = event.data as string;
                // Singleton handler — se ejecuta 1 sola vez sin importar cuántos useGame() estén montados
                handleEphemeralMessages(event.data as string);
            });
        }
    };

    const disconnectIntentionally = () => {
        if (socket.value) {
            console.log('🛑 Closing connection intentionally via checkmate protocol.');
            isIntentionalDisconnect.value = true;
            socket.value.close();
            socket.value = null;
            isConnected.value = false;
        }
    };

    // [Sprint 4 — Cold Start] Promesa de espera para el primer UPDATE_STATE.
    // El Navigation Guard del router la usa para bloquear la navegación hasta que
    // el servidor confirme que la sala existe y envíe el estado real de la partida.
    // Timeout configurable (default 8s para redes 3G/Latam).
    const waitForFirstState = (timeoutMs = 8000): Promise<void> => {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                unwatch();
                reject(new Error('COLD_START_TIMEOUT'));
            }, timeoutMs);

            const unwatch = watch(lastMessage, (raw) => {
                try {
                    const msg = JSON.parse(raw);
                    if (msg.type === EVENTS.UPDATE_STATE) {
                        clearTimeout(timeout);
                        unwatch();
                        resolve();
                    } else if (msg.type === EVENTS.ROOM_EXPIRED) {
                        // [Room TTL — Tier 1] Sala expirada — rechazar de inmediato sin esperar el timeout.
                        // pendingRoomExpiredConfig ya fue seteado por handleEphemeralMessages.
                        clearTimeout(timeout);
                        unwatch();
                        reject(new Error('ROOM_EXPIRED'));
                    } else if (msg.type === EVENTS.ROOM_DEAD) {
                        // [Room TTL — Tier 2] Sala purgada definitivamente — rechazar sin config.
                        clearTimeout(timeout);
                        unwatch();
                        reject(new Error('ROOM_DEAD'));
                    }
                } catch { /* ignorar mensajes no-JSON */ }
            });
        });
    };

    return {
        socket,
        isConnected,
        lastMessage,
        setRoomId,
        connectToParty: setRoomId,
        disconnectIntentionally,
        isIntentionalDisconnect,
        waitForFirstState
    };
}
