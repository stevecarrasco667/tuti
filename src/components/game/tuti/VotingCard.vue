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
    <!-- ╔══════════════════════════════════════════════════════╗ -->
    <!-- ║   CONTENEDOR PRINCIPAL — Líquido, Absoluto, Oscuro  ║ -->
    <!-- ╚══════════════════════════════════════════════════════╝ -->
    <div class="bg-panel-card rounded-2xl w-full h-full min-h-[140px] flex flex-col relative overflow-hidden transition-all duration-500"
         :class="[
            isAutoValidated
                ? 'border border-amber-500/30 shadow-[0_0_30px_-5px_rgba(251,191,36,0.25)]'
                : isRejected || !isApproved
                    ? 'border border-red-900/50 shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)]'
                    : isDuplicate
                        ? 'border border-amber-900/50 shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)]'
                        : 'border border-white/5 shadow-2xl'
         ]">

        <!-- ══ POLO NORTE: Header Flotante (Avatar + Nombre) ══ -->
        <div class="absolute top-2 md:top-3 left-3 flex items-center gap-2 z-10 max-w-[calc(100%-1.5rem)]">
            <span class="text-base md:text-xl leading-none drop-shadow-md flex-shrink-0">{{ playerAvatar || '👤' }}</span>
            <span class="text-[10px] md:text-xs font-bold text-ink-muted drop-shadow-md truncate">{{ playerName }}</span>
            <span v-if="isAutoValidated" class="text-xs md:text-sm flex-shrink-0">🛡️</span>
        </div>

        <!-- ══ DEAD CENTER: La Palabra (Protagonista Absoluto) ══ -->
        <div class="flex-1 flex flex-col items-center justify-center w-full px-4 z-0 mt-6 mb-12 md:mt-8 md:mb-14">
            <span class="font-black text-center uppercase tracking-wide break-words break-all line-clamp-2 drop-shadow-xl transition-all duration-300 text-[clamp(1.2rem,4cqw,2.5rem)] md:text-[clamp(1.5rem,3vw,3.75rem)] leading-tight"
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

            <!-- Badge Duplicado (integrado en el centro) -->
            <span v-if="isDuplicate"
                  class="mt-2 md:mt-3 text-[9px] md:text-xs font-bold bg-action-warning/20 text-action-warning px-2.5 py-0.5 md:px-3 md:py-1 rounded-full border border-action-warning/30 uppercase tracking-widest">
                Repetida
            </span>
        </div>

        <!-- ══ POLO SUR: Pedestal de Votación (Anclado Absoluto) ══ -->
        <div class="absolute bottom-2 md:bottom-3 left-0 w-full flex flex-col items-center justify-center z-10 gap-1 px-2">
            <!-- Badge Votos Negativos -->
            <span v-if="voteCount > 0 && !isAutoValidated"
                  class="bg-action-warning text-ink-base border border-white/10 px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-black whitespace-nowrap shadow-sm">
                {{ voteCount }} 👎
            </span>

            <!-- VoteSwitch (otros) o Self-Indicator (yo) -->
            <VoteSwitch
                v-if="!isMe"
                :model-value="modelValue"
                :is-auto-validated="isAutoValidated"
                :label="`Voto ${playerName}`"
                @update:model-value="(val: boolean) => emit('update:modelValue', val)"
            />
            <span v-else
                  class="text-xl md:text-2xl drop-shadow-sm flex items-center justify-center bg-panel-input w-9 h-9 md:w-11 md:h-11 rounded-full border-2 border-white/10">
                {{ selfStatusIcon }}
            </span>
        </div>

    </div>
</template>
