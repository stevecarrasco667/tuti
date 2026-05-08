<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    round: number;
    totalRounds: number;
    currentLetter: string | null;
    timeLeft: number | null;
    timerColor: string;
    status: string;
}>();

defineEmits<{
    (e: 'exit'): void;
}>();

// --- TIMER STATE (Soft-Pop 3-level urgency) ---
const timerState = computed(() => {
    const t = props.timeLeft;
    if (t === null) return 'idle';
    if (t > 20) return 'safe';
    if (t > 10) return 'warning';
    if (t > 5)  return 'panic';
    return 'critical';
});

const timerClasses = computed(() => {
    switch (timerState.value) {
        case 'safe':    return 'bg-game-yellow text-panel-base shadow-3d-yellow';
        case 'warning': return 'bg-game-red/80 text-white shadow-3d-red scale-105';
        case 'panic':   return 'bg-game-red text-white shadow-3d-red scale-110';
        case 'critical':return 'bg-game-red text-white shadow-3d-red scale-110 animate-heartbeat';
        default:        return 'bg-panel-card text-ink-muted shadow-3d-panel';
    }
});
</script>

<template>
    <div class="w-full lg:max-w-[1600px] lg:mx-auto lg:grid lg:gap-8 pointer-events-none z-40 relative mt-4"
         :class="status === 'PLAYING' ? 'lg:grid-cols-[280px_1fr_200px]' : 'lg:grid-cols-[1fr_200px]'">
         
        <!-- Left Dummy Column (Only for PLAYING phase) -->
        <div v-if="status === 'PLAYING'" class="hidden lg:block w-full"></div>

        <!-- Center Active Column -->
        <div class="flex-none h-16 flex items-center justify-between px-2 md:px-0 relative w-full pointer-events-none">
            
            <!-- Left: Exit & Round (Soft-Pop Pill) -->
            <div class="flex items-center gap-3 md:gap-4 w-auto bg-panel-card/80 backdrop-blur-md px-2 py-1.5 md:px-3 md:py-2 rounded-2xl shadow-3d-panel pointer-events-auto">
                <!-- Exit Button -->
                <button 
                    @click="$emit('exit')"
                    class="text-ink-soft hover:text-white transition-all p-1.5 md:p-2 bg-panel-input rounded-xl shadow-3d-panel border border-white/5 active:translate-y-[3px] active:shadow-none"
                    title="Salir"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="size-5 md:size-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                    </svg>
                </button>

                <div class="flex flex-col pr-2 md:pr-4">
                    <span class="text-[9px] md:text-[10px] uppercase font-black text-ink-muted tracking-widest leading-none mb-0.5">Ronda</span>
                    <span class="text-base md:text-xl font-heading font-black text-ink-main leading-none">
                        {{ round }}<span class="text-[10px] md:text-xs text-ink-soft ml-0.5">/{{ totalRounds }}</span>
                    </span>
                </div>
            </div>

            <!-- Center: THE LETTER BADGE (Soft-Pop Bouncy Circle) -->
            <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                <div class="w-14 h-14 md:w-16 md:h-16 rounded-full
                            bg-game-yellow shadow-3d-yellow
                            flex items-center justify-center
                            transition-all duration-300">
                    <span class="text-3xl md:text-4xl font-heading font-black text-panel-base drop-shadow-sm">
                        {{ currentLetter }}
                    </span>
                </div>
            </div>

            <!-- Right: Timer (Soft-Pop — cambia de color según urgencia) -->
            <div class="flex items-center pointer-events-auto rounded-2xl px-4 py-2 transition-all duration-300"
                 :class="timerClasses">
                <div v-if="timeLeft !== null" class="flex items-center gap-2">
                    <span class="text-sm">⏱️</span>
                    <span class="font-mono text-lg md:text-xl font-black leading-none tabular-nums">
                        {{ timeLeft }}
                    </span>
                </div>
                <span v-else class="text-lg md:text-xl font-black opacity-50">--</span>
            </div>
        </div>

        <!-- Right Dummy Column (Chat space) -->
        <div class="hidden lg:block w-full"></div>
    </div>
</template>

<style scoped>
@keyframes heartbeat {
    0%, 100% { transform: scale(1.1); }
    15% { transform: scale(1.3); }
    30% { transform: scale(1.1); }
    45% { transform: scale(1.3); }
    60% { transform: scale(1.1); }
}
.animate-heartbeat {
    animation: heartbeat 1s ease-in-out infinite;
}
</style>
