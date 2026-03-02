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
    <div class="bg-panel-card rounded-2xl shadow-warm border border-white/20 p-5 flex flex-col justify-between w-full h-full min-h-[260px] transition-transform hover:-translate-y-1 relative"
         :class="[
            isAutoValidated 
                ? 'bg-amber-900/30 border-amber-500/50 shadow-[0_4px_12px_rgba(251,191,36,0.1)]' 
                : isRejected 
                    ? 'bg-red-900/30 border-red-500/50 shadow-sm opacity-80' 
                    : !isApproved
                        ? 'bg-red-900/30 border-red-500/50 shadow-sm'
                        : 'bg-panel-card border-white/10 shadow-sm hover:shadow-md'
         ]">

        <!-- TOP: Avatar y Nombre -->
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full border-2 border-white/10 flex items-center justify-center bg-panel-input shadow-sm shrink-0">
                <span class="text-xl leading-none">{{ playerAvatar || '👤' }}</span>
            </div>
            <div class="flex flex-col min-w-0">
                <span class="text-sm font-black uppercase tracking-widest truncate"
                      :class="isAutoValidated ? 'text-amber-400' : 'text-ink-muted'">
                    {{ playerName }}
                </span>
            </div>
            <div v-if="isAutoValidated" class="ml-auto flex-shrink-0">
                🛡️
            </div>
        </div>

        <!-- MID: Palabra Escrita Gigante -->
        <div class="flex-1 flex flex-col items-center justify-center min-h-[100px] my-4">
            <p class="text-2xl md:text-3xl font-black text-center break-words break-all line-clamp-2 overflow-hidden leading-tight"
                :class="[
                    isAutoValidated
                        ? 'text-amber-400'
                        : isRejected || !isApproved
                            ? 'line-through opacity-40 text-red-400'
                            : isDuplicate
                                ? 'text-action-warning'
                                : 'text-blue-400'
                ]">
                {{ word || '—' }}
            </p>
            
            <div v-if="isDuplicate" class="mt-2 text-yellow-500 text-[10px] font-black uppercase tracking-widest bg-yellow-900/30 px-2 py-0.5 rounded-full border border-yellow-500/50">
                Repetida
            </div>
        </div>

        <!-- BOT: Votaciones y Acciones -->
        <div class="mt-auto pt-4 border-t-2 border-white/10 relative flex justify-center items-center">
            <!-- Badge Votos Negativos -->
            <span v-if="voteCount > 0 && !isAutoValidated"
                class="absolute -top-3 left-1/2 -translate-x-1/2 bg-action-warning text-ink-base border-2 border-white/10 px-2 py-0.5 rounded-full text-[10px] font-black shadow-sm z-10 whitespace-nowrap">
                {{ voteCount }} 👎
            </span>
            
            <!-- VoteSwitch (Otros) o SelfIndicator (Yo) -->
            <VoteSwitch
                v-if="!isMe"
                :model-value="modelValue"
                :is-auto-validated="isAutoValidated"
                :label="`Voto ${playerName}`"
                @update:model-value="(val: boolean) => emit('update:modelValue', val)"
            />
            <span v-else class="text-2xl drop-shadow-sm flex items-center justify-center bg-panel-input w-11 h-11 rounded-full border-2 border-white/10">
                {{ selfStatusIcon }}
            </span>
        </div>

    </div>
</template>
