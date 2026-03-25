<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
    mode: 'CLASSIC' | 'IMPOSTOR';
}>();

const emit = defineEmits<{
    (e: 'close'): void;
}>();

// Datos de tutoriales por modo
const tutorials = {
    CLASSIC: {
        emoji: '✏️',
        title: 'Tuti Fruti — Clásico',
        color: 'text-action-primary',
        border: 'border-action-primary/40',
        bg: 'bg-action-primary/10',
        steps: [
            { icon: '✏️', text: 'Escribe palabras que empiecen con la letra del turno' },
            { icon: '🛑', text: 'Presiona BASTA cuando termines para parar la ronda' },
            { icon: '⚖️', text: 'Vota en el Tribunal: ¿válida o inválida?' },
            { icon: '🏆', text: 'El que más puntos acumule en todas las rondas gana' },
        ]
    },
    IMPOSTOR: {
        emoji: '🕵️',
        title: 'El Impostor',
        color: 'text-action-error',
        border: 'border-action-error/40',
        bg: 'bg-action-error/10',
        steps: [
            { icon: '🕵️', text: 'Un jugador secreto es el Impostor (no sabe la palabra)' },
            { icon: '💬', text: 'Describe la categoría sin revelar la palabra secreta' },
            { icon: '🗳️', text: 'Vota para encontrar al culpable en El Tribunal' },
            { icon: '🎭', text: 'El Impostor puede adivinar la palabra para ganar en el último momento' },
        ]
    }
};

const data = ref(tutorials[props.mode]);
</script>

<template>
    <!-- Portal al body para evitar conflictos de z-index -->
    <Teleport to="body">
        <Transition name="tutorial-modal">
            <!-- Fondo oscuro clicable para cerrar -->
            <div
                class="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
                @click.self="emit('close')"
            >
                <!-- Overlay oscuro -->
                <div class="absolute inset-0 bg-violet-950/80 backdrop-blur-xl" @click="emit('close')" />

                <!-- Modal -->
                <div class="relative z-10 w-full max-w-sm rounded-3xl border-[3px] bg-panel-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden"
                     :class="data.border">

                    <!-- Header -->
                    <div class="p-5 pb-3 border-b-2 border-white/10 flex items-center justify-between"
                         :class="data.bg">
                        <div class="flex items-center gap-3">
                            <span class="text-3xl">{{ data.emoji }}</span>
                            <div>
                                <p class="text-[10px] font-black uppercase tracking-widest text-ink-muted">Cómo se juega</p>
                                <h3 class="text-lg font-black text-ink-main leading-none" :class="data.color">
                                    {{ data.title }}
                                </h3>
                            </div>
                        </div>
                        <!-- Botón cerrar -->
                        <button
                            @click="emit('close')"
                            class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-ink-muted transition-colors"
                            aria-label="Cerrar tutorial"
                        >
                            ✕
                        </button>
                    </div>

                    <!-- Viñetas -->
                    <div class="p-5 space-y-3">
                        <div
                            v-for="(step, i) in data.steps"
                            :key="i"
                            class="flex items-start gap-3 bg-panel-input/60 rounded-2xl p-3 border border-white/10"
                        >
                            <span class="text-2xl flex-none leading-none">{{ step.icon }}</span>
                            <p class="text-ink-main font-bold text-sm leading-snug">{{ step.text }}</p>
                        </div>
                    </div>

                    <!-- Footer CTA -->
                    <div class="px-5 pb-5">
                        <button
                            @click="emit('close')"
                            class="w-full py-3 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 border-[3px]"
                            :class="`${data.bg} ${data.border} ${data.color} hover:brightness-110`"
                        >
                            ¡Entendido, a jugar! {{ data.emoji }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.tutorial-modal-enter-active,
.tutorial-modal-leave-active {
    transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tutorial-modal-enter-from,
.tutorial-modal-leave-to {
    opacity: 0;
    transform: translateY(20px) scale(0.96);
}
</style>
