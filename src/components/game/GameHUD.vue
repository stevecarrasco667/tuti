<script setup lang="ts">
defineProps<{
    title?: string;
    subtitle?: string;
    timeLeft?: number | null;
    timerColor?: string;
}>();

defineEmits<{
    (e: 'exit'): void;
}>();
</script>

<template>
    <div class="flex-none h-16 sm:h-20 bg-panel-base/30 backdrop-blur-md border-b-2 border-white/10 flex items-center justify-between px-4 sm:px-6 z-[60] relative shadow-sm">
            
        <!-- Left: Exit Button -->
        <div class="flex items-center gap-4 flex-none w-20">
            <button @click="$emit('exit')" class="text-white bg-action-error/80 hover:bg-red-500 p-2 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl shadow-sm border border-white/20 transition-all active:scale-95 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4 hidden sm:block">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
                SALIR
            </button>
        </div>

        <!-- Center: Dynamic Title (e.g. Category) -->
        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center w-[50%] pointer-events-none">
            <span v-if="subtitle" class="text-[9px] sm:text-[10px] text-ink-muted uppercase tracking-[0.2em] font-black truncate max-w-full">{{ subtitle }}</span>
            <span v-if="title" class="text-base sm:text-xl font-black text-ink-main tracking-tight truncate max-w-full drop-shadow-sm">{{ title }}</span>
        </div>

        <!-- Right: Timer -->
        <div class="flex flex-col items-end flex-none w-20">
            <template v-if="timeLeft !== null && timeLeft !== undefined && timeLeft >= 0">
                 <span class="text-[9px] sm:text-[10px] text-ink-muted uppercase tracking-widest font-black mb-0.5">Tiempo</span>
                 <span class="text-xl sm:text-2xl font-mono font-black leading-none drop-shadow-md" :class="timerColor">{{ timeLeft }}</span>
            </template>
            <span v-else class="text-xl font-bold text-ink-muted/50 mt-2">--</span>
        </div>
    </div>
</template>
