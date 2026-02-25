<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue';
import { useChat } from '../../composables/useChat';
import { useGame } from '../../composables/useGame';
import ChatBubble from './ChatBubble.vue';

const props = defineProps<{
    isDisabled?: boolean;
}>();

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
    <div class="flex flex-col h-full overflow-hidden bg-panel-base border-l-[4px] border-white rounded-r-[2rem] border-y-0 lg:border-r-0 shadow-game-panel">
        
        <!-- Header -->
        <div class="h-12 flex items-center px-4 bg-white/60 backdrop-blur-md border-b-[3px] border-white/50 shrink-0 justify-between">
            <h3 class="text-[11px] font-black text-ink-muted uppercase tracking-[0.2em] drop-shadow-sm">Sala de Chat</h3>
            <div v-if="unreadCount > 0" class="bg-action-error text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-bounce">
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
        <div class="p-4 bg-white/60 backdrop-blur-md border-t-[3px] border-white/50 shrink-0">
            <input 
                v-model="inputValue"
                type="text" 
                :placeholder="isDisabled ? '👻 Los fantasmas no hablan...' : 'Escribe un mensaje...'" 
                :disabled="isDisabled"
                class="w-full bg-white rounded-full px-5 py-3 text-sm text-ink-main font-bold outline-none transition-all border-2 border-slate-200 focus:border-action-cyan focus:shadow-inner shadow-sm disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
                :class="isDisabled ? 'placeholder-red-300' : 'placeholder-ink-muted/50'"
                @keydown.enter.prevent="handleSend"
                @focus="handleFocus"
            />
            <div class="text-[10px] font-bold text-ink-soft mt-2 text-center uppercase tracking-widest" v-if="!isDisabled">
                Presiona <span class="text-ink-main">Enter</span> para enviar
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
