import { ref, watch, effectScope } from 'vue';
import { useSocket } from './useSocket';
import { useGame } from './useGame';
import { useSound } from './useSound';
import { EVENTS } from '../../shared/consts';
import type { ChatMessage } from '../../shared/types';

// Global Singleton State
const messages = ref<ChatMessage[]>([]);
const unreadCount = ref(0);
let isInitialized = false;
const chatScope = effectScope(true); // Detached scope

export function useChat() {
    const { socket, lastMessage } = useSocket();
    // We can't destructure useGame/useSound outside, but we need them inside the watcher.
    // However, useGame/useSound might rely on injection context if used inside components.
    // But since they are composables using global state/refs, it should be fine.

    // Initialize Singleton Watcher ONCE
    if (!isInitialized) {
        chatScope.run(() => {
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

                        // Deduplication Check (Safety Net)
                        if (messages.value.some(m => m.id === msg.id)) {
                            return;
                        }

                        messages.value.push(msg);

                        // Keep client in sync with server limit
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
                    // Silently ignore parse errors
                }
            });
        });
        isInitialized = true;
    }

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
