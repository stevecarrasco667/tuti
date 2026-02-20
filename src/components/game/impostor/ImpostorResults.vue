<script setup lang="ts">
import { computed } from 'vue';
import type { ImpostorData, Player } from '../../../../shared/types';
import { useSound } from '../../../composables/useSound';

const props = defineProps<{
    impostorData: ImpostorData;
    players: Player[];
    timeRemaining: number;
    timerColor: string;
}>();

const { playAlarm, playSuccess } = useSound();

const result = computed(() => props.impostorData.result);
const winner = computed(() => result.value?.winner);
const mostVotedId = computed(() => result.value?.mostVotedId);

const impostorPlayer = computed(() => {
    return props.players.find(p => p.id === props.impostorData.impostorId);
});

const mostVotedPlayer = computed(() => {
    return props.players.find(p => p.id === mostVotedId.value);
});

// Sound effects on mount
if (winner.value === 'IMPOSTOR') {
    playAlarm();
} else if (winner.value === 'CREW') {
    playSuccess();
}
</script>

<template>
    <div class="h-full w-full flex flex-col items-center justify-center pt-8 text-center transition-all duration-700"
         :class="winner === 'IMPOSTOR' ? 'bg-red-950/40 text-red-500' : 'bg-emerald-950/40 text-emerald-400'">
        
        <!-- HEADER DE RESULTADO -->
        <h1 class="text-5xl md:text-7xl font-black tracking-widest uppercase animate-pulse mb-6 drop-shadow-2xl">
            <template v-if="winner === 'IMPOSTOR'">¡IMPOSTOR GANA!</template>
            <template v-else-if="winner === 'CREW'">¡IMPOSTOR CAZADO!</template>
        </h1>
        
        <p class="text-xl md:text-2xl text-white/80 font-bold mb-12">
            El impostor era <span class="text-white font-black underline decoration-4 underline-offset-4" :class="winner === 'IMPOSTOR' ? 'decoration-red-500' : 'decoration-emerald-400'">{{ impostorPlayer?.name || '???' }}</span>
        </p>

        <!-- DETALLES DE VOTACIÓN (DETERMINISTA POR MANDATO) -->
        <div class="bg-black/30 backdrop-blur-xl border-2 p-6 md:p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-xl"
             :class="winner === 'IMPOSTOR' ? 'border-red-500/50' : 'border-emerald-500/50'">
            
            <template v-if="winner === 'IMPOSTOR'">
                <span class="text-6xl mb-4">🦇</span>
                <p class="text-lg text-white/70 mb-2">Engañó a todos exitosamente.</p>
                <div v-if="mostVotedPlayer && mostVotedPlayer.id !== impostorPlayer?.id" class="text-sm font-bold text-red-300 bg-red-950/50 px-4 py-2 rounded-xl mt-4">
                    Injustamente expulsaron a {{ mostVotedPlayer.name }}
                </div>
                <div v-else-if="!mostVotedPlayer" class="text-sm font-bold text-red-300 bg-red-950/50 px-4 py-2 rounded-xl mt-4">
                    Hubo un empate. El impostor escapa.
                </div>
            </template>
            
            <template v-else-if="winner === 'CREW'">
                <span class="text-6xl mb-4">🎯</span>
                <p class="text-lg text-white/70 mb-2">La tripulación unió fuerzas.</p>
                <div class="text-sm font-bold text-emerald-300 bg-emerald-950/50 px-4 py-2 rounded-xl mt-4">
                    El veredicto fue absoluto contra {{ impostorPlayer?.name }}
                </div>
            </template>
            
        </div>
        
        <!-- TIMER PARA VOLVER AL LOBBY -->
        <div class="mt-12 text-center text-white/40">
            <p class="text-xs uppercase tracking-widest font-black mb-2">Siguiente partida en</p>
            <div class="text-3xl font-mono font-black transition-colors" :class="timerColor">{{ Math.max(0, timeRemaining) }}</div>
        </div>
    </div>
</template>
