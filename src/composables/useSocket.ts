import { ref } from 'vue';
import PartySocket from "partysocket";
import { supabase } from '../lib/supabase';
import { useReactions } from './useReactions';
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

// ─── Singleton WORD_REACT handler ────────────────────────────────────────────
// Se llama directamente desde el onmessage del socket (no desde watch)
// para garantizar que registerReaction se ejecute exactamente 1 vez por mensaje.
function handleReactionMessage(raw: string) {
    try {
        const msg = JSON.parse(raw);
        if (msg.type === EVENTS.WORD_REACT) {
            const { targetPlayerId, categoryId, emoji, senderId } = msg.payload;
            const { registerReaction } = useReactions();
            registerReaction(targetPlayerId, categoryId, emoji, senderId ?? 'unknown');
        }
    } catch { /* ignorar mensajes no-JSON */ }
}

export function useSocket() {
    const setRoomId = async (roomId: string | null, userInfo?: { userId: string, name: string, avatar: string, token?: string, public?: string }) => {
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
        try {
            const { data } = await supabase.auth.getSession();
            if (data?.session?.access_token) {
                currentToken = data.session.access_token;
            }
        } catch (error) {
            console.warn('No se pudo obtener el token de identidad:', error);
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
                // Singleton WORD_REACT handler — se ejecuta 1 sola vez sin importar cuántos useGame() estén montados
                handleReactionMessage(event.data);
            });

            socket.value = ws as any; // Cast for compatibility
        } else {
            // Production PartyKit Connection
            socket.value = new PartySocket({
                host: PARTYKIT_HOST,
                room: roomId,
                query: enrichedUserInfo // PartySocket handles object to query string conversion
            });

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
                // Singleton WORD_REACT handler — se ejecuta 1 sola vez sin importar cuántos useGame() estén montados
                handleReactionMessage(event.data as string);
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

    return {
        socket,
        isConnected,
        lastMessage,
        setRoomId,
        connectToParty: setRoomId,
        disconnectIntentionally,
        isIntentionalDisconnect
    };
}
