import { ref } from 'vue';
import PartySocket from "partysocket";

// Si es DEV, usa localhost. Si es PROD, usa el host actual del navegador.
const PARTYKIT_HOST = import.meta.env.DEV
    ? "127.0.0.1:1999"
    : window.location.host;

// Global state (Singleton pattern) to ensure App.vue and useGame.ts share the connection
const socket = ref<PartySocket | null>(null);
const isConnected = ref(false);
const lastMessage = ref<string>('');
const isIntentionalDisconnect = ref(false);

export function useSocket() {
    const setRoomId = (roomId: string | null, userInfo?: { userId: string, name: string, avatar: string }) => {
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

        // 2. Create new connection
        console.log(`🔌 Connecting to room: ${roomId} on host: ${PARTYKIT_HOST}`);

        if (import.meta.env.DEV) {
            // Mock Server Connection (Native WebSocket)
            const query = new URLSearchParams({ roomId });
            if (userInfo) {
                query.append('userId', userInfo.userId);
                query.append('name', userInfo.name);
                query.append('avatar', userInfo.avatar);
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
                // console.log('Received:', event.data);
            });

            socket.value = ws as any; // Cast for compatibility
        } else {
            // Production PartyKit Connection
            socket.value = new PartySocket({
                host: PARTYKIT_HOST,
                room: roomId,
                query: userInfo // PartySocket handles object to query string conversion
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
        disconnectIntentionally
    };
}
