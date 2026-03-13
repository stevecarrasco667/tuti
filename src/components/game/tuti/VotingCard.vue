<script setup lang="ts">
import VoteSwitch from './VoteSwitch.vue';
import ReactionMenu from '../ReactionMenu.vue';
import ReactionBar from '../ReactionBar.vue';

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
    // Phase 3+4: compact mode for 7+ players
    isCompact?: boolean;
    // Phase 9 (refactored): Persistent reaction counters
    playerId: string;
    categoryId: string;
    reactionCounts: Record<string, number>;  // emoji → count (from useReactions.getCountsForTarget)
    reactionBursts: Array<{ id: string; emoji: string; offsetX: number }>; // from useReactions.getBurstsForTarget
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'vote'): void;
    (e: 'react', emoji: string, targetId: string, catId: string): void;
}>();
</script>

<template>
    <!-- No overflow-hidden en el contenedor raíz: permite que el popover salga hacia arriba -->
    <div
        class="bg-panel-card rounded-2xl w-full flex flex-col transition-all duration-500 [container-type:inline-size]"
        :class="[
            isCompact ? 'p-2 min-h-[130px] max-h-[240px]' : 'p-2.5 md:p-3 min-h-[160px] max-h-[340px]',
            isAutoValidated
                ? 'border border-amber-500/30 shadow-[0_0_30px_-5px_rgba(251,191,36,0.25)]'
                : isRejected || !isApproved
                    ? 'border border-red-900/50 shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)]'
                    : isDuplicate
                        ? 'border border-amber-900/50 shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)]'
                        : 'border border-white/5 shadow-2xl'
        ]"
    >

        <!-- ROW 1 — Avatar + Nombre -->
        <div class="flex-none flex items-center gap-2 mb-2">
            <span class="leading-none drop-shadow-md flex-shrink-0"
                  :class="isCompact ? 'text-sm' : 'text-base md:text-lg'">
                {{ playerAvatar || '👤' }}
            </span>
            <span class="text-xs font-black text-ink-main drop-shadow-md truncate"
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
                    isCompact
                        ? 'text-[clamp(0.875rem,9cqi,2rem)] line-clamp-2'
                        : 'text-[clamp(1.25rem,10cqi,3.5rem)] line-clamp-2',
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

            <!-- Phase 9: Burst de animación (solo visual, 1.5s, posición fija en datos) -->
            <div class="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                <TransitionGroup name="burst">
                    <span
                        v-for="b in reactionBursts"
                        :key="b.id"
                        class="absolute bottom-0 font-emoji"
                        :class="isCompact ? 'text-2xl' : 'text-4xl'"
                        :style="{ left: `${b.offsetX}%` }"
                    >
                        {{ b.emoji }}
                    </span>
                </TransitionGroup>
            </div>
        </div>

        <!-- ROW 3 — ReactionBar + Trigger (inline) -->
        <div class="flex-none flex items-center gap-1.5 mt-1.5 min-h-[22px]" v-if="!isMe && word">
            <ReactionBar
                :counts="reactionCounts"
                :is-compact="isCompact"
                class="flex-1 min-w-0"
            />
            <ReactionMenu
                :target-player-id="playerId"
                :category-id="categoryId"
                :is-compact="isCompact"
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
                :is-compact="isCompact"
                :label="`Voto ${playerName}`"
                @update:model-value="(val: boolean) => emit('update:modelValue', val)"
            />
            <span v-else
                  class="drop-shadow-sm flex items-center justify-center bg-panel-input rounded-full border-2 border-white/10"
                  :class="isCompact ? 'w-7 h-7 text-base' : 'w-8 h-8 md:w-10 md:h-10 text-lg md:text-xl'">
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
