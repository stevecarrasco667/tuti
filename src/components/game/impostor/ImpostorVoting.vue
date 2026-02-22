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
        <div class="flex-1 overflow-y-auto px-4 pb-8 w-full max-w-5xl mx-auto scrollbar-thin">
            <!-- 1. GRILLA RESPONSIVA -->
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                
                <div v-for="s in suspects" :key="s.id"
                     class="relative overflow-hidden bg-slate-800/50 backdrop-blur-md border-2 rounded-2xl flex flex-col p-3 transition-colors duration-300"
                     :class="[
                         s.isSelectedByMe ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)] bg-emerald-950/20' : 'border-slate-700/50',
                         s.isPlayerDead ? 'opacity-40 grayscale pointer-events-none' : ''
                     ]"
                >
                    <!-- Fila Superior: Avatar + Info -->
                    <div class="flex gap-3 items-center mb-4">
                        <!-- 3. AVATARES -->
                        <div class="flex-none w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border border-white/10 shadow-lg">
                            <img v-if="s.avatar && (s.avatar.startsWith('/') || s.avatar.startsWith('http'))" :src="s.avatar" class="w-full h-full object-cover" />
                            <span v-else class="text-xl md:text-2xl">{{ s.avatar || '👤' }}</span>
                        </div>
                        
                        <!-- Nombre y Palabra -->
                        <div class="flex flex-col flex-1 min-w-0 justify-center">
                            <span class="text-sm md:text-base font-bold text-white truncate break-all leading-tight">{{ s.name }}</span>
                            <span class="text-[11px] md:text-xs text-white/70 truncate mt-0.5">
                                {{ s.word || 'Pensando...' }}
                            </span>
                        </div>
                    </div>

                    <!-- Fila Media: Switch ACUSAR (2. REACTIVIDAD DEL SWITCH) -->
                    <button @click="handleVote(s.id)"
                            :disabled="s.isMe || s.isPlayerDead || isDead"
                            class="flex items-center justify-between w-[95%] mx-auto rounded-full pl-4 pr-1.5 py-1.5 transition-colors duration-300 mt-auto"
                            :class="[
                                s.isSelectedByMe ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-slate-700/50 border border-white/5',
                                (!s.isMe && !s.isPlayerDead && !isDead) ? 'hover:bg-slate-600/50 cursor-pointer' : 'cursor-not-allowed'
                            ]"
                    >
                        <span class="text-[10px] md:text-xs font-bold tracking-widest uppercase text-left" 
                              :class="s.isSelectedByMe ? 'text-emerald-400' : 'text-slate-300'">Acusar</span>
                        
                        <!-- Toggle switch visual -->
                        <div class="relative w-10 h-5 md:h-6 md:w-11 rounded-full transition-colors duration-300"
                             :class="[
                                s.isSelectedByMe ? 'bg-emerald-500' : 'bg-slate-600',
                                s.isMe ? 'opacity-50' : ''
                             ]">
                             <!-- Toggle circle (El botón "Tú": sin bolita si es s.isMe) -->
                             <div v-if="!s.isMe" 
                                  class="absolute top-0.5 md:top-[3px] left-0.5 md:left-[3px] w-4 h-4 md:w-4.5 md:h-4.5 rounded-full bg-white shadow-sm transition-transform duration-300"
                                  :class="s.isSelectedByMe ? 'translate-x-5' : 'translate-x-0'">
                             </div>
                        </div>
                    </button>
                    
                    <!-- Fila Inferior: Votos en Vivo -->
                    <div class="mt-3 flex justify-center items-center text-xs font-bold">
                        <span class="text-orange-500 mr-1.5 text-sm">🔥</span>
                        <span class="text-slate-300">{{ s.currentVotes }} Votos</span>
                    </div>
                    
                    <!-- Indicador PENDING / VOTED -->
                    <div v-if="!s.hasVoted && !s.isMe && !s.isPlayerDead" class="absolute top-2 right-2 text-white/30" title="Pensando...">
                        <svg class="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                    <div v-else-if="s.hasVoted && !s.isMe && !s.isPlayerDead" class="absolute top-2 right-2 text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]">
                        <span class="text-xs text-shadow">✓</span>
                    </div>

                    <!-- Indicador MUERTO adicional si es pertinente (opcional, aunque con la opacidad bajada se entiende) -->
                    <div v-if="s.isPlayerDead" class="absolute inset-0 flex items-center justify-center pointer-events-none z-10 mix-blend-overlay">
                        <span class="text-4xl">❌</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
