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

const isDead = computed(() => !props.impostorData.alivePlayers.includes(props.myUserId));
const isImpostor = computed(() => props.impostorData.impostorIds.includes(props.myUserId));

const handleVote = (targetId: string) => {
    if (targetId === props.myUserId || isDead.value) return;
    toggleVote(targetId, "0");
    playClick();
};

const suspects = computed(() => {
    return props.players.filter(p => p.isConnected).map(player => {
        const hasVoted = props.impostorData.votes && props.impostorData.votes[player.id] !== undefined;
        const isSelectedByMe = myVoteTarget.value === player.id;
        const isMe = player.id === props.myUserId;
        const word = props.impostorData.words?.[player.id] || null;
        const isPlayerDead = !props.impostorData.alivePlayers.includes(player.id);
        const currentVotes = props.impostorData.voteCounts?.[player.id] || 0;

        return {
            ...player,
            hasVoted,
            isSelectedByMe,
            isMe,
            word,
            isPlayerDead,
            currentVotes
        };
    });
});
</script>

<template>
    <div class="h-full w-full flex flex-col pt-4">

        <!-- HEADER -->
        <div class="flex-none text-center mb-4">
            <h2 class="text-2xl md:text-3xl font-black text-red-500/90 tracking-widest uppercase mb-1">🔎 El Tribunal</h2>
            <p class="text-white/60 text-xs md:text-sm">Analiza las evidencias y acusa al impostor.</p>
        </div>

        <!-- TIMER -->
        <div class="absolute top-4 left-4 z-10 flex items-center justify-center w-12 h-12 rounded-full border border-red-500/30 bg-black/40 backdrop-blur-md shadow-2xl">
            <span class="text-xl font-black font-mono transition-colors duration-300" :class="timerColor">
                {{ Math.max(0, timeRemaining) }}
            </span>
        </div>

        <!-- BANNER DE FANTASMA -->
        <div v-if="isDead" class="w-full max-w-4xl mx-auto mb-6 bg-slate-900/80 border border-slate-500/30 rounded-2xl px-6 py-4 backdrop-blur-md flex items-center justify-center gap-3">
            <span class="text-3xl animate-bounce">💀</span>
            <div class="text-center">
                <span class="text-slate-300 font-black text-sm uppercase tracking-widest block">Eres un Fantasma</span>
                <span class="text-slate-400 text-xs">Observa el tribunal, pero ya no tienes voz ni voto.</span>
            </div>
        </div>

        <!-- HUD DE IDENTIDAD -->
        <div class="w-full max-w-4xl mx-auto mb-4 px-4 transition-opacity duration-500" :class="{ 'opacity-50 grayscale pointer-events-none': isDead }">
            <div v-if="isImpostor"
                 class="bg-red-950/60 border border-red-500/30 rounded-2xl px-5 py-2.5 backdrop-blur-md flex items-center gap-3 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                <span class="text-xl">⚠️</span>
                <div class="flex flex-wrap items-center gap-x-2">
                    <span class="text-red-400 font-black text-xs uppercase tracking-widest">Impostor</span>
                    <span class="text-white/60 text-xs" v-if="!isDead">Categoría: <strong class="text-red-300">{{ impostorData.secretCategory }}</strong></span>
                </div>
            </div>
            <div v-else
                 class="bg-cyan-950/40 border border-cyan-500/20 rounded-2xl px-5 py-2.5 backdrop-blur-md flex items-center gap-3 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                <span class="text-xl">💡</span>
                <div class="flex flex-wrap items-center gap-x-2">
                    <span class="text-cyan-400 font-black text-xs uppercase tracking-widest">Tripulante</span>
                    <span class="text-white/60 text-xs" v-if="!isDead">La palabra es: <strong class="text-cyan-300">{{ impostorData.secretWord }}</strong></span>
                </div>
            </div>
        </div>

        <!-- TARJETAS DE SOSPECHOSOS -->
        <div class="flex-1 overflow-y-auto px-4 pb-8 w-full max-w-4xl mx-auto scrollbar-thin">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div v-for="s in suspects" :key="s.id"
                     class="relative overflow-hidden bg-black/40 backdrop-blur-xl border-2 rounded-2xl shadow-xl transition-all duration-300 flex items-stretch"
                     :class="[
                         s.isSelectedByMe ? 'border-red-500 bg-red-500/10 shadow-[0_0_25px_rgba(239,68,68,0.2)]' : 'border-white/10',
                         s.isMe ? 'opacity-40 border-dashed' : ''
                     ]"
                >
                    <!-- Avatar + Info -->
                    <div class="flex items-center gap-4 p-4 flex-1 min-w-0">
                        <!-- Avatar -->
                        <div class="flex-none w-12 h-12 rounded-full bg-gradient-to-b from-indigo-500 to-indigo-700 border-2 border-white/20 flex items-center justify-center text-2xl shadow-lg ring-1 ring-white/10"
                             :class="{ 'from-red-500 to-red-700': s.isSelectedByMe }">
                            {{ s.avatar || '👤' }}
                        </div>

                        <!-- Name + Evidence -->
                        <div class="flex-1 min-w-0">
                            <div class="text-xs font-bold uppercase tracking-widest mb-1"
                                 :class="s.isMe ? 'text-white/40' : 'text-white/70'">
                                {{ s.isMe ? 'Tú' : s.name }}
                            </div>
                            <!-- EVIDENCIA: La palabra que escribió -->
                            <div v-if="s.word" class="text-lg md:text-xl font-black text-white truncate">
                                "{{ s.word }}"
                            </div>
                            <div v-else class="text-sm text-white/30 italic">
                                Sin respuesta
                            </div>
                        </div>
                    </div>

                    <!-- Vote Indicator (already voted) -->
                    <div v-if="s.hasVoted" class="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>

                    <!-- Vote Button -->
                    <button v-if="!s.isMe"
                            @click="handleVote(s.id)"
                            class="flex-none w-20 md:w-24 flex flex-col items-center justify-center border-l-2 transition-all duration-300 cursor-pointer"
                            :class="s.isSelectedByMe
                                ? 'bg-red-500/20 border-red-500/40 hover:bg-red-500/30'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'"
                    >
                        <span class="text-2xl mb-1">{{ s.isSelectedByMe ? '🔴' : '🎯' }}</span>
                        <span class="text-[9px] font-black uppercase tracking-widest"
                              :class="s.isSelectedByMe ? 'text-red-400' : 'text-white/50'">
                            {{ s.isSelectedByMe ? 'Acusado' : 'Acusar' }}
                        </span>
                    </button>

                    <!-- Self marker (no vote button) -->
                    <div v-else class="flex-none w-20 md:w-24 flex items-center justify-center border-l-2 border-white/5">
                        <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest">Tú</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
