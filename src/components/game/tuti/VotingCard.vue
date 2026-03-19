<script setup lang="ts">
import { computed } from 'vue';
import VoteSwitch from './VoteSwitch.vue';
import ReactionMenu from '../ReactionMenu.vue';
import ReactionBar from '../ReactionBar.vue';

type CardSize = 'xl' | 'lg' | 'md' | 'sm';

const props = defineProps<{
    playerName: string;
    playerAvatar: string;
    word: string;
    isDuplicate: boolean;
    isAutoValidated: boolean;
    isRejected: boolean;
    isApproved: boolean;
    voteCount: number;
    isMe: boolean;
    selfStatusIcon: string;
    modelValue: boolean;
    // Sistema de tamaño adaptativo por N jugadores
    cardSize?: CardSize;  // 'xl'=2p | 'lg'=3-4p | 'md'=5-6p | 'sm'=7-8p
    playerId: string;
    categoryId: string;
    reactionCounts: Record<string, number>;
    reactionBursts: Array<{ id: string; emoji: string; offsetX: number }>;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'vote'): void;
    (e: 'react', emoji: string, targetId: string, catId: string): void;
}>();

// Mapa cardSize → clases de estilo para cada zona de la tarjeta
const sizeConfig = computed(() => {
    const s = props.cardSize ?? 'md';
    return {
        // Contenedor principal
        card:    s === 'xl' ? 'p-4 md:p-5 min-h-[300px] md:min-h-[340px]'
               : s === 'lg' ? 'p-3 md:p-4 min-h-[240px] md:min-h-[280px]'
               : s === 'md' ? 'p-2.5 md:p-3 min-h-[160px]'
                            : 'p-2 min-h-[130px]',
        // Avatar emoji
        avatar:  s === 'xl' ? 'text-2xl'
               : s === 'lg' ? 'text-xl'
               : s === 'md' ? 'text-base md:text-lg'
                            : 'text-sm',
        // Nombre del jugador
        name:    s === 'xl' ? 'text-sm md:text-base'
               : s === 'lg' ? 'text-xs md:text-sm'
                            : 'text-xs',
        // Palabra (clamp responsivo a container-query)
        word:    s === 'xl' ? 'text-[clamp(2rem,14cqi,5rem)]'
               : s === 'lg' ? 'text-[clamp(1.5rem,11cqi,4rem)]'
               : s === 'md' ? 'text-[clamp(1.25rem,10cqi,3.5rem)]'
                            : 'text-[clamp(0.875rem,9cqi,2rem)]',
        // Icono propio (self-status)
        selfIcon: s === 'xl' ? 'w-12 h-12 text-2xl'
                : s === 'lg' ? 'w-10 h-10 text-xl'
                : s === 'md' ? 'w-8 h-8 md:w-10 md:h-10 text-lg md:text-xl'
                             : 'w-7 h-7 text-base',
        // Burst de reacciones
        burst:   s === 'sm' ? 'text-2xl' : 'text-4xl',
        isCompact: s === 'sm',
    };
});
</script>

