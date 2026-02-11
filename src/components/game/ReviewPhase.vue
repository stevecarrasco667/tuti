<script setup lang="ts">
import { Player } from '../../../shared/types';

defineProps<{
    currentCategory: string;
    players: Player[];
    votes: Record<string, Record<string, string[]>>;
    myUserId: string;
    getReviewItem: (playerId: string) => { answer: string; state: string }; // Typed Helper
    navIndex: number;
    totalCategories: number;
    showStopAlert: boolean;
    stopperPlayer: Player | undefined; // Can be null/undefined
}>();

defineEmits<{
    (e: 'vote', playerId: string): void;
    (e: 'next-cat'): void;
    (e: 'prev-cat'): void;
}>();
</script>

<template>
    <div class="w-full max-w-2xl flex flex-col gap-6">
                            
        <!-- Stop Alert -->
        <div v-if="showStopAlert && stopperPlayer" class="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top duration-300">
            <div class="text-4xl animate-bounce">{{ stopperPlayer.avatar || '🛑' }}</div>
            <div>
                <h3 class="font-black text-red-100 text-xl uppercase italic">¡BASTA!</h3>
                <p class="text-red-200/60 text-xs font-bold uppercase tracking-wider">Detenido por {{ stopperPlayer.name }}</p>
            </div>
        </div>

        <!-- REVIEW -->
        <div class="text-center">
                <h3 class="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-4">Revisión en Progreso</h3>
                <div class="bg-indigo-900/40 backdrop-blur-xl rounded-3xl p-6 border border-white/5 shadow-2xl">
                <h2 class="text-3xl font-black text-white mb-6 drop-shadow-md">{{ currentCategory }}</h2>
                
                    <!-- Player List -->
                <div class="space-y-3">
                    <div v-for="player in players" :key="player.id" 
                            class="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                    >
                        <div class="flex items-center gap-3 overflow-hidden">
                            <span class="text-2xl">{{ player.avatar || '👤' }}</span>
                            <div class="text-left overflow-hidden">
                                <div class="text-[10px] font-bold text-white/30 uppercase">{{ player.name }}</div>
                                <div class="font-medium text-lg text-white truncate group-hover:text-yellow-300 transition-colors"
                                        :class="{
                                            'line-through opacity-50 text-red-400': getReviewItem(player.id).state === 'REJECTED' || (votes[player.id]?.[currentCategory]?.length || 0) >= (players.length / 2),
                                            'text-green-400': getReviewItem(player.id).state === 'VALID'
                                        }"
                                >
                                    {{ getReviewItem(player.id).answer || '-' }}
                                </div>
                            </div>
                        </div>

                            <!-- Vote Toggle -->
                        <button 
                            v-if="player.id !== myUserId"
                            @click="$emit('vote', player.id)"
                            class="px-4 py-2 rounded-lg border text-xs font-bold transition-all uppercase tracking-wider"
                            :class="votes[player.id]?.[currentCategory]?.includes(myUserId) 
                                ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20' 
                                : 'bg-transparent border-white/10 text-white/40 hover:text-white hover:bg-white/10'"
                        >
                            <div class="flex items-center gap-2">
                                <span>{{ votes[player.id]?.[currentCategory]?.includes(myUserId) ? '👎' : '👍' }}</span>
                                <span v-if="votes[player.id]?.[currentCategory]?.length" class="bg-white/20 px-1.5 rounded text-[10px]">{{ votes[player.id]?.[currentCategory]?.length }}</span>
                            </div>
                        </button>
                        <div v-else class="text-xl">
                            <span v-if="getReviewItem(player.id).state === 'VALID'">✅</span>
                            <span v-else-if="getReviewItem(player.id).state === 'REJECTED'">❌</span>
                            <span v-else-if="getReviewItem(player.id).state === 'DUPLICATE'">⚠️</span>
                        </div>
                    </div>
                </div>
                
                <!-- Nav -->
                <div class="flex justify-center gap-6 mt-6 pt-4 border-t border-white/5">
                    <button @click="$emit('prev-cat')" :disabled="navIndex === 0" class="p-3 bg-white/5 rounded-full disabled:opacity-20 hover:bg-white/10 transition-colors">⬅️</button>
                    <span class="font-mono text-xl self-center text-yellow-400 font-bold">{{ navIndex + 1 }} / {{ totalCategories }}</span>
                    <button @click="$emit('next-cat')" :disabled="navIndex === totalCategories - 1" class="p-3 bg-white/5 rounded-full disabled:opacity-20 hover:bg-white/10 transition-colors">➡️</button>
                </div>
                </div>
        </div>
    </div>
</template>
