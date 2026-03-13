<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
    targetPlayerId: string;
    categoryId: string;
    /** Si true, el botón trigger es más pequeño (modo compacto) */
    isCompact?: boolean;
}>();

const emit = defineEmits<{
    (e: 'react', emoji: string, targetId: string, catId: string): void
}>();

const isOpen = ref(false);
const EMOJIS = ['😂', '💀', '🤡', '🤯', '❤️', '👍'];

const sendReaction = (emoji: string) => {
    emit('react', emoji, props.targetPlayerId, props.categoryId);
    isOpen.value = false;
};

const close = () => {
    isOpen.value = false;
};
</script>

<template>
    <!--
      v-click-outside alternativa: cerramos con @blur en el div focusable.
      El popover abre hacia ARRIBA (bottom-full mb-2) en lugar de hacia los lados,
      así nunca invade otras tarjetas horizontales vecinas.
    -->
    <div class="relative inline-flex" @mouseleave="close">

        <!-- Botón Trigger -->
        <button
            @click.stop.prevent="isOpen = !isOpen"
            class="flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 active:scale-90 transition-all text-white/40 hover:text-white"
            :class="isCompact ? 'w-5 h-5' : 'w-6 h-6'"
            title="Añadir reacción"
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                 :class="isCompact ? 'w-3 h-3' : 'w-4 h-4'">
                <path fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm4.5 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm-1.5 6.25a4.249 4.249 0 01-3.268-1.53.75.75 0 111.136-1.04 2.748 2.748 0 004.264 0 .75.75 0 111.136 1.04A4.249 4.249 0 019.75 15.5z"
                    clip-rule="evenodd" />
            </svg>
        </button>

        <!-- Popover abre hacia ARRIBA — z-[60] para superar stacking contexts de columnas vecinas -->
        <Transition
            enter-active-class="transition ease-out duration-150"
            enter-from-class="opacity-0 scale-95 translate-y-1"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition ease-in duration-100"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-1"
        >
            <div
                v-if="isOpen"
                class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[60]
                       flex items-center gap-1 p-1.5
                       bg-panel-card border border-white/15
                       rounded-full shadow-2xl backdrop-blur-md"
                @click.stop
            >
                <button
                    v-for="emj in EMOJIS"
                    :key="emj"
                    @click.stop.prevent="sendReaction(emj)"
                    class="flex items-center justify-center hover:bg-white/10 rounded-full transition-transform hover:scale-125 active:scale-95"
                    :class="isCompact ? 'w-7 h-7 text-base' : 'w-8 h-8 text-lg'"
                >
                    {{ emj }}
                </button>
            </div>
        </Transition>

    </div>
</template>
