import { ref, watch } from 'vue';
import { useSocket } from './useSocket';
import type { RoomState, ServerMessage } from '../../shared/types';

// Global state to persist across component mounts if needed
const gameState = ref<RoomState>({
    status: 'LOBBY',
    players: []
});

export function useGame() {
    const { socket, lastMessage } = useSocket();

    // Watch for incoming messages
    watch(lastMessage, (newMsg) => {
        if (!newMsg) return;

        try {
            const parsed: ServerMessage = JSON.parse(newMsg);

            if (parsed.type === 'UPDATE_STATE') {
                gameState.value = parsed.payload;
            }
        } catch (e) {
            console.error('Failed to parse message:', e);
        }
    });

    const joinGame = (name: string) => {
        if (!socket.value) return;

        const message = {
            type: 'JOIN',
            payload: { name }
        };

        socket.value.send(JSON.stringify(message));
    };

    return {
        gameState,
        joinGame
    };
}
