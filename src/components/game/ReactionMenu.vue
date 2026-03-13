<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
    targetPlayerId: string;
    categoryId: string;
}>();

const emit = defineEmits<{
    (e: 'react', emoji: string, targetId: string, catId: string): void
}>();

const isOpen = ref(false);
const EMOJIS = ['😂', '💀', '🤡', '🤯', '❤️'];

const sendReaction = (emoji: string) => {
    emit('react', emoji, props.targetPlayerId, props.categoryId);
    isOpen.value = false;
};

// Cierra automáticamente si hace clic fuera o pierde foco blur
const handleMouseLeave = () => {
    isOpen.value = false;
};

</script>

<template>
    <div class="relative inline-flex items-center" @mouseleave="handleMouseLeave">
        
        <!-- Botón Trigger -->
        <button 
            @click.stop.prevent="isOpen = !isOpen"
            class="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 transition-colors text-white/50 hover:text-white"
            title="Añadir reacción"
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm4.5 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm-1.5 6.25a4.249 4.249 0 01-3.268-1.53.75.75 0 111.136-1.04 2.748 2.748 0 004.264 0 .75.75 0 111.136 1.04A4.249 4.249 0 019.75 15.5z" clip-rule="evenodd" />
            </svg>
        </button>

        <!-- Popover Emojis -->
        <Transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="transform opacity-0 scale-95 -translate-y-2 translate-x-4"
            enter-to-class="transform opacity-100 scale-100 translate-y-0 translate-x-4"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="transform opacity-100 scale-100 translate-y-0 translate-x-4"
            leave-to-class="transform opacity-0 scale-95 -translate-y-2 translate-x-4"
        >
            <div 
                v-if="isOpen"
                class="absolute left-full top-1/2 -translate-y-1/2 ml-2 flex items-center gap-1 p-1.5 bg-panel-card rounded-full shadow-xl border border-white/10 backdrop-blur-md z-50"
            >
                <button
                    v-for="emj in EMOJIS"
                    :key="emj"
                    @click.stop.prevent="sendReaction(emj)"
                    class="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/10 rounded-full transition-transform hover:scale-125 active:scale-95"
                >
                    {{ emj }}
                </button>
            </div>
        </Transition>

    </div>
</template>
