<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import type { ImpostorData, Player } from '../../../../shared/types';
import { useGame } from '../../../composables/useGame';
import { useSocket, lastWishText } from '../../../composables/useSocket';
import { useSound } from '../../../composables/useSound';
import { EVENTS } from '../../../../shared/consts';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const { localImpostorRole } = useGame();

const props = defineProps<{
    impostorData: ImpostorData;
    players: Player[];
    myUserId: string;
    timeRemaining: number;
    timerColor: string;
    isSpectator?: boolean;
}>();

const { socket } = useSocket();
const { playClick } = useSound();

const guess = ref('');
const submitted = ref(false);

const isImpostor = computed(() => localImpostorRole.value?.role === 'impostor');

// Limpiar texto en vivo al desmontar
onMounted(() => { lastWishText.value = ''; });
onBeforeUnmount(() => { lastWishText.value = ''; });

// Retransmitir lo que escribe el Impostor a todos en tiempo real
const onInput = () => {
    if (!isImpostor.value || submitted.value) return;
    socket.value?.send(JSON.stringify({
        type: EVENTS.LAST_WISH_TYPING,
        payload: { text: guess.value }
    }));
};

const submitGuess = () => {
    if (submitted.value || !guess.value.trim()) return;
    submitted.value = true;
    playClick();
    socket.value?.send(JSON.stringify({
        type: EVENTS.SUBMIT_LAST_WISH,
        payload: { guess: guess.value.trim() }
    }));
};

const onEnter = () => submitGuess();

// Jugador eliminado (el Impostor atrapado)
const eliminatedPlayer = computed(() =>
    props.players.find(p => p.id === props.impostorData.cycleResult?.eliminatedId)
);
</script>

