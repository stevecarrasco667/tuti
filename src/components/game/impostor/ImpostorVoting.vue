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
        <div class="flex-none text-center mb-4 mt-2">
            <h2 class="text-2xl md:text-3xl font-black text-ink-main tracking-widest uppercase mb-1 drop-shadow-sm">🔎 El Tribunal</h2>
            <p class="text-ink-muted text-xs md:text-sm font-black uppercase tracking-widest bg-white/40 border border-white/50 px-3 py-1 rounded-full w-fit mx-auto">Analiza las evidencias y acusa al impostor.</p>
        </div>

        <!-- TIMER -->
        <div class="absolute top-4 left-4 z-10 flex items-center justify-center min-w-[3rem] px-2 h-12 rounded-2xl border-2 border-white bg-panel-card shadow-sm">
            <span class="text-xl font-black font-mono transition-colors duration-300" :class="timerColor">
                {{ Math.max(0, timeRemaining) }}
            </span>
        </div>

        <!-- BANNER DE FANTASMA -->
        <div v-if="isDead" class="w-full max-w-4xl mx-auto mb-6 bg-slate-200 border-4 border-slate-300 rounded-3xl px-6 py-4 backdrop-blur-md flex items-center justify-center gap-3 shadow-inner">
            <span class="text-4xl animate-bounce drop-shadow-sm">💀</span>
            <div class="text-center">
                <span class="text-slate-600 font-black text-sm md:text-base uppercase tracking-widest block">Eres un Fantasma</span>
                <span class="text-slate-500 text-xs font-bold">Observa el tribunal, pero ya no tienes voz ni voto.</span>
            </div>
        </div>

        <!-- HUD DE IDENTIDAD -->
        <div class="w-full max-w-4xl mx-auto mb-4 px-4 transition-opacity duration-500" :class="{ 'opacity-50 grayscale pointer-events-none': isDead }">
            <div v-if="isImpostor"
                 class="bg-red-50 border-[3px] border-red-200 rounded-3xl px-5 py-2.5 backdrop-blur-md flex items-center gap-3 shadow-sm">
                <span class="text-2xl drop-shadow-sm">⚠️</span>
                <div class="flex flex-wrap items-center gap-x-2">
                    <span class="text-action-error font-black text-sm uppercase tracking-widest">Impostor</span>
                    <span class="text-red-900/70 text-xs font-bold" v-if="!isDead">Categoría: <strong class="text-action-error font-black">{{ impostorData.secretCategory }}</strong></span>
                </div>
            </div>
            <div v-else
                 class="bg-cyan-50 border-[3px] border-cyan-200 rounded-3xl px-5 py-2.5 backdrop-blur-md flex items-center gap-3 shadow-sm">
                <span class="text-2xl drop-shadow-sm">💡</span>
                <div class="flex flex-wrap items-center gap-x-2">
                    <span class="text-action-cyan font-black text-sm uppercase tracking-widest">Tripulante</span>
                    <span class="text-cyan-900/70 text-xs font-bold" v-if="!isDead">La palabra es: <strong class="text-action-cyan font-black">{{ impostorData.secretWord }}</strong></span>
                </div>
            </div>
        </div>

        <!-- TARJETAS DE SOSPECHOSOS -->
        <div class="flex-1 overflow-y-auto px-2 pb-8 w-full max-w-5xl mx-auto scrollbar-thin">
            <!-- 1. GRILLA RESPONSIVA DINÁMICA -->
            <div class="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3 md:gap-4 p-1 w-full h-full">
                
                <div v-for="s in suspects" :key="s.id"
                     class="relative overflow-hidden bg-panel-card backdrop-blur-md border-[4px] rounded-3xl flex flex-col transition-colors duration-300 shadow-sm"
                     :class="[
                         s.isSelectedByMe ? 'border-action-primary bg-emerald-50 shadow-[0_4px_15px_rgba(46,204,113,0.3)]' : 'border-white hover:shadow-md',
                         s.isPlayerDead ? 'opacity-50 grayscale pointer-events-none' : ''
                     ]"
                >
                    <div class="p-3">
                        <!-- Fila Superior: Avatar + Info -->
                        <div class="flex gap-3 items-center mb-3">
                            <!-- 3. AVATARES -->
                            <div class="flex-none w-10 h-10 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-panel-card shadow-sm">
                                <img v-if="s.avatar && (s.avatar.startsWith('/') || s.avatar.startsWith('http'))" :src="s.avatar" class="w-full h-full object-cover" />
                                <span v-else class="text-xl md:text-2xl drop-shadow-sm">{{ s.avatar || '👤' }}</span>
                            </div>
                            
                            <!-- Nombre y Palabra -->
                            <div class="flex flex-col flex-1 min-w-0 justify-center">
                                <span class="text-xs md:text-sm font-black text-ink-main uppercase tracking-widest truncate break-all leading-tight">{{ s.name }}</span>
                                <span class="text-[12px] md:text-xs text-action-blue font-black bg-white/60 px-2 py-0.5 rounded-full inline-block mt-1 w-fit truncate max-w-full shadow-inner border border-white/50">
                                    {{ s.word || 'Pensando...' }}
                                </span>
                            </div>
                        </div>

                        <!-- Fila Media: Switch ACUSAR (2. REACTIVIDAD DEL SWITCH) -->
                        <button @click="handleVote(s.id)"
                                :disabled="s.isMe || s.isPlayerDead || isDead"
                                class="flex items-center justify-between w-full mx-auto rounded-full pl-4 pr-1.5 py-1.5 transition-colors duration-300 mt-2 border-2"
                                :class="[
                                    s.isSelectedByMe ? 'bg-action-primary/20 border-action-primary' : 'bg-white border-panel-input',
                                    (!s.isMe && !s.isPlayerDead && !isDead) ? 'active:scale-95 cursor-pointer shadow-sm' : 'cursor-not-allowed opacity-70'
                                ]"
                        >
                            <span class="text-[10px] md:text-xs font-black tracking-widest uppercase text-left" 
                                  :class="s.isSelectedByMe ? 'text-action-primary' : 'text-ink-soft'">Acusar</span>
                            
                            <!-- Toggle switch visual -->
                            <div class="relative w-10 h-5 md:h-6 md:w-11 rounded-full border-2 transition-colors duration-300"
                                 :class="[
                                    s.isSelectedByMe ? 'bg-action-primary border-transparent' : 'bg-panel-input border-panel-card shadow-inner',
                                    s.isMe ? 'opacity-50' : ''
                                 ]">
                                 <!-- Toggle circle -->
                                 <div v-if="!s.isMe" 
                                      class="absolute top-0.5 md:top-[1px] left-0.5 md:left-[1px] w-3 h-3 md:w-4 md:h-4 rounded-full bg-white shadow-sm transition-transform duration-300 border border-black/5"
                                      :class="s.isSelectedByMe ? 'translate-x-[1.1rem] md:translate-x-5' : 'translate-x-0'">
                                 </div>
                            </div>
                        </button>
                    </div>
                    
                    <!-- Fila Inferior: Votos en Vivo -->
                    <div class="mt-auto bg-white/60 flex justify-center items-center py-2 px-3 text-xs font-black border-t-2 border-white/50 flex-wrap">
                        <span class="text-action-warning mr-1.5 text-sm drop-shadow-sm">🔥</span>
                        <span class="text-ink-soft uppercase tracking-widest">{{ s.currentVotes }} Votos</span>
                    </div>
                    
                    <!-- Indicador PENDING / VOTED -->
                    <div v-if="!s.hasVoted && !s.isMe && !s.isPlayerDead" class="absolute top-2 right-2 text-ink-muted/50" title="Pensando...">
                        <svg class="animate-spin h-4 w-4 drop-shadow-sm" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                    <div v-else-if="s.hasVoted && !s.isMe && !s.isPlayerDead" class="absolute top-2 right-2 text-action-primary drop-shadow-sm">
                        <span class="text-sm font-black">✓</span>
                    </div>

                    <!-- Indicador MUERTO adicional si es pertinente -->
                    <div v-if="s.isPlayerDead" class="absolute inset-0 flex items-center justify-center pointer-events-none z-10 text-shadow-xl bg-slate-900/60 backdrop-blur-[1px]">
                        <span class="text-5xl drop-shadow-md">💀</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