<template>
    <!-- No overflow-hidden en el contenedor raíz: permite que el popover salga hacia arriba -->
    <div
        class="bg-panel-card backdrop-blur-xl rounded-[2.5rem] w-full flex flex-col transition-all duration-500 [container-type:inline-size]"
        :class="[
            sizeConfig.card,
            isAutoValidated
                ? 'border border-action-primary/50 shadow-glow-primary'
                : isRejected || !isApproved
                    ? 'border border-action-error/50 shadow-glow-panic'
                    : isDuplicate
                        ? 'border border-action-warning/50 shadow-glow-primary'
                        : 'border border-white/10 shadow-game-card'
        ]"
    >

        <!-- ROW 1 — Avatar + Nombre -->
        <div class="flex-none flex items-center gap-2 mb-2">
            <span class="leading-none drop-shadow-md flex-shrink-0" :class="sizeConfig.avatar">
                {{ playerAvatar || '👤' }}
            </span>
            <span class="font-black text-ink-main drop-shadow-md truncate" :class="sizeConfig.name"
                  :title="playerName">
                {{ playerName }}
            </span>
            <span v-if="isAutoValidated" class="text-xs flex-shrink-0 ml-auto">🛡️</span>
        </div>

        <!-- ROW 2 — La Palabra (protagonista) -->
        <div class="relative flex-1 flex flex-col items-center justify-center w-full px-1 min-h-0">
            <span
                class="font-black text-center uppercase tracking-wide break-words break-all drop-shadow-xl transition-all duration-300 leading-tight"
                :class="[
                    sizeConfig.word,
                    'line-clamp-2',
                    isRejected || !isApproved
                        ? 'line-through opacity-40 text-red-400'
                        : isAutoValidated
                            ? 'text-amber-300'
                            : isDuplicate
                                ? 'text-action-warning'
                                : 'text-ink-main'
                ]"
            >
                {{ word || '—' }}
            </span>

            <span v-if="isDuplicate"
                  class="mt-1 text-[8px] md:text-[10px] font-bold bg-action-warning/20 text-action-warning px-2 py-0.5 rounded-full border border-action-warning/30 uppercase tracking-widest">
                Repetida
            </span>

            <!-- Burst de animación (solo visual, 1.5s) -->
            <div class="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                <TransitionGroup name="burst">
                    <span
                        v-for="b in reactionBursts"
                        :key="b.id"
                        class="absolute bottom-0 font-emoji"
                        :class="sizeConfig.burst"
                        :style="{ left: `${b.offsetX}%` }"
                    >
                        {{ b.emoji }}
                    </span>
                </TransitionGroup>
            </div>
        </div>

        <!-- ROW 3 — ReactionBar + Trigger (inline) -->
        <div class="flex-none flex items-center gap-1.5 mt-1.5 min-h-[22px]" v-if="word">
            <ReactionBar
                :counts="reactionCounts"
                :is-compact="sizeConfig.isCompact"
                class="flex-1 min-w-0"
            />
            <ReactionMenu
                v-if="!isMe"
                :target-player-id="playerId"
                :category-id="categoryId"
                :is-compact="sizeConfig.isCompact"
                @react="(emj, tid, cid) => emit('react', emj, tid, cid)"
            />
        </div>

        <!-- ROW 4 — Switch o self-icon -->
        <div class="flex-none flex flex-col items-center justify-center gap-1 mt-2">
            <span v-if="voteCount > 0 && !isAutoValidated"
                  class="bg-action-warning text-ink-base border border-white/10 px-2 py-0.5 rounded-full text-[8px] md:text-[10px] font-black whitespace-nowrap shadow-sm">
                {{ voteCount }} 👎
            </span>

            <VoteSwitch
                v-if="!isMe"
                :model-value="modelValue"
                :is-auto-validated="isAutoValidated"
                :card-size="cardSize ?? 'md'"
                :label="`Voto ${playerName}`"
                @update:model-value="(val: boolean) => emit('update:modelValue', val)"
            />
            <span v-else
                  class="drop-shadow-sm flex items-center justify-center bg-panel-input rounded-full border-2 border-white/10"
                  :class="sizeConfig.selfIcon">
                {{ selfStatusIcon }}
            </span>
        </div>

    </div>
</template>

<style scoped>
.font-emoji { font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif; }

/* Burst: sube y desaparece en 1.5s */
.burst-enter-active {
    animation: burst-fly 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}
.burst-leave-active { transition: opacity 0.2s; }
.burst-leave-to { opacity: 0; }

@keyframes burst-fly {
    0%   { transform: translateY(0)   scale(0.6); opacity: 0; }
    15%  { transform: translateY(-10px) scale(1.3); opacity: 1; }
    80%  { transform: translateY(-60px) scale(1.2); opacity: 0.8; }
    100% { transform: translateY(-80px) scale(1.0); opacity: 0; }
}
</style>
