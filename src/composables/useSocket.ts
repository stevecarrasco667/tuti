import { ref, onMounted, onUnmounted } from 'vue';
import PartySocket from "partysocket";

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST || (import.meta.env.DEV ? "localhost:1999" : "tutifruti-phoenix.partykit.dev");

export function useSocket() {
    const socket = ref<PartySocket | null>(null);
    const isConnected = ref(false);
    const lastMessage = ref<string>('');

    const connect = (roomId: string = 'lobby') => {
        if (socket.value) return;

        // In DEV mode, we use native WebSocket for the Mock Server
        // In PROD mode, we use PartySocket
        if (import.meta.env.DEV) {
            const ws = new WebSocket('ws://localhost:1999');

            ws.addEventListener('open', () => {
                isConnected.value = true;
                console.log('Connected to Mock Server!');
            });

            ws.addEventListener('close', () => {
                isConnected.value = false;
                console.log('Disconnected from Mock Server');
                socket.value = null;
            });

            ws.addEventListener('message', (event) => {
                lastMessage.value = event.data;
                console.log('Received:', event.data);
            });

            // We cast to any to make it compatible with the ref type, 
            // though in reality it's a native WebSocket in dev
            socket.value = ws as any;
        } else {
            // Production logic using PartySocket
            socket.value = new PartySocket({
                host: PARTYKIT_HOST,
                room: roomId,
            });

            socket.value.addEventListener('open', () => {
                isConnected.value = true;
                console.log('Connected to PartyKit Cloud!');
            });

            socket.value.addEventListener('close', () => {
                isConnected.value = false;
                console.log('Disconnected from PartyKit Cloud');
            });

            socket.value.addEventListener('message', (event: MessageEvent) => {
                lastMessage.value = event.data as string;
                console.log('Received:', event.data);
            });
        }
    };

    onMounted(() => {
        connect();
    });

    onUnmounted(() => {
        if (socket.value) {
            socket.value.close();
        }
    });

    return {
        socket,
        isConnected,
        lastMessage
    };
}
