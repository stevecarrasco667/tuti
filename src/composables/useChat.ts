import { ref, watch } from 'vue';
import { useSocket } from './useSocket';
import { useGame } from './useGame';
import { useSound } from './useSound';
import { EVENTS } from '../../shared/consts';
import type { ChatMessage } from '../../shared/types';

// Global Singleton State
const messages = ref<ChatMessage[]>([]);
const unreadCount = ref(0);

export function useChat() {
    const { socket, lastMessage } = useSocket();
    const { myUserId } = useGame();
    const { playClick } = useSound();

    watch(lastMessage, (newMsg) => {
        if (!newMsg) return;
        try {
            const parsed = JSON.parse(newMsg);

            if (parsed.type === EVENTS.CHAT_HISTORY) {
                messages.value = parsed.payload;
            }
            else if (parsed.type === EVENTS.CHAT_NEW) {
                const msg = parsed.payload as ChatMessage;
                messages.value.push(msg);

                // Keep client in sync with server limit (optional but good UI practice)
                if (messages.value.length > 50) {
                    messages.value.shift();
                }

                // Sound & Notification
                if (msg.senderId !== myUserId.value) {
                    playClick();
                    unreadCount.value++;
                }
            }
        } catch (e) {
            // Silently ignore parse errors (handled by useGame or others)
        }
    });

    const sendMessage = (text: string) => {
        if (!socket.value) return;

        socket.value.send(JSON.stringify({
            type: EVENTS.CHAT_SEND,
            payload: { text }
        }));
    };

    const resetUnread = () => {
        unreadCount.value = 0;
    };

    return {
        messages,
        unreadCount,
        sendMessage,
        resetUnread
    };
}
