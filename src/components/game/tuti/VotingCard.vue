<script setup lang="ts">
import { computed } from 'vue';
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
    cardSize?: CardSize;
    playerId: string;
    categoryId: string;
    reactionCounts: Record<string, number>;
    reactionBursts: Array<{ id: string; emoji: string; offsetX: number }>;
    isSpectator?: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'vote'): void;
    (e: 'react', emoji: string, targetId: string, catId: string): void;
}>();

const sizeConfig = computed(() => {
    const s = props.cardSize ?? 'md';
    return {
        card:    s === 'xl' ? 'p-4 md:p-6 min-h-[300px] md:min-h-[340px]'
               : s === 'lg' ? 'p-4 md:p-5 min-h-[240px] md:min-h-[280px]'
               : s === 'md' ? 'p-3 md:p-4 min-h-[160px]'
                            : 'p-3 min-h-[140px]',
        avatar:  s === 'xl' ? 'text-2xl'
               : s === 'lg' ? 'text-xl'
               : s === 'md' ? 'text-base md:text-lg'
                            : 'text-sm',
        name:    s === 'xl' ? 'text-sm md:text-base'
               : s === 'lg' ? 'text-xs md:text-sm'
                            : 'text-xs',
        word:    s === 'xl' ? 'text-[clamp(2rem,14cqi,5rem)]'
               : s === 'lg' ? 'text-[clamp(1.5rem,11cqi,4rem)]'
               : s === 'md' ? 'text-[clamp(1.25rem,10cqi,3.5rem)]'
                            : 'text-[clamp(0.875rem,9cqi,2rem)]',
        selfIcon: s === 'xl' ? 'w-12 h-12 text-2xl'
                : s === 'lg' ? 'w-10 h-10 text-xl'
                : s === 'md' ? 'w-8 h-8 md:w-10 md:h-10 text-lg md:text-xl'
                             : 'w-7 h-7 text-base',
        burst:   s === 'sm' ? 'text-2xl' : 'text-4xl',
        isCompact: s === 'sm',
    };
});
</script>

<template>
    <div
        class="backdrop-blur-md rounded-[2.5rem] w-full flex flex-col transition-all duration-300 [container-type:inline-size] border-2"
        :class="[
            sizeConfig.card,
            isAutoValidated
                ? 'bg-game-yellow/10 border-game-yellow/50 shadow-3d-yellow'
                : isRejected || !isApproved
                    ? 'bg-game-red/5 border-game-red/30 shadow-[0_4px_0_rgba(239,68,68,0.2)] opacity-90 scale-[0.98]'
                    : isDuplicate
                        ? 'bg-game-yellow/10 border-game-yellow/50 shadow-3d-yellow'
                        : 'bg-panel-card border-white/10 shadow-3d-panel hover:-translate-y-1'
        ]"
    >
        <!-- ROW 1 — Avatar + Nombre -->
        <div class="flex-none flex items-center gap-2 mb-2">
            <span class="leading-none drop-shadow-sm flex-shrink-0" :class="sizeConfig.avatar">
                {{ playerAvatar || '👤' }}
            </span>
            <span class="font-black text-ink-main drop-shadow-sm truncate tracking-wide" :class="sizeConfig.name"
                  :title="playerName">
                {{ playerName }}
            </span>
            <span v-if="isAutoValidated" class="text-xs flex-shrink-0 ml-auto">🛡️</span>
        </div>

        <!-- ROW 2 — La Palabra (Burbuja Soft-Pop) -->
        <div class="relative flex-1 flex flex-col items-center justify-center w-full px-2 min-h-0 bg-panel-input/50 rounded-2xl border border-white/5 my-1">
            <span
                class="font-heading font-black text-center uppercase break-words break-all drop-shadow-sm transition-all duration-300 leading-tight"
                :class="[
                    sizeConfig.word,
                    'line-clamp-2',
                    isRejected || !isApproved
                        ? 'line-through opacity-50 text-game-red'
                        : isAutoValidated
                            ? 'text-game-yellow'
                            : isDuplicate
                                ? 'text-game-yellow'
                                : 'text-ink-main'
                ]"
            >
                {{ word || '—' }}
            </span>

            <span v-if="isDuplicate"
                  class="mt-1 text-[8px] md:text-[10px] font-black bg-game-yellow/20 text-game-yellow px-3 py-0.5 rounded-full uppercase tracking-widest">
                Repetida
            </span>

            <!-- Burst de animación (solo visual, 1.5s) -->
            <div class="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
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
        <div class="flex-none flex items-center gap-1.5 mt-2 min-h-[22px]" v-if="word">
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

        <!-- ROW 4 — Sellos de Goma (Soft-Pop) -->
        <div class="flex-none flex items-center justify-center gap-3 mt-3 relative">
            <span v-if="voteCount > 0 && !isAutoValidated"
                  class="absolute left-0 bg-game-red text-white px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-black shadow-sm">
                {{ voteCount }} 👎
            </span>

            <template v-if="!isMe && !isAutoValidated">
                <!-- Sello Rechazar -->
                <button
                    @click="emit('update:modelValue', false)"
                    class="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-xl transition-all duration-75"
                    :class="!modelValue 
                        ? 'bg-game-red text-white shadow-none translate-y-[4px]' 
                        : 'bg-panel-input border-2 border-white/10 text-ink-muted hover:bg-game-red/20 shadow-sm hover:-translate-y-1 hover:shadow-3d-red'"
                    :disabled="isSpectator"
                >
                    ❌
                </button>
                
                <!-- Sello Aprobar -->
                <button
                    @click="emit('update:modelValue', true)"
                    class="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-xl transition-all duration-75"
                    :class="modelValue 
                        ? 'bg-game-green text-white shadow-none translate-y-[4px]' 
                        : 'bg-panel-input border-2 border-white/10 text-ink-muted hover:bg-game-green/20 shadow-sm hover:-translate-y-1 hover:shadow-3d-green'"
                    :disabled="isSpectator"
                >
                    ✅
                </button>
            </template>
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
