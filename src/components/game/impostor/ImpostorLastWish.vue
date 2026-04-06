<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import type { ImpostorData, Player } from '../../../../shared/types';
import { localImpostorRole } from '../../../composables/useGameState';
import { useSocket, lastWishText } from '../../../composables/useSocket';
import { useSound } from '../../../composables/useSound';
import { EVENTS } from '../../../../shared/consts';

const props = defineProps<{
    impostorData: ImpostorData;
    players: Player[];
    myUserId: string;
    timeRemaining: number;
    timerColor: string;
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
    <div class="fixed inset-0 z-[100] flex flex-col items-center justify-center text-center overflow-hidden bg-black">
        
        <!-- Spotlight Radial FX (Cinematic, Sangriento para el Último Deseo) -->
        <div class="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.25)_0%,_rgba(0,0,0,1)_80%)]" />

        <div class="z-10 flex flex-col items-center justify-between w-full h-full max-w-5xl md:max-w-[90%] mx-auto px-4 py-8 relative">
            
            <div class="flex-1 flex flex-col items-center justify-center w-full gap-6 md:gap-8 pt-8">
                
                <!-- Categoría / Jugador Eliminado -->
                <div class="flex-none flex flex-col items-center">
                    <p class="text-[10px] md:text-xs uppercase tracking-[0.4em] text-white/40 font-black mb-1">
                        {{ eliminatedPlayer?.avatar || '☠️' }} {{ eliminatedPlayer?.name || 'El Impostor' }} ha sido atrapado
                    </p>
                </div>

                <!-- Título Principal Brutalista -->
                <h1 class="font-black uppercase tracking-tighter leading-[0.9] flex-none text-[3.5rem] md:text-7xl lg:text-[8rem] w-full text-balance text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.6)]">
                    ⚰️ Último Deseo
                </h1>

                <!-- Countdown Central Integrado -->
                <div class="text-6xl md:text-[6rem] lg:text-[8rem] font-mono font-black tabular-nums leading-none drop-shadow-[0_0_40px_rgba(239,68,68,0.5)]"
                     :class="timeRemaining <= 4 ? 'text-action-error animate-pulse' : 'text-action-error/90'">
                    {{ Math.max(0, timeRemaining) }}
                </div>

                <!-- ── VISTA IMPOSTOR ── -->
                <template v-if="isImpostor">
                    <div class="flex-none w-full max-w-3xl mx-auto flex flex-col gap-4 mt-4">
                        <p class="text-lg md:text-2xl text-white/80 font-black uppercase tracking-widest leading-tight">
                            ¿Cuál era la <span class="text-action-error drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">PALABRA SECRETA</span>?
                        </p>
                        <span class="text-xs md:text-sm text-white/40 uppercase tracking-[0.2em] font-black">Tienes una sola oportunidad. Si fallas, la tripulación gana.</span>

                        <div class="w-full max-w-xl mx-auto mt-4 flex flex-col gap-4">
                            <input
                                v-model="guess"
                                :disabled="submitted"
                                type="text"
                                placeholder="Escribe la palabra..."
                                maxlength="80"
                                autofocus
                                @input="onInput"
                                @keydown.enter="onEnter"
                                class="w-full text-center text-3xl md:text-4xl font-black text-white bg-white/5 backdrop-blur-md rounded-2xl px-6 py-5 outline-none placeholder-white/20 transition-all duration-300"
                                :class="submitted
                                    ? 'border-white/10 opacity-50 cursor-not-allowed'
                                    : 'border border-action-error/40 focus:border-action-error focus:bg-white/10 shadow-[0_0_30px_rgba(239,68,68,0.2)] focus:shadow-[0_0_50px_rgba(239,68,68,0.4)]'"
                            />

                            <button
                                @click="submitGuess"
                                :disabled="submitted || !guess.trim()"
                                class="w-full py-5 px-8 rounded-2xl font-black uppercase tracking-[0.2em] text-xl transition-all duration-300 active:scale-95 border"
                                :class="submitted || !guess.trim()
                                    ? 'bg-white/5 border-white/5 text-white/30 cursor-not-allowed'
                                    : 'bg-action-error hover:bg-red-500 border-red-400 text-white shadow-[0_0_40px_rgba(239,68,68,0.5)] hover:shadow-[0_0_60px_rgba(239,68,68,0.6)] cursor-pointer'"
                            >
                                {{ submitted ? '⏳ Esperando...' : '🎯 Adivinar' }}
                            </button>
                        </div>
                    </div>
                </template>

                <!-- ── VISTA TRIPULACIÓN / ESPECTADORES ── -->
                <template v-else>
                    <div class="flex-none w-full max-w-3xl mx-auto flex flex-col gap-4 mt-4">
                        <p class="text-xl md:text-3xl text-white/80 font-black uppercase tracking-widest leading-tight text-balance">
                            El impostor intenta adivinar la palabra secreta...
                        </p>
                        <span class="text-[10px] md:text-xs text-white/40 uppercase tracking-[0.2em] font-black">Si acierta, robará la victoria en el último momento.</span>

                        <!-- Texto en vivo del Impostor (Glassmorphism sin bordes duros) -->
                        <div class="w-full max-w-2xl mx-auto mt-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl px-8 py-8 min-h-[100px] flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.05)] transition-all duration-300">
                            <p class="text-3xl md:text-5xl font-black tracking-[0.1em] text-balance break-all"
                               :class="lastWishText ? 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]' : 'text-white/20 animate-pulse'">
                                {{ lastWishText || '...' }}
                            </p>
                        </div>

                        <p class="text-[9px] md:text-[10px] uppercase tracking-[0.4em] text-white/30 mt-4">
                            Transmisión en tiempo real del impostor
                        </p>
                    </div>
                </template>

            </div>
        </div>
    </div>
</template>
