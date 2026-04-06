<script setup lang="ts">
import { computed } from 'vue';
import type { ImpostorData, Player } from '../../../../shared/types';
import { useSound } from '../../../composables/useSound';
import ReactionMenu from '../ReactionMenu.vue';
import { useSocket } from '../../../composables/useSocket';
import { EVENTS } from '../../../../shared/consts';

const props = defineProps<{
    impostorData: ImpostorData;
    players: Player[];
    timeRemaining: number;
    timerColor: string;
}>();

const { playAlarm, playSuccess } = useSound();
const { socket } = useSocket();

const sendReaction = (targetPlayerId: string, categoryId: string, emoji: string) => {
    socket.value?.send(JSON.stringify({
        type: EVENTS.WORD_REACT,
        payload: { targetPlayerId, categoryId, emoji }
    }));
};

const result = computed(() => props.impostorData.cycleResult);
const matchOver = computed(() => result.value?.matchOver);

const eliminatedId = computed(() => result.value?.eliminatedId);

const eliminatedPlayer = computed(() => {
    return props.players.find(p => p.id === eliminatedId.value);
});

const isEliminatedImpostor = computed(() => {
    if (!eliminatedId.value) return false;
    // Sprint 3.4: impostorIds removed from public state.
    // The server reveals impostor identity post-vote via cycleResult.revealedImpostorIds
    return result.value?.revealedImpostorIds?.includes(eliminatedId.value) ?? false;
});



// Sound effects on mount
if (!matchOver.value && eliminatedPlayer.value) {
    if (isEliminatedImpostor.value) playSuccess();
    else playAlarm();
}
</script>

<template>
    <div class="h-full w-full flex flex-col items-center justify-center p-4 text-center transition-all duration-700 bg-white/40 border-[4px] shadow-game-panel rounded-3xl m-2 md:m-4"
         :class="(eliminatedPlayer && !isEliminatedImpostor) ? 'border-action-error/80 shadow-[0_0_40px_rgba(239,68,68,0.2)]' : 'border-tuti-teal/80 shadow-[0_0_40px_rgba(106,215,229,0.2)]'">
        
        <!-- HEADER DE RESULTADO -->
        <h1 class="text-4xl md:text-6xl font-black tracking-tighter uppercase animate-pulse mb-6 drop-shadow-sm"
            :class="(isEliminatedImpostor || !eliminatedPlayer) ? 'text-tuti-teal' : 'text-action-error'">
            <template v-if="!eliminatedPlayer">EMPATE EN EL TRIBUNAL</template>
            <template v-else-if="isEliminatedImpostor">¡IMPOSTOR CAZADO!</template>
            <template v-else>¡INOCENTE EXPULSADO!</template>
        </h1>
        
        <p class="text-lg md:text-xl text-ink-soft font-black mb-8 uppercase tracking-widest max-w-lg">
            <template v-if="eliminatedPlayer">
                El tribunal ha expulsado a <span class="text-ink-main font-black underline decoration-4 underline-offset-4" :class="isEliminatedImpostor ? 'decoration-tuti-teal' : 'decoration-action-error'">{{ eliminatedPlayer.name }}</span>
            </template>
            <template v-else>
                Nadie ha sido expulsado hoy.
            </template>
        </p>

        <!-- DETALLES DE VOTACIÓN -->
        <div class="bg-panel-card border-4 p-6 md:p-8 rounded-3xl shadow-sm flex flex-col items-center max-w-xl w-[95%]"
             :class="(!eliminatedPlayer || isEliminatedImpostor) ? 'border-tuti-teal bg-tuti-teal/5' : 'border-action-error bg-action-error/5'">
            
            <div v-if="!eliminatedPlayer" class="text-sm font-black text-ink-muted bg-panel-input px-4 py-3 rounded-2xl shadow-inner border-2 border-white/10 w-full uppercase tracking-widest">
                Los votos se dividieron. Todos sobreviven a esta ronda.
            </div>
            <div v-else class="text-sm font-black w-full rounded-2xl px-4 py-3 border-2 shadow-inner uppercase tracking-wide" :class="isEliminatedImpostor ? 'bg-tuti-teal/20 border-tuti-teal/40 text-tuti-teal' : 'bg-action-error/20 border-action-error/40 text-action-error'">
                {{ isEliminatedImpostor ? 'Era un Impostor.' : 'Era Inocente.' }}
            </div>
            
        </div>

        <!-- TRANSICIÓN SUTIL SI MATCH_OVER -->
        <div v-if="matchOver" class="mt-8 flex flex-col items-center opacity-60 animate-pulse">
            <p class="text-xs text-ink-main uppercase tracking-[0.3em] font-black">Fin de la partida. Calculando veredicto...</p>
        </div>

        <!-- PALABRAS POR JUGADOR + REACCIONES -->
        <div v-else class="w-full max-w-xl mt-4 flex flex-col gap-2">
            <div
                v-for="player in players"
                :key="player.id"
                class="flex items-center justify-between bg-panel-card/60 rounded-2xl px-4 py-2 border border-white/5"
            >
                <div class="flex items-center gap-2 min-w-0">
                    <span class="text-base flex-shrink-0">{{ player.avatar || '👤' }}</span>
                    <span class="text-xs font-black text-ink-muted truncate">{{ player.name }}</span>
                    <span class="text-sm font-black text-ink-main ml-1 truncate">
                        {{ impostorData.words[player.id] || '—' }}
                    </span>
                </div>
                <ReactionMenu
                    :target-player-id="player.id"
                    :category-id="impostorData.currentCategoryName"
                    @react="(emoji, tid, cid) => sendReaction(tid, cid, emoji)"
                />
            </div>
        </div>
        
        <!-- TIMER -->
        <div class="mt-8 text-center bg-panel-card/60 p-4 rounded-3xl border-[3px] border-white/10 shadow-sm inline-block">
            <p class="text-[10px] uppercase tracking-widest font-black mb-1 text-ink-muted">{{ matchOver ? 'Fin de la Partida' : 'Siguiente Deducción en' }}</p>
            <div class="text-3xl font-mono font-black transition-colors leading-none" :class="timerColor">{{ Math.max(0, timeRemaining) }}</div>
        </div>
    </div>
</template>
