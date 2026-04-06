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
    <div class="fixed inset-0 z-[100] flex flex-col items-center justify-center text-center overflow-hidden bg-black transition-colors duration-1000">
        
        <!-- Spotlight Radial FX (Cinematic) -->
        <div class="absolute inset-0 z-0 pointer-events-none transition-colors duration-1000"
             :class="(eliminatedPlayer && !isEliminatedImpostor) 
                ? 'bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.25)_0%,_rgba(0,0,0,1)_80%)]' 
                : 'bg-[radial-gradient(circle_at_center,_rgba(106,215,229,0.20)_0%,_rgba(0,0,0,1)_80%)]'">
        </div>

        <div class="z-10 flex flex-col items-center justify-between w-full h-full max-w-5xl md:max-w-[90%] mx-auto px-4 py-8 relative">
            
            <!-- CONTENIDO CENTRAL FLEXIBLE (Scrollable si es muy alto) -->
            <div class="flex-1 flex flex-col items-center justify-center w-full gap-4 pt-6 overflow-y-auto scrollbar-thin">
                
                <!-- HEADER DE RESULTADO Brutalista -->
                <h1 class="font-black uppercase tracking-tighter leading-[0.9] flex-none text-[3rem] md:text-6xl lg:text-[7rem] w-full text-balance"
                    :class="(isEliminatedImpostor || !eliminatedPlayer) ? 'text-tuti-teal drop-shadow-[0_0_50px_rgba(106,215,229,0.6)]' : 'text-action-error drop-shadow-[0_0_50px_rgba(239,68,68,0.6)]'">
                    <template v-if="!eliminatedPlayer">EMPATE TRIBUNAL</template>
                    <template v-else-if="isEliminatedImpostor">IMPOSTOR CAZADO</template>
                    <template v-else>INOCENTE EXPULSADO</template>
                </h1>
                
                <p class="text-xl md:text-3xl text-white/80 font-black uppercase tracking-widest max-w-3xl mt-4 leading-tight">
                    <template v-if="eliminatedPlayer">
                        El tribunal ha expulsado a <br/>
                        <span class="text-white font-black text-3xl md:text-5xl lg:text-6xl mt-4 text-balance leading-none block" :class="isEliminatedImpostor ? 'drop-shadow-[0_0_40px_rgba(106,215,229,0.8)]' : 'drop-shadow-[0_0_40px_rgba(239,68,68,0.8)]'">
                            {{ eliminatedPlayer.name }}
                        </span>
                    </template>
                    <template v-else>
                        Nadie ha sido expulsado hoy.
                    </template>
                </p>

                <!-- DETALLES FLOTANTES -->
                <div class="mt-4 md:mt-8 text-2xl md:text-4xl font-black uppercase tracking-[0.3em] opacity-90">
                    <div v-if="!eliminatedPlayer" class="text-white/60">
                        Todos sobreviven.
                    </div>
                    <div v-else :class="isEliminatedImpostor ? 'text-tuti-teal drop-shadow-[0_0_30px_rgba(106,215,229,0.5)]' : 'text-action-error drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]'">
                        {{ isEliminatedImpostor ? 'Era un Impostor.' : 'Era Inocente.' }}
                    </div>
                </div>

                <!-- PALABRAS POR JUGADOR + REACCIONES -->
                <div v-if="!matchOver" class="w-full max-w-2xl mt-8 flex flex-col gap-3 relative z-10 flex-none pb-8">
                    <div
                        v-for="player in players"
                        :key="player.id"
                        class="flex items-center justify-between bg-white/5 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/10 shadow-lg"
                    >
                        <div class="flex items-center gap-3 min-w-0 flex-1">
                            <span class="text-xl md:text-2xl flex-shrink-0">{{ player.avatar || '👤' }}</span>
                            <span class="text-sm md:text-base font-black text-white/60 truncate uppercase tracking-wider">{{ player.name }}</span>
                            <span class="text-xs md:text-lg font-black text-white ml-2 truncate">
                                {{ impostorData.words ? impostorData.words[player.id] : '—' }}
                            </span>
                        </div>
                        
                        <ReactionMenu
                            :target-player-id="player.id"
                            :category-id="impostorData.currentCategoryName"
                            @react="(emoji, tid, cid) => sendReaction(tid, cid, emoji)"
                        />
                    </div>
                </div>

            </div>

            <!-- ANCLA FANTASMA AL FONDO (Timer o Veredicto) -->
            <div class="mt-auto flex-none flex flex-col items-center justify-end pt-4 pb-2 w-full">
                <div v-if="matchOver" class="opacity-60 animate-pulse text-center w-full">
                    <p class="text-[10px] md:text-xs text-white/50 uppercase tracking-[0.4em] font-black">Fin de la partida. Calculando veredicto...</p>
                </div>
                
                <div v-else class="text-4xl md:text-5xl font-black font-mono animate-pulse drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]" 
                     :class="timerColor">
                    {{ Math.max(0, timeRemaining) }}
                </div>
            </div>

        </div>
    </div>
</template>
