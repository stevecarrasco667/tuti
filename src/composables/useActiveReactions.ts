import { ref } from 'vue';
import { useSocket } from './useSocket';
import { EVENTS } from '../../shared/consts';

export interface ActiveReaction {
    id: string;
    userId: string;
    emojiId: string;
    customUrl?: string;
    createdAt: number;
}

// Global state singleton for active screen reactions
const activeReactions = ref<ActiveReaction[]>([]);

export function useActiveReactions() {
    const { socket } = useSocket();

    const triggerActiveReaction = (userId: string, emojiId: string, customUrl?: string) => {
        const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        activeReactions.value.push({
            id,
            userId,
            emojiId,
            customUrl,
            createdAt: Date.now()
        });

        // Auto cleanup after 3 seconds (animation duration)
        setTimeout(() => {
            activeReactions.value = activeReactions.value.filter(r => r.id !== id);
        }, 3000);
    };

    const sendReaction = (emojiId: string, customUrl?: string) => {
        if (socket.value && socket.value.readyState === WebSocket.OPEN) {
            socket.value.send(JSON.stringify({
                type: EVENTS.SEND_REACTION,
                payload: { emojiId, customUrl }
            }));
        }
    };

    const clearActiveReactions = () => {
        activeReactions.value = [];
    };

    return {
        activeReactions,
        triggerActiveReaction,
        sendReaction,
        clearActiveReactions
    };
}
