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
    <div class="h-full w-full flex flex-col items-center justify-center p-4 text-center transition-all duration-700 bg-white/40 border-[4px] shadow-game-panel rounded-3xl m-2 md:m-4"
         :class="matchOver && winner === 'IMPOSTOR' ? 'border-red-300/80 shadow-[0_0_40px_rgba(239,68,68,0.2)]' : 'border-green-300/80 shadow-[0_0_40px_rgba(46,204,113,0.2)]'">
        
        <!-- HEADER DE RESULTADO -->
        <h1 class="text-4xl md:text-6xl font-black tracking-tighter uppercase animate-pulse mb-6 drop-shadow-sm"
            :class="matchOver && winner === 'IMPOSTOR' ? 'text-action-error' : (matchOver && winner === 'CREW' || isEliminatedImpostor ? 'text-action-primary' : 'text-ink-main')">
            <template v-if="matchOver && winner === 'IMPOSTOR'">¡IMPOSTORES GANAN!</template>
            <template v-else-if="matchOver && winner === 'CREW'">¡TRIPULACIÓN GANA!</template>
            <template v-else-if="!eliminatedPlayer">EMPATE EN EL TRIBUNAL</template>
            <template v-else-if="isEliminatedImpostor">¡IMPOSTOR CAZADO!</template>
            <template v-else>¡INOCENTE EXPULSADO!</template>
        </h1>
        
        <p class="text-lg md:text-xl text-ink-soft font-black mb-8 uppercase tracking-widest max-w-lg">
            <template v-if="matchOver">
                El ecosistema de supervivencia ha colapsado.
            </template>
            <template v-else-if="eliminatedPlayer">
                El tribunal ha expulsado a <span class="text-ink-main font-black underline decoration-4 underline-offset-4" :class="isEliminatedImpostor ? 'decoration-action-primary' : 'decoration-action-error'">{{ eliminatedPlayer.name }}</span>
            </template>
            <template v-else>
                Nadie ha sido expulsado hoy. La tensión continúa.
            </template>
        </p>

        <!-- DETALLES DE VOTACIÓN -->
        <div class="bg-panel-card border-4 p-6 md:p-8 rounded-3xl shadow-sm flex flex-col items-center max-w-xl w-[95%]"
             :class="(!eliminatedPlayer || isEliminatedImpostor) ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'">
            
            <template v-if="matchOver">
                <span class="text-6xl mb-4 drop-shadow-md">{{ winner === 'IMPOSTOR' ? '🦇' : '🎯' }}</span>
                <p class="text-lg text-ink-main font-black uppercase tracking-widest">{{ winner === 'IMPOSTOR' ? 'Los impostores controlan la nave.' : 'La tripulación purificó la nave.' }}</p>
            </template>
            <template v-else>
                <div v-if="!eliminatedPlayer" class="text-sm font-black text-ink-muted bg-white px-4 py-3 rounded-2xl shadow-inner border-2 border-white/50 w-full uppercase tracking-widest">
                    Los votos se dividieron. Todos sobreviven a esta ronda.
                </div>
                <div v-else class="text-sm font-black w-full rounded-2xl px-4 py-3 border-2 shadow-inner uppercase tracking-wide" :class="isEliminatedImpostor ? 'bg-white border-green-200 text-green-700' : 'bg-white border-red-200 text-red-700'">
                    {{ isEliminatedImpostor ? 'Un impostor menos en la nave.' : 'Han sacrificado a un tripulante inocente.' }}
                </div>
            </template>
            
        </div>
        
        <!-- TIMER -->
        <div class="mt-8 text-center bg-white/80 p-4 rounded-3xl border-[3px] border-white shadow-sm inline-block">
            <p class="text-[10px] uppercase tracking-widest font-black mb-1 text-ink-muted">{{ matchOver ? 'Fin de la Partida' : 'Siguiente Deducción en' }}</p>
            <div class="text-3xl font-mono font-black transition-colors leading-none" :class="timerColor">{{ Math.max(0, timeRemaining) }}</div>
        </div>
    </div>
</template>
