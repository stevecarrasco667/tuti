<script setup lang="ts">
import { computed } from 'vue';
import type { ImpostorData, Player } from '../../../../shared/types';
import { useSound } from '../../../composables/useSound';
import ReactionMenu from '../ReactionMenu.vue';
import { useSocket } from '../../../composables/useSocket';
import { EVENTS } from '../../../../shared/consts';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
    impostorData: ImpostorData;
    players: Player[];
    timeRemaining: number;
    timerColor: string;
    isSpectator?: boolean;
}>();

const { playAlarm, playSuccess } = useSound();
const { socket } = useSocket();
const { t } = useI18n();

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



// Card sizing calculation based on suspects count
const cardSize = computed(() => {
    const n = props.players.length;
    if (n <= 4) return 'lg';
    if (n <= 6) return 'md';
    return 'sm';
});

// Dynamic configuration for padding, sizing, font and list heights
const cardConfig = computed(() => {
    const size = cardSize.value;
    if (size === 'lg') {
        return {
            rowClass: 'px-4 py-2 min-h-[44px] rounded-2xl gap-3',
            avatarText: 'text-[clamp(1.2rem,2vw,1.75rem)]',
            nameText: 'text-[clamp(0.85rem,1.5vw,1.25rem)]',
            wordText: 'text-[clamp(0.85rem,1.5vw,1.25rem)] ml-2',
            reactionsCompact: false,
            listMaxHeight: 'max-h-[30dvh] sm:max-h-[38dvh]',
            titleClass: 'text-[clamp(2.2rem,6.5vw,5.5rem)] leading-[0.9]',
            subtitleClass: 'text-[clamp(0.95rem,1.8vw,1.35rem)] mt-0.5 leading-tight',
            playerNameClass: 'text-[clamp(1.8rem,5vw,3.5rem)] mt-1.5 leading-none',
            detailsClass: 'text-[clamp(1.1rem,2.2vw,2rem)] tracking-[0.3em]',
            gapClass: 'gap-[clamp(0.4rem,1.8dvh,1.5rem)] gap-y-[clamp(0.4rem,1.8dvh,1.5rem)]',
            timerClass: 'text-[clamp(3.5rem,6vw,5rem)]'
        };
    } else if (size === 'md') {
        return {
            rowClass: 'px-3.5 py-1.5 min-h-[40px] rounded-xl gap-2.5',
            avatarText: 'text-[clamp(1.1rem,1.8vw,1.5rem)]',
            nameText: 'text-[clamp(0.8rem,1.3vw,1.1rem)]',
            wordText: 'text-[clamp(0.8rem,1.3vw,1.1rem)] ml-1.5',
            reactionsCompact: true,
            listMaxHeight: 'max-h-[26dvh] sm:max-h-[34dvh]',
            titleClass: 'text-[clamp(1.8rem,5vw,4.5rem)] leading-[0.95]',
            subtitleClass: 'text-[clamp(0.85rem,1.5vw,1.15rem)] mt-0.5 leading-tight',
            playerNameClass: 'text-[clamp(1.5rem,4vw,2.8rem)] mt-1 leading-none',
            detailsClass: 'text-[clamp(0.95rem,1.8vw,1.6rem)] tracking-[0.25em]',
            gapClass: 'gap-[clamp(0.3rem,1.4dvh,1.1rem)] gap-y-[clamp(0.3rem,1.4dvh,1.1rem)]',
            timerClass: 'text-[clamp(3rem,5vw,4rem)]'
        };
    } else { // 'sm'
        return {
            rowClass: 'px-2.5 py-1 min-h-[34px] rounded-lg gap-2',
            avatarText: 'text-[clamp(0.95rem,1.5vw,1.2rem)]',
            nameText: 'text-[clamp(0.7rem,1.1vw,0.9rem)]',
            wordText: 'text-[clamp(0.7rem,1.1vw,0.9rem)] ml-1',
            reactionsCompact: true,
            listMaxHeight: 'max-h-[20dvh] sm:max-h-[28dvh]',
            titleClass: 'text-[clamp(1.5rem,4.5vw,3.2rem)] leading-none',
            subtitleClass: 'text-[clamp(0.75rem,1.3vw,0.95rem)] mt-0.5 leading-tight',
            playerNameClass: 'text-[clamp(1.2rem,3vw,2rem)] mt-0.5 leading-none',
            detailsClass: 'text-[clamp(0.8rem,1.5vw,1.25rem)] tracking-[0.2em]',
            gapClass: 'gap-[clamp(0.2rem,1dvh,0.8rem)] gap-y-[clamp(0.2rem,1dvh,0.8rem)]',
            timerClass: 'text-[clamp(2.5rem,4vw,3.2rem)]'
        };
    }
});

// Sound effects on mount
if (!matchOver.value && eliminatedPlayer.value) {
    if (isEliminatedImpostor.value) playSuccess();
    else playAlarm();
}
</script>

