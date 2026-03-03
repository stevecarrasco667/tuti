<script setup lang="ts">
import VoteSwitch from './VoteSwitch.vue';

defineProps<{
    playerName: string;
    playerAvatar: string;
    word: string;
    isDuplicate: boolean;
    isAutoValidated: boolean;
    isRejected: boolean;
    isApproved: boolean;
    voteCount: number;
    // self handling
    isMe: boolean;
    selfStatusIcon: string;
    // V-model support
    modelValue: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'vote'): void;
}>();
</script>

<template>
    <div class="bg-panel-card rounded-2xl w-full h-full min-h-[100px] flex flex-col overflow-hidden transition-all duration-500 p-2.5 md:p-3"
         :class="[
            isAutoValidated
                ? 'border border-amber-500/30 shadow-[0_0_30px_-5px_rgba(251,191,36,0.25)]'
                : isRejected || !isApproved
                    ? 'border border-red-900/50 shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)]'
                    : isDuplicate
                        ? 'border border-amber-900/50 shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)]'
                        : 'border border-white/5 shadow-2xl'
         ]">

        <!-- ROW 1: Avatar + Nombre (inline, flow normal) -->
        <div class="flex-none flex items-center gap-2 mb-1">
            <span class="text-base md:text-lg leading-none drop-shadow-md flex-shrink-0">{{ playerAvatar || '👤' }}</span>
            <span class="text-[10px] md:text-xs font-bold text-ink-muted drop-shadow-md truncate">{{ playerName }}</span>
            <span v-if="isAutoValidated" class="text-xs flex-shrink-0 ml-auto">🛡️</span>
        </div>

        <!-- ROW 2: La Palabra (flex-1, centrada, protagonista) -->
        <div class="flex-1 flex flex-col items-center justify-center w-full px-2 min-h-0">
            <span class="font-black text-center uppercase tracking-wide break-words break-all line-clamp-2 drop-shadow-xl transition-all duration-300 text-[clamp(1rem,3.5cqw,2rem)] md:text-[clamp(1.2rem,2.5vw,2.5rem)] leading-tight"
                  :class="[
                      isRejected || !isApproved
                          ? 'line-through opacity-40 text-red-400'
                          : isAutoValidated
                              ? 'text-amber-300'
                              : isDuplicate
                                  ? 'text-action-warning'
                                  : 'text-ink-main'
                  ]">
                {{ word || '—' }}
            </span>

            <span v-if="isDuplicate"
                  class="mt-1.5 text-[8px] md:text-[10px] font-bold bg-action-warning/20 text-action-warning px-2 py-0.5 rounded-full border border-action-warning/30 uppercase tracking-widest">
                Repetida
            </span>
        </div>

        <!-- ROW 3: Switch de Votación (inline, flow normal, SIEMPRE visible) -->
        <div class="flex-none flex flex-col items-center justify-center gap-1 mt-1">
            <span v-if="voteCount > 0 && !isAutoValidated"
                  class="bg-action-warning text-ink-base border border-white/10 px-2 py-0.5 rounded-full text-[8px] md:text-[10px] font-black whitespace-nowrap shadow-sm">
                {{ voteCount }} 👎
            </span>

            <VoteSwitch
                v-if="!isMe"
                :model-value="modelValue"
                :is-auto-validated="isAutoValidated"
                :label="`Voto ${playerName}`"
                @update:model-value="(val: boolean) => emit('update:modelValue', val)"
            />
            <span v-else
                  class="text-lg md:text-xl drop-shadow-sm flex items-center justify-center bg-panel-input w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white/10">
                {{ selfStatusIcon }}
            </span>
        </div>

    </div>
</template>
