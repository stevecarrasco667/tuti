<script setup lang="ts">
import { computed } from 'vue';
import type { ImpostorData, Player } from '../../../../shared/types';

const props = defineProps<{
    impostorData: ImpostorData;
    players: Player[];
    timeRemaining: number;
    timerColor: string;
}>();

// Map userId to player name and their typed word
const expositionItems = computed(() => {
    return props.players.map(player => {
        const word = props.impostorData.words[player.id];
        return {
            id: player.id,
            name: player.name,
            avatar: player.avatar || '👤',
            word: word ? word : '🤔 (Sin respuesta)'
        };
    });
});
</script>

<template>
    <div class="h-full w-full flex flex-col pt-8">
        <!-- HEADER -->
        <div class="flex-none text-center mb-6">
            <h2 class="text-3xl font-black text-white/90 tracking-widest uppercase mb-2">Exposición</h2>
            <p class="text-white/50 text-sm">Analiza las respuestas. El impostor se esconde aquí.</p>
        </div>

        <!-- TIMER -->
        <div class="absolute top-4 left-4 z-10 flex items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl">
            <span class="text-xl font-black font-mono transition-colors duration-300" :class="timerColor">
                {{ Math.max(0, timeRemaining) }}
            </span>
        </div>

        <!-- GRID DE RESPUESTAS -->
        <div class="flex-1 overflow-y-auto px-4 pb-12 w-full max-w-4xl mx-auto scrollbar-thin">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="item in expositionItems" :key="item.id"
                     class="bg-indigo-950/40 backdrop-blur-xl border border-white/5 p-4 rounded-2xl shadow-xl flex flex-col gap-2">
                    <div class="flex items-center gap-3 border-b border-white/5 pb-2">
                        <span class="text-2xl">{{ item.avatar }}</span>
                        <span class="font-bold text-white/80 uppercase tracking-widest text-xs">{{ item.name }}</span>
                    </div>
                    <div class="pt-1 text-center min-h-[60px] flex items-center justify-center">
                        <span class="text-2xl font-black font-mono text-white/90 break-words w-full px-2" :class="{'text-white/30 italic text-xl': item.word === '🤔 (Sin respuesta)'}">
                            {{ item.word }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
