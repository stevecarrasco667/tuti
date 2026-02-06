<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue';
import { useChat } from '../../composables/useChat';
import { useGame } from '../../composables/useGame';
import ChatBubble from './ChatBubble.vue';

const { messages, sendMessage, unreadCount, resetUnread } = useChat();
const { myUserId } = useGame();

const inputValue = ref('');
const scrollContainer = ref<HTMLElement | null>(null);

const handleSend = () => {
    const text = inputValue.value.trim();
    if (!text) return;

    sendMessage(text);
    inputValue.value = '';
    scrollToBottom();
};

const scrollToBottom = async () => {
    await nextTick();
    if (scrollContainer.value) {
        scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
};

// Auto-scroll on new messages
watch(messages, () => {
    scrollToBottom();
}, { deep: true });

// Scroll on mount
onMounted(() => {
    scrollToBottom();
});

// Reset unread count when hovering/active (simplified for now, ideally on focus)
const handleFocus = () => {
    resetUnread();
};

</script>

<template>
    <div class="flex flex-col h-full overflow-hidden bg-gray-900/40 backdrop-blur-md border-l border-white/5 rounded-r-2xl border-y-0 lg:border-r-0">
        
        <!-- Header -->
        <div class="h-12 flex items-center px-4 bg-black/20 border-b border-white/5 shrink-0 justify-between">
            <h3 class="text-xs font-bold text-white/50 uppercase tracking-widest">Sala de Chat</h3>
            <div v-if="unreadCount > 0" class="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
                {{ unreadCount }}
            </div>
        </div>

        <!-- Messages List -->
        <div ref="scrollContainer" class="flex-1 overflow-y-auto w-full p-4 flex flex-col gap-3 scroll-smooth">
            <TransitionGroup name="list">
                <ChatBubble 
                    v-for="msg in messages" 
                    :key="msg.id" 
                    :message="msg" 
                    :is-mine="msg.senderId === myUserId"
                />
            </TransitionGroup>
            
            <!-- Empty State -->
            <div v-if="messages.length === 0" class="text-center mt-10 opacity-30 text-sm">
                <div class="text-2xl mb-2">💬</div>
                <div>Sé el primero en hablar...</div>
            </div>
        </div>

        <!-- Input Area -->
        <div class="p-3 bg-black/40 border-t border-white/5 shrink-0">
            <input 
                v-model="inputValue"
                type="text" 
                placeholder="Escribe un mensaje..." 
                class="w-full bg-white/5 rounded-full px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder-white/20 transition-all border border-white/5 focus:bg-white/10"
                @keydown.enter.prevent="handleSend"
                @focus="handleFocus"
            />
            <div class="text-[10px] text-white/20 mt-1.5 text-center">
                Presiona <span class="font-bold text-white/30">Enter</span> para enviar
            </div>
        </div>
    </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.list-leave-to {
  opacity: 0;
}
</style>
