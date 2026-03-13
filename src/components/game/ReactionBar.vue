<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    counts: Record<string, number>;
    /** Si true, usa tamaños más pequeños (modo compacto ≥7 jugadores) */
    isCompact?: boolean;
}>();

// Solo emojis con al menos 1 reacción, ordenados por count descendente
const entries = computed(() =>
    Object.entries(props.counts)
        .filter(([, n]) => n > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
);
</script>

<template>
    <!-- 
      min-h garantiza que la fila exista aunque esté vacía,
      evitando que el layout "salte" al llegar la primera reacción.
      flex-wrap impide el desbordamiento horizontal.
    -->
    <div
        class="flex flex-wrap items-center gap-1 transition-all duration-300"
        :class="isCompact ? 'min-h-[18px]' : 'min-h-[22px]'"
        aria-label="Reacciones"
    >
        <TransitionGroup name="badge">
            <span
                v-for="[emoji, count] in entries"
                :key="emoji"
                class="inline-flex items-center gap-0.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full font-black select-none transition-all duration-200"
                :class="isCompact
                    ? 'text-[10px] px-1.5 py-0'
                    : 'text-xs px-2 py-0.5'"
            >
                <span>{{ emoji }}</span>
                <span class="text-ink-muted">{{ count }}</span>
            </span>
        </TransitionGroup>
    </div>
</template>

<style scoped>
/* Animación de entrada del badge (escala desde pequeño) */
.badge-enter-active { transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
.badge-enter-from   { opacity: 0; transform: scale(0.6); }
.badge-enter-to     { opacity: 1; transform: scale(1); }
/* El contador que aumenta: leve bump de escala */
.badge-move         { transition: all 0.2s ease; }
.badge-leave-active { transition: all 0.15s ease-in; }
.badge-leave-to     { opacity: 0; transform: scale(0.8); }
</style>
