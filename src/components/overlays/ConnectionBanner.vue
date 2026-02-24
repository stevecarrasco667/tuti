<script setup lang="ts">
import { useSocket } from '../../composables/useSocket';

const { isConnected, isIntentionalDisconnect } = useSocket();
</script>

<template>
    <div v-if="!isConnected && !isIntentionalDisconnect" class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md pointer-events-auto">
        <svg class="animate-spin h-14 w-14 text-indigo-500 mb-6 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-white text-xl font-black tracking-widest uppercase drop-shadow-md">📡 Señal perdida...</span>
        <span class="text-white/60 text-sm mt-3 font-medium">Reconectando al servidor Edge</span>
    </div>
</template>
