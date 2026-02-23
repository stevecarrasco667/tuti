<script setup lang="ts">
import { ref, watch } from 'vue';
import { useChat } from '../../composables/useChat';
import ChatWidget from './ChatWidget.vue';

const props = defineProps<{
    isDisabled?: boolean;
}>();

const isOpen = ref(false);
const { unreadCount, resetUnread } = useChat();

// Clear unreads when opening
watch(isOpen, (val) => {
    if (val) {
        resetUnread();
    }
});

// Watch unreads while open to clear them immediately (prevent badge while viewing)
watch(unreadCount, (val) => {
    if (isOpen.value && val > 0) {
        resetUnread();
    }
});

const close = () => {
    isOpen.value = false;
};
</script>

<template>
    <div>
        <!-- FAB (Floating Action Button) -->
        <Transition name="fade">
            <button 
                v-if="!isOpen"
                @click="isOpen = true"
                class="fixed bottom-4 left-4 z-40 w-12 h-12 bg-indigo-600 rounded-full shadow-lg border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Abrir chat"
            >
                <span class="text-xl">💬</span>
                
                <!-- Notification Badge -->
                <div v-if="unreadCount > 0" class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm animate-bounce">
                    {{ unreadCount > 9 ? '9+' : unreadCount }}
                </div>
            </button>
        </Transition>

        <!-- Overlay -->
        <Transition name="fade">
            <div 
                v-if="isOpen" 
                class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                @click="close"
            ></div>
        </Transition>

        <!-- Drawer -->
        <Transition name="slide-up">
            <div 
                v-if="isOpen"
                class="fixed bottom-0 left-0 right-0 h-[65vh] bg-gray-900 rounded-t-2xl shadow-2xl z-50 overflow-hidden flex flex-col border-t border-white/10"
            >
                <!-- Drawer Handle / Header -->
                <div class="h-10 bg-black/20 shrink-0 flex items-center justify-center relative cursor-pointer" @click="close">
                    <!-- Pill Handle -->
                    <div class="w-12 h-1 bg-white/20 rounded-full"></div>
                    
                    <!-- Close Button -->
                    <button class="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2" @click="close">
                        ✕
                    </button>
                </div>

                <!-- Chat Content -->
                <ChatWidget class="flex-1 w-full" :is-disabled="isDisabled" />
            </div>
        </Transition>
    </div>
</template>
