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

const result = computed(() => props.impostorData.cycleResult);
const matchOver = computed(() => result.value?.matchOver);
const winner = computed(() => result.value?.winner);
const eliminatedId = computed(() => result.value?.eliminatedId);

const eliminatedPlayer = computed(() => {
    return props.players.find(p => p.id === eliminatedId.value);
});

const isEliminatedImpostor = computed(() => {
    return eliminatedId.value ? props.impostorData.impostorIds.includes(eliminatedId.value) : false;
});

// Sound effects on mount
if (matchOver.value) {
    if (winner.value === 'IMPOSTOR') playAlarm();
    else if (winner.value === 'CREW') playSuccess();
} else if (eliminatedPlayer.value) {
    if (isEliminatedImpostor.value) playSuccess();
    else playAlarm();
}
</script>

<template>
    <div class="h-full w-full flex flex-col items-center justify-center p-4 text-center transition-all duration-700"
         :class="matchOver && winner === 'IMPOSTOR' ? 'bg-red-950/40 text-red-500' : 'bg-emerald-950/40 text-emerald-400'">
        
        <!-- HEADER DE RESULTADO -->
        <h1 class="text-4xl md:text-6xl font-black tracking-widest uppercase animate-pulse mb-6 drop-shadow-2xl">
            <template v-if="matchOver && winner === 'IMPOSTOR'">¡IMPOSTORES GANAN!</template>
            <template v-else-if="matchOver && winner === 'CREW'">¡TRIPULACIÓN GANA!</template>
            <template v-else-if="!eliminatedPlayer">EMPATE EN EL TRIBUNAL</template>
            <template v-else-if="isEliminatedImpostor">¡IMPOSTOR CAZADO!</template>
            <template v-else>¡INOCENTE EXPULSADO!</template>
        </h1>
        
        <p class="text-lg md:text-xl text-white/80 font-bold mb-8">
            <template v-if="matchOver">
                El ecosistema de supervivencia ha colapsado.
            </template>
            <template v-else-if="eliminatedPlayer">
                El tribunal ha expulsado a <span class="text-white font-black underline decoration-4 underline-offset-4" :class="isEliminatedImpostor ? 'decoration-emerald-400' : 'decoration-red-500'">{{ eliminatedPlayer.name }}</span>
            </template>
            <template v-else>
                Nadie ha sido expulsado hoy. La tensión continúa.
            </template>
        </p>

        <!-- DETALLES DE VOTACIÓN -->
        <div class="bg-black/30 backdrop-blur-xl border-2 p-6 md:p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-xl w-full"
             :class="(!eliminatedPlayer || isEliminatedImpostor) ? 'border-emerald-500/50' : 'border-red-500/50'">
            
            <template v-if="matchOver">
                <span class="text-6xl mb-4">{{ winner === 'IMPOSTOR' ? '🦇' : '🎯' }}</span>
                <p class="text-lg text-white/70 mb-2">{{ winner === 'IMPOSTOR' ? 'Los impostores controlan la nave.' : 'La tripulación purificó la nave.' }}</p>
            </template>
            <template v-else>
                <div v-if="!eliminatedPlayer" class="text-sm font-bold text-slate-300 bg-slate-900/50 px-4 py-3 rounded-xl">
                    Los votos se dividieron. Todos sobreviven a esta ronda.
                </div>
                <div v-else class="text-sm font-bold w-full rounded-xl px-4 py-3" :class="isEliminatedImpostor ? 'bg-emerald-950/50 text-emerald-300' : 'bg-red-950/50 text-red-300'">
                    {{ isEliminatedImpostor ? 'Un impostor menos en la nave.' : 'Han sacrificado a un tripulante inocente.' }}
                </div>
            </template>
            
        </div>
        
        <!-- TIMER -->
        <div class="mt-8 text-center text-white/40">
            <p class="text-xs uppercase tracking-widest font-black mb-2">{{ matchOver ? 'Fin de la Partida' : 'Siguiente Deducción en' }}</p>
            <div class="text-3xl font-mono font-black transition-colors" :class="timerColor">{{ Math.max(0, timeRemaining) }}</div>
        </div>
    </div>
</template>
