<script setup lang="ts">
defineProps<{
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
</script>

<template>
    <div class="w-full lg:max-w-[1600px] lg:mx-auto lg:grid lg:gap-8 pointer-events-none z-40 relative mt-4"
         :class="status === 'PLAYING' ? 'lg:grid-cols-[280px_1fr_200px]' : 'lg:grid-cols-[1fr_200px]'">
         
        <!-- Left Dummy Column (Only for PLAYING phase) -->
        <div v-if="status === 'PLAYING'" class="hidden lg:block w-full"></div>

        <!-- Center Active Column (1fr) -> Match game area exactly -->
        <div class="flex-none h-16 flex items-center justify-between px-2 md:px-0 relative w-full pointer-events-none">
            
            <!-- Left: Exit & Round (Holographic Pill) -->
            <div class="flex items-center gap-3 md:gap-4 w-auto bg-panel-card/80 backdrop-blur-md px-2 py-1.5 md:px-3 md:py-2 rounded-2xl border-2 border-white/10 shadow-lg pointer-events-auto">
                <!-- Exit Button -->
                <button @click="$emit('exit')" class="text-ink-soft hover:text-white transition-colors p-1.5 md:p-2 bg-panel-input rounded-xl shadow-sm border border-white/5 active:scale-95" title="Salir">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="size-5 md:size-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                    </svg>
                </button>

                <div class="flex flex-col pr-2 md:pr-4">
                    <span class="text-[9px] md:text-[10px] uppercase font-black text-ink-muted tracking-widest leading-none mb-0.5">Ronda</span>
                    <span class="text-base md:text-xl font-black text-ink-main leading-none">
                        {{ round }}<span class="text-[10px] md:text-xs text-ink-soft ml-0.5">/{{ totalRounds }}</span>
                    </span>
                </div>
            </div>

            <!-- Center: THE BADGE (Holographic Circle) -->
            <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                <div class="relative group">
                    <div class="absolute inset-0 bg-white/20 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
                    <div class="relative bg-panel-card border-2 border-white/20 text-ink-main w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-[0_0_30px_-5px_rgba(255,255,255,0.2)] transform transition-transform group-hover:scale-105">
                        <span class="text-3xl md:text-4xl font-black text-white drop-shadow-md">{{ currentLetter }}</span>
                    </div>
                </div>
            </div>

            <!-- Right: Timer (Holographic Pill) -->
            <div class="flex flex-col items-end w-auto bg-panel-card/80 backdrop-blur-md px-3 py-1.5 md:py-2 rounded-2xl border-2 border-white/10 shadow-lg pointer-events-auto">
                <div v-if="timeLeft !== null" class="flex items-center gap-1.5 md:gap-2">
                    <span class="text-xs md:text-sm">⏱️</span>
                    <span class="font-mono text-lg md:text-xl font-black leading-none tabular-nums" :class="timerColor">
                        {{ timeLeft }}
                    </span>
                </div>
                <span v-else class="text-lg md:text-xl font-black text-ink-muted">--</span>
            </div>
        </div>

        <!-- Right Dummy Column (Chat space) -->
        <div class="hidden lg:block w-full"></div>
    </div>
</template>
