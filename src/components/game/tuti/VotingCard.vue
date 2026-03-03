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
    <div class="bg-panel-card rounded-2xl w-full h-full min-h-[280px] flex flex-col relative overflow-hidden transition-all duration-500"
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
        <div class="absolute top-4 left-4 flex items-center gap-2 z-10 max-w-[calc(100%-2rem)]">
            <span class="text-xl leading-none drop-shadow-md flex-shrink-0">{{ playerAvatar || '👤' }}</span>
            <span class="text-xs font-bold text-ink-muted drop-shadow-md truncate">{{ playerName }}</span>
            <span v-if="isAutoValidated" class="text-sm flex-shrink-0">🛡️</span>
        </div>

        <!-- ══ DEAD CENTER: La Palabra (Protagonista Absoluto) ══ -->
        <div class="flex-1 flex flex-col items-center justify-center w-full px-6 z-0 mt-8 mb-16">
            <span class="text-4xl md:text-5xl lg:text-6xl font-black text-center uppercase tracking-wide break-words break-all line-clamp-2 drop-shadow-xl transition-all duration-300"
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
                  class="mt-4 text-xs font-bold bg-action-warning/20 text-action-warning px-3 py-1 rounded-full border border-action-warning/30 uppercase tracking-widest">
                Palabra Repetida
            </span>
        </div>

        <!-- ══ POLO SUR: Pedestal de Votación (Anclado Absoluto) ══ -->
        <div class="absolute bottom-4 left-0 w-full flex flex-col items-center justify-center z-10 gap-1.5 px-4">
            <!-- Badge Votos Negativos -->
            <span v-if="voteCount > 0 && !isAutoValidated"
                  class="bg-action-warning text-ink-base border border-white/10 px-2 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap shadow-sm">
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
                  class="text-2xl drop-shadow-sm flex items-center justify-center bg-panel-input w-11 h-11 rounded-full border-2 border-white/10">
                {{ selfStatusIcon }}
            </span>
        </div>

    </div>
</template>