<template>
    <div class="fixed inset-0 z-overlay flex flex-col items-center justify-center text-center overflow-hidden bg-black">
        
        <!-- Spotlight Radial FX -->
        <div class="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.25)_0%,_rgba(0,0,0,1)_80%)]" />

        <div class="z-10 flex flex-col items-center justify-between w-full h-full max-w-5xl md:max-w-[90%] mx-auto px-4 py-[clamp(0.5rem,2dvh,2rem)] relative">
            
            <div class="flex-1 flex flex-col items-center justify-center w-full min-h-0 gap-[clamp(0.2rem,1.5dvh,1.5rem)]">
                
                <!-- Eliminado Info -->
                <div class="flex-none flex flex-col items-center">
                    <p class="text-[clamp(0.7rem,1.5vw,1rem)] uppercase tracking-[0.4em] text-white/40 font-black mb-1">
                        {{ eliminatedPlayer?.avatar || '☠️' }} {{ eliminatedPlayer?.name || t('impostorLastWish.theImpostor') }} {{ t('impostorLastWish.wasCaught') }}
                    </p>
                </div>

                <!-- Título Liquido -->
                <div class="flex flex-col items-center flex-none w-full">
                    <span class="text-[clamp(2.5rem,6vw,4rem)] shrink-0 drop-shadow-md">⚰️</span>
                    <h1 class="font-black uppercase tracking-tighter leading-[0.9] text-[clamp(4rem,9vw,8rem)] w-full text-balance text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.6)]">
                        {{ t('impostorLastWish.title') }}
                    </h1>
                </div>

                <!-- Countdown -->
                <div class="text-[clamp(4.5rem,10vw,8rem)] font-mono font-black tabular-nums leading-none drop-shadow-[0_0_40px_rgba(239,68,68,0.5)] shrink-0"
                     :class="timeRemaining <= 4 ? 'text-action-error animate-pulse' : 'text-action-error/90'">
                    {{ Math.max(0, timeRemaining) }}
                </div>

                <!-- ── VISTA IMPOSTOR ── -->
                <template v-if="isImpostor">
                    <div class="flex-none w-full max-w-3xl mx-auto flex flex-col gap-[clamp(0.5rem,1dvh,1rem)] justify-center min-h-0">
                        <!-- Instrucciones reducidas en altura -->
                        <div class="shrink-0 flex flex-col gap-1">
                            <p class="text-[clamp(1.1rem,2.5vw,2rem)] text-white/80 font-black uppercase tracking-widest leading-tight">
                                ¿{{ t('impostorLastWish.whatWasSecret') }} <span class="text-action-error drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">{{ t('impostorLastWish.secretWord') }}</span>?
                            </p>
                            <span class="text-[clamp(0.8rem,1.5vw,1rem)] text-white/40 uppercase tracking-[0.2em] font-black">{{ t('impostorLastWish.oneChance') }}</span>
                        </div>

                        <!-- Formulario Flex Shrink-0 -->
                        <div class="w-full max-w-xl mx-auto flex flex-col gap-[clamp(0.5rem,1.5dvh,1rem)] shrink-0">
                            <input
                                v-model="guess"
                                :disabled="submitted"
                                type="text"
                                :placeholder="t('impostorLastWish.inputPlaceholder')"
                                maxlength="80"
                                autofocus
                                @input="onInput"
                                @keydown.enter="onEnter"
                                class="w-full text-center text-[clamp(1.5rem,3vw,3rem)] font-black text-white bg-white/5 backdrop-blur-md rounded-xl px-4 py-[clamp(0.5rem,2dvh,1.5rem)] outline-none placeholder-white/20 transition-all duration-300 min-h-[48px]"
                                :class="submitted
                                    ? 'border-white/10 opacity-50 cursor-not-allowed'
                                    : 'border border-action-error/40 focus:border-action-error focus:bg-white/10 shadow-[0_0_30px_rgba(239,68,68,0.2)]'"
                            />

                            <button
                                @click="submitGuess"
                                :disabled="submitted || !guess.trim()"
                                class="w-full py-[clamp(0.75rem,2.5dvh,1.5rem)] px-6 rounded-xl font-black uppercase tracking-[0.2em] text-[clamp(1rem,2vw,1.5rem)] transition-all duration-300 active:scale-95 border min-h-[44px]"
                                :class="submitted || !guess.trim()
                                    ? 'bg-white/5 border-white/5 text-white/30 cursor-not-allowed'
                                    : 'bg-action-error hover:bg-red-500 border-red-400 text-white shadow-[0_0_40px_rgba(239,68,68,0.5)] cursor-pointer'"
                            >
                                {{ submitted ? t('impostorLastWish.waiting') : t('impostorLastWish.guess') }}
                            </button>
                        </div>
                    </div>
                </template>

                <!-- ── VISTA TRIPULACIÓN / ESPECTADORES ── -->
                <template v-else>
                    <div class="flex-none w-full max-w-3xl mx-auto flex flex-col items-center gap-[clamp(0.5rem,1.5dvh,1rem)] justify-center min-h-0">
                        <div class="shrink-0 flex flex-col gap-1">
                            <p class="text-[clamp(1.2rem,2.5vw,2.5rem)] text-white/80 font-black uppercase tracking-widest leading-tight text-balance">
                                {{ t('impostorLastWish.guessing') }}
                            </p>
                            <span class="text-[clamp(0.8rem,1.5vw,1rem)] text-white/40 uppercase tracking-[0.2em] font-black">{{ t('impostorLastWish.stealVictory') }}</span>
                        </div>

                        <!-- Texto en vivo -->
                        <div class="w-full max-w-2xl bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-[clamp(1rem,2dvh,2rem)] flex items-center justify-center shrink-0 min-h-[clamp(4rem,10dvh,8rem)]">
                            <p class="text-[clamp(2rem,5vw,4rem)] font-black tracking-[0.1em] text-balance break-all"
                               :class="lastWishText ? 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]' : 'text-white/20 animate-pulse'">
                                {{ lastWishText || '...' }}
                            </p>
                        </div>

                        <p class="text-[clamp(0.7rem,1.2vw,0.9rem)] uppercase tracking-[0.4em] text-white/30 mt-1 shrink-0">
                            {{ t('impostorLastWish.liveTransmission') }}
                        </p>
                    </div>
                </template>

            </div>
        </div>
    </div>
</template>
