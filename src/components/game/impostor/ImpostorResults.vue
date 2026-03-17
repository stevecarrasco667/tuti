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
const winner = computed(() => result.value?.winner);
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

// [P10] Datos del Último Deseo
const lastWishGuess = computed(() => result.value?.lastWishGuess ?? null);
const lastWishSuccess = computed(() => result.value?.lastWishSuccess ?? false);
const wasLastWish = computed(() => lastWishGuess.value !== null);

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
         :class="matchOver && winner === 'IMPOSTOR' ? 'border-action-error/80 shadow-[0_0_40px_rgba(239,68,68,0.2)]' : 'border-tuti-teal/80 shadow-[0_0_40px_rgba(106,215,229,0.2)]'">
        
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
             :class="(!eliminatedPlayer || isEliminatedImpostor) ? 'border-tuti-teal bg-tuti-teal/5' : 'border-action-error bg-action-error/5'">
            
            <template v-if="matchOver">
                <!-- [P10] Impostor robó la victoria adivinando la categoría -->
                <template v-if="lastWishSuccess">
                    <span class="text-6xl mb-4 drop-shadow-md">🃏</span>
                    <p class="text-lg text-ink-main font-black uppercase tracking-widest mb-2">Categoría robada en el último instante.</p>
                    <p class="text-sm text-ink-soft">
                        La tripulación lo atrapó, pero el Impostor adivinó
                        <span class="font-black text-action-error">&ldquo;{{ impostorData.currentCategoryName }}&rdquo;</span>
                        y robó la victoria.
                    </p>
                </template>
                <!-- [P10] Impostor falló o tiempo agotó -->
                <template v-else-if="wasLastWish">
                    <span class="text-6xl mb-4 drop-shadow-md">🎯</span>
                    <p class="text-lg text-ink-main font-black uppercase tracking-widest mb-2">El impostor intentó adivinar. Falló.</p>
                    <p class="text-sm text-ink-soft">
                        Escribió <span class="font-black text-white/70">&ldquo;{{ lastWishGuess }}&rdquo;</span>
                        pero la categoría era
                        <span class="font-black text-action-primary">&ldquo;{{ impostorData.currentCategoryName }}&rdquo;</span>.
                        La Tripulación sobrevive.
                    </p>
                </template>
                <!-- Flujo normal sin last_wish -->
                <template v-else>
                    <span class="text-6xl mb-4 drop-shadow-md">{{ winner === 'IMPOSTOR' ? '🦇' : '🎯' }}</span>
                    <p class="text-lg text-ink-main font-black uppercase tracking-widest">{{ winner === 'IMPOSTOR' ? 'Los impostores controlan la nave.' : 'La tripulación purificó la nave.' }}</p>
                </template>
            </template>
            <template v-else>
                <div v-if="!eliminatedPlayer" class="text-sm font-black text-ink-muted bg-panel-input px-4 py-3 rounded-2xl shadow-inner border-2 border-white/10 w-full uppercase tracking-widest">
                    Los votos se dividieron. Todos sobreviven a esta ronda.
                </div>
                <div v-else class="text-sm font-black w-full rounded-2xl px-4 py-3 border-2 shadow-inner uppercase tracking-wide" :class="isEliminatedImpostor ? 'bg-tuti-teal/20 border-tuti-teal/40 text-tuti-teal' : 'bg-action-error/20 border-action-error/40 text-action-error'">
                    {{ isEliminatedImpostor ? 'Un impostor menos en la nave.' : 'Han sacrificado a un tripulante inocente.' }}
                </div>
            </template>
            
        </div>

        <!-- PALABRAS POR JUGADOR + REACCIONES -->
        <div v-if="!matchOver" class="w-full max-w-xl mt-4 flex flex-col gap-2">
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
