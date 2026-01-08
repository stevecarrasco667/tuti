<script setup lang="ts">
import { Player } from '../../../shared/types';

defineProps<{
    players: Player[]; // Assuming caller sorts this
    myAnswers: Record<string, string>;
    categories: string[];
    myUserId: string;
    getPlayerStatus: (playerId: string, category: string) => { state: string };
}>();

</script>

<template>
    <div class="w-full max-w-lg">
        <!-- Ranking List -->
        <div class="mb-6">
            <h3 class="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2 px-1">Posiciones Finales</h3>
            <div class="space-y-2">
                <div v-for="(player, idx) in players" :key="player.id"
                        class="flex items-center justify-between p-4 rounded-2xl bg-black/30 border border-white/5"
                >
                    <div class="flex items-center gap-4">
                        <div class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs" :class="idx === 0 ? 'bg-yellow-400 text-black' : 'bg-white/10 text-white/50'">{{ idx + 1 }}</div>
                        <span class="text-2xl">{{ player.avatar }}</span>
                        <span class="font-bold text-lg text-white">{{ player.name }}</span>
                    </div>
                    <span class="font-black text-2xl" :class="idx === 0 ? 'text-yellow-400' : 'text-indigo-300'">{{ player.score }}</span>
                </div>
            </div>
        </div>
        
        <!-- My Grid -->
            <h3 class="text-xs font-bold text-white/30 uppercase tracking-widest mb-2 px-1">Tu Desempeño</h3>
        <div class="grid grid-cols-2 gap-2">
                <div v-for="category in categories" :key="category" 
                    class="bg-black/20 border-b-2 rounded-t-lg p-2"
                    :class="{
                        'border-green-500': myAnswers[category] && getPlayerStatus(myUserId, category).state === 'VALID',
                        'border-red-500': getPlayerStatus(myUserId, category).state === 'REJECTED',
                        'border-white/10': !myAnswers[category] || getPlayerStatus(myUserId, category).state === 'EMPTY'
                    }"
                >
                <div class="text-[9px] uppercase font-bold text-white/30 mb-0.5 truncate">{{ category }}</div>
                <div class="text-sm font-medium text-white truncate">{{ myAnswers[category] || '-' }}</div>
                </div>
        </div>
    </div>
</template>
