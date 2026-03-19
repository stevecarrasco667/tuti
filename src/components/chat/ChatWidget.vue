<script setup lang="ts">
import { ref, watch, nextTick, onMounted, computed } from 'vue';
import { useChat } from '../../composables/useChat';
import { useGame } from '../../composables/useGame';
import { useGameState } from '../../composables/useGameState';
import { isSpoiler } from '../../../shared/utils/spoiler';
import ChatBubble from './ChatBubble.vue';

const props = defineProps<{
    isDisabled?: boolean;
}>();

const { messages, sendMessage, unreadCount, resetUnread } = useChat();
const { myUserId } = useGame();
const { localImpostorRole, gameState } = useGameState();

const inputValue = ref('');
const scrollContainer = ref<HTMLElement | null>(null);

const isImpostor = computed(() => localImpostorRole.value?.role === 'impostor');
const secretWord = computed(() => localImpostorRole.value?.word ?? null);

const spoilerDetected = computed(() => {
    if (!['ROLE_REVEAL', 'TYPING', 'VOTING'].includes(gameState.value.status) || gameState.value.config.mode !== 'IMPOSTOR') return false;
    if (isImpostor.value || !secretWord.value) return false;
    return isSpoiler(inputValue.value, secretWord.value);
});

const isSubmitDisabled = computed(() => {
    return props.isDisabled || !inputValue.value.trim() || spoilerDetected.value;
});

const handleSend = () => {
    if (isSubmitDisabled.value) return; // Preventivo

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
    <div class="flex flex-col h-full overflow-hidden bg-panel-base/50 backdrop-blur-2xl border-l-[4px] border-white/10 rounded-r-[2.5rem] border-y-0 lg:border-r-0">
        
        <!-- Header -->
        <div class="h-12 flex items-center px-4 bg-white/5 backdrop-blur-md border-b-[3px] border-white/10 shrink-0 justify-between">
            <h3 class="text-[11px] font-black text-ink-muted uppercase tracking-[0.2em] drop-shadow-sm">Sala de Chat</h3>
            <div v-if="unreadCount > 0" class="bg-action-error text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-glow-panic animate-bounce">
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
        <div class="p-4 bg-white/5 backdrop-blur-xl border-t-[3px] border-white/10 shrink-0">
            <div class="flex items-center gap-2">
                <input 
                    v-model="inputValue"
                    type="text" 
                    :placeholder="isDisabled ? '👻 Los fantasmas no hablan...' : 'Escribe un mensaje...'" 
                    :disabled="isDisabled"
                    class="flex-1 min-w-0 bg-white/10 backdrop-blur-md rounded-full px-5 py-3 text-sm text-ink-main font-black outline-none transition-all border-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)]"
                    :class="[
                        isDisabled ? 'placeholder-red-300 border-transparent' : 'placeholder-ink-muted/50 border-white/20 focus:border-action-primary focus:shadow-glow-primary',
                        spoilerDetected ? '!border-action-error !text-action-error focus:!shadow-glow-panic' : ''
                    ]"
                    @keydown.enter.prevent="handleSend"
                    @focus="handleFocus"
                />
                <button 
                    @click="handleSend" 
                    :disabled="isSubmitDisabled"
                    class="flex-none p-3.5 rounded-full shadow-glow-primary transition-all border-2 focus:outline-none flex items-center justify-center"
                    :class="[
                        spoilerDetected && !isDisabled
                            ? 'bg-action-error border-action-error text-white opacity-50 cursor-not-allowed shadow-none'
                            : 'bg-action-primary hover:bg-action-hover text-ink-base border-white/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-action-primary disabled:shadow-none'
                    ]"
                    aria-label="Enviar mensaje"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 translate-x-0.5">
                        <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
                    </svg>
                </button>
            </div>

            <!-- Anti-Spoiler Feedback Msg for Chat -->
            <div v-if="spoilerDetected" class="text-[10px] font-black text-action-error mt-2 text-center uppercase tracking-widest animate-pulse">
                🚨 No puedes revelar la palabra
            </div>
            <div v-else-if="!isDisabled" class="text-[10px] font-bold text-ink-soft mt-2 text-center uppercase tracking-widest hidden sm:block">
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
