<script setup lang="ts">
defineProps<{
    round: number;
    totalRounds: number;
    currentLetter: string | null;
    timeLeft: number | null;
    timerColor: string;
}>();
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineEmits<{
    (e: 'exit'): void;
}>();
</script>

<template>
    <div class="flex-none h-16 bg-panel-card/20 backdrop-blur-md border-b border-white/20 flex items-center justify-between px-4 z-40 relative">
            
        <!-- Left: Exit & Round -->
        <div class="flex items-center gap-4">
            <!-- Exit Button -->
            <button @click="$emit('exit')" class="text-white/60 hover:text-white transition-colors p-1" :title="t('gameHUD.exit')">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
            </button>

            <div class="flex flex-col">
                <span class="text-[10px] uppercase font-bold text-ink-muted tracking-widest">{{ t('gameHUD.round') }}</span>
                <span class="text-xl font-black text-ink-main leading-none">
                    {{ round }}<span class="text-xs text-ink-soft ml-0.5">/{{ totalRounds }}</span>
                </span>
            </div>
        </div>

        <!-- Center: THE BADGE (Current Letter) -->
        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div class="relative group">
                <div class="absolute inset-0 bg-white/20 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
                <div class="relative bg-white/10 backdrop-blur-md border border-white/20 text-ink-main w-14 h-14 rounded-full flex items-center justify-center shadow-glow-primary transform transition-transform duration-300 group-hover:scale-105">
                    <span class="text-4xl font-black text-ink-main drop-shadow-md">{{ currentLetter }}</span>
                </div>
            </div>
        </div>

        <!-- Right: Timer -->
        <div class="flex flex-col items-end w-[60px]">
            <span v-if="timeLeft !== null" 
                  class="font-mono text-xl font-bold leading-none tabular-nums"
                  :class="timerColor"
             >
                {{ timeLeft }}
            </span>
            <span v-else class="text-xl font-bold text-ink-muted">--</span>
        </div>
    </div>
</template>