<template>
    <div class="fixed inset-0 z-overlay flex flex-col items-center justify-center text-center overflow-hidden bg-black transition-colors duration-1000">
        
        <!-- Spotlight Radial FX (Cinematic) -->
        <div class="absolute inset-0 z-0 pointer-events-none transition-colors duration-1000"
             :class="(eliminatedPlayer && !isEliminatedImpostor) 
                ? 'bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.25)_0%,_rgba(0,0,0,1)_80%)]' 
                : 'bg-[radial-gradient(circle_at_center,_rgba(106,215,229,0.20)_0%,_rgba(0,0,0,1)_80%)]'">
        </div>

        <div class="z-10 flex flex-col items-center justify-between w-full h-full max-w-5xl md:max-w-[90%] mx-auto px-4 py-[clamp(0.5rem,2dvh,1.5rem)] relative">
            
            <!-- CONTENIDO CENTRAL FLEXIBLE -->
            <div class="flex-1 flex flex-col items-center w-full overflow-y-auto scrollbar-none md:scrollbar-thin min-h-0 px-2 relative z-10">
                <div class="my-auto flex flex-col items-center w-full" :class="cardConfig.gapClass">
                    
                    <!-- HEADER DE RESULTADO Brutalista -->
                    <h1 class="font-black uppercase tracking-tighter flex-none w-full text-balance shrink-0"
                        :class="[
                            cardConfig.titleClass,
                            (isEliminatedImpostor || !eliminatedPlayer) ? 'text-tuti-teal drop-shadow-[0_0_50px_rgba(106,215,229,0.6)]' : 'text-action-error drop-shadow-[0_0_50px_rgba(239,68,68,0.6)]'
                        ]">
                        <template v-if="!eliminatedPlayer">{{ t('impostorResults.tie') }}</template>
                        <template v-else-if="isEliminatedImpostor">{{ t('impostorResults.hunted') }}</template>
                        <template v-else>{{ t('impostorResults.innocent') }}</template>
                    </h1>
                    
                    <p class="text-white/80 font-black uppercase tracking-widest max-w-3xl leading-tight shrink-0" :class="cardConfig.subtitleClass">
                        <template v-if="eliminatedPlayer">
                            {{ t('impostorResults.expelled') }} <br/>
                            <span class="text-white font-black text-balance block shrink-0" 
                                  :class="[
                                      cardConfig.playerNameClass,
                                      isEliminatedImpostor ? 'drop-shadow-[0_0_40px_rgba(106,215,229,0.8)]' : 'drop-shadow-[0_0_40px_rgba(239,68,68,0.8)]'
                                  ]">
                                {{ eliminatedPlayer.name }}
                            </span>
                        </template>
                        <template v-else>
                            {{ t('impostorResults.nobodyExpelled') }}
                        </template>
                    </p>

                    <!-- DETALLES FLOTANTES -->
                    <div class="font-black uppercase opacity-90 shrink-0" :class="cardConfig.detailsClass">
                        <div v-if="!eliminatedPlayer" class="text-white/60">
                            {{ t('impostorResults.allSurvive') }}
                        </div>
                        <div v-else :class="isEliminatedImpostor ? 'text-tuti-teal drop-shadow-[0_0_30px_rgba(106,215,229,0.5)]' : 'text-action-error drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]'">
                            {{ isEliminatedImpostor ? t('impostorResults.wasImpostor') : t('impostorResults.wasInnocent') }}
                        </div>
                    </div>

                    <!-- PALABRAS POR JUGADOR + REACCIONES -->
                    <div v-if="!matchOver" 
                         class="w-full max-w-2xl mt-1.5 flex flex-col gap-2 relative z-10 overflow-y-auto scrollbar-thin px-1 pt-6 pb-2 shrink-0"
                         :class="cardConfig.listMaxHeight"
                    >
                        <div
                            v-for="player in players"
                            :key="player.id"
                            class="flex items-center justify-between bg-white/5 backdrop-blur-md border border-white/10 shadow-lg"
                            :class="cardConfig.rowClass"
                        >
                            <div class="flex items-center min-w-0 flex-1">
                                <span class="flex-shrink-0" :class="cardConfig.avatarText">{{ player.avatar || '👤' }}</span>
                                <span class="font-black text-white/60 truncate uppercase tracking-wider" :class="cardConfig.nameText">{{ player.name }}</span>
                                <span class="font-black text-white truncate" :class="cardConfig.wordText">
                                    {{ impostorData.words ? impostorData.words[player.id] : '—' }}
                                </span>
                            </div>
                            
                            <ReactionMenu
                                :target-player-id="player.id"
                                :category-id="impostorData.currentCategoryId"
                                :is-compact="cardConfig.reactionsCompact"
                                @react="(emoji, tid, cid) => sendReaction(tid, cid, emoji)"
                            />
                        </div>
                    </div>

                </div>
            </div>

            <!-- ANCLA FANTASMA AL FONDO -->
            <div class="mt-auto flex-none flex flex-col items-center justify-end w-full shrink-0 pt-1 pb-1">
                <div v-if="matchOver" class="opacity-60 animate-pulse text-center w-full">
                    <p class="text-[clamp(0.7rem,1.2vw,1rem)] text-white/50 uppercase tracking-[0.4em] font-black">{{ t('impostorResults.calculatingVerdict') }}</p>
                </div>
                
                <div v-else class="font-black font-mono animate-pulse drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] leading-none" 
                     :class="[timerColor, cardConfig.timerClass]">
                    {{ Math.max(0, timeRemaining) }}
                </div>
            </div>

        </div>
    </div>
</template>
