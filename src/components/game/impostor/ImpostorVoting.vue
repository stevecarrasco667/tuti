<script setup lang="ts">
import { computed } from 'vue';
import type { ImpostorData, Player } from '../../../../shared/types';
import { useGame } from '../../../composables/useGame';
import { useSound } from '../../../composables/useSound';

const props = defineProps<{
    impostorData: ImpostorData;
    players: Player[];
    myUserId: string;
    timeRemaining: number;
    timerColor: string;
}>();

const { toggleVote } = useGame();
const { playClick } = useSound();

const myVoteTarget = computed(() => {
    return props.impostorData.votes?.[props.myUserId] || null;
});

const handleVote = (targetId: string) => {
    if (targetId === props.myUserId) return; // Can't vote for yourself
    // Impostor mode category doesn't matter, we send "0"
    toggleVote(targetId, "0");
    playClick();
};

const votingStatus = computed(() => {
    return props.players.map(player => {
        const hasVoted = props.impostorData.votes && props.impostorData.votes[player.id] !== undefined;
        const isSelectedByMe = myVoteTarget.value === player.id;
        const isMe = player.id === props.myUserId;
        
        return {
            ...player,
            hasVoted,
            isSelectedByMe,
            isMe
        };
    });
});
</script>

<template>
    <div class="h-full w-full flex flex-col pt-8">
        <!-- HEADER -->
        <div class="flex-none text-center mb-6">
            <h2 class="text-3xl font-black text-red-500/90 tracking-widest uppercase mb-2 animate-pulse">Votación</h2>
            <p class="text-white/70 text-sm">¿Quién es el impostor? Selecciona a tu sospechoso.</p>
        </div>

        <!-- TIMER -->
        <div class="absolute top-4 left-4 z-10 flex items-center justify-center w-12 h-12 rounded-full border border-red-500/30 bg-black/40 backdrop-blur-md shadow-2xl">
            <span class="text-xl font-black font-mono transition-colors duration-300" :class="timerColor">
                {{ Math.max(0, timeRemaining) }}
            </span>
        </div>

        <!-- GRID DE JUGADORES (VOTACIÓN) -->
        <div class="flex-1 overflow-y-auto px-4 pb-12 w-full max-w-4xl mx-auto scrollbar-thin">
            <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                <button v-for="p in votingStatus" :key="p.id"
                     @click="handleVote(p.id)"
                     :disabled="p.isMe"
                     class="relative overflow-hidden bg-black/40 backdrop-blur-xl border-2 p-4 rounded-3xl shadow-2xl flex flex-col items-center gap-3 transition-all duration-300"
                     :class="[
                         p.isSelectedByMe ? 'border-red-500 bg-red-500/10 scale-105 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'border-white/10 hover:border-white/20 hover:bg-white/5',
                         p.isMe ? 'opacity-30 cursor-not-allowed border-dashed grayscale' : 'cursor-pointer active:scale-95'
                     ]"
                >
                    <!-- Indicador de que este jugador ya emitió su voto -->
                    <div v-if="p.hasVoted" class="absolute top-3 left-3 w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                    
                    <span class="text-4xl md:text-5xl mt-2 transition-transform duration-300" :class="{'scale-110': p.isSelectedByMe}">{{ p.avatar || '👤' }}</span>
                    <span class="font-black tracking-widest uppercase text-[10px] md:text-xs text-center w-full truncate"
                          :class="p.isSelectedByMe ? 'text-red-400' : 'text-white/70'">
                        {{ p.name }}
                    </span>
                    
                    <div v-if="p.isMe" class="absolute bottom-2 text-[8px] font-bold text-white/30 uppercase tracking-widest">Tú</div>
                    <div v-if="p.isSelectedByMe" class="absolute inset-0 border-4 border-red-500/50 rounded-3xl pointer-events-none animate-pulse"></div>
                </button>
            </div>
        </div>
    </div>
</template>
