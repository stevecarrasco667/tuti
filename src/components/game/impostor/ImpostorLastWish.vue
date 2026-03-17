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
    <!-- Contenedor principal con aura roja de tensión -->
    <div class="relative h-full w-full flex flex-col items-center justify-center p-6 text-center rounded-3xl overflow-hidden m-2 md:m-4
                bg-[#0d0608] border-[4px] border-action-error/80 shadow-[0_0_60px_rgba(239,68,68,0.35),inset_0_0_80px_rgba(239,68,68,0.05)]">

        <!-- Fondo pulsante de tensión -->
        <div class="absolute inset-0 bg-action-error/5 animate-pulse rounded-3xl pointer-events-none" />

        <!-- Nombre del impostor eliminado -->
        <p class="text-xs uppercase tracking-[0.3em] text-action-error/70 font-black mb-2 z-10">
            {{ eliminatedPlayer?.avatar || '☠️' }} {{ eliminatedPlayer?.name || 'El Impostor' }} ha sido atrapado
        </p>

        <!-- Título -->
        <h1 class="text-4xl md:text-6xl font-black tracking-tighter uppercase text-white drop-shadow-2xl mb-3 z-10">
            ⚰️ Último Deseo
        </h1>

        <!-- Countdown -->
        <div class="text-5xl md:text-7xl font-mono font-black mb-6 z-10 tabular-nums"
             :class="timeRemaining <= 4 ? 'text-action-error animate-pulse' : 'text-white/90'">
            {{ Math.max(0, timeRemaining) }}
        </div>

        <!-- ── VISTA IMPOSTOR ── -->
        <template v-if="isImpostor">
            <p class="text-sm text-white/60 uppercase tracking-widest mb-4 z-10">
                ¿Cuál era la categoría secreta?<br>
                <span class="text-white/40 text-xs">Tienes una sola oportunidad. Si fallas, la tripulación gana.</span>
            </p>

            <div class="w-full max-w-md z-10">
                <input
                    v-model="guess"
                    :disabled="submitted"
                    type="text"
                    placeholder="Escribe la categoría..."
                    maxlength="80"
                    autofocus
                    @input="onInput"
                    @keydown.enter="onEnter"
                    class="w-full text-center text-2xl md:text-3xl font-black text-white bg-white/10 border-2 rounded-2xl px-6 py-4 outline-none placeholder-white/20 transition-all duration-200 focus:bg-white/15 mb-4"
                    :class="submitted
                        ? 'border-white/20 opacity-50 cursor-not-allowed'
                        : 'border-action-error/60 focus:border-action-error shadow-[0_0_20px_rgba(239,68,68,0.2)]'"
                />

                <button
                    @click="submitGuess"
                    :disabled="submitted || !guess.trim()"
                    class="w-full py-4 px-8 rounded-2xl font-black uppercase tracking-widest text-lg transition-all duration-200 active:scale-95 border-2"
                    :class="submitted || !guess.trim()
                        ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                        : 'bg-action-error hover:bg-red-600 border-red-400 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)] cursor-pointer'"
                >
                    {{ submitted ? '⏳ Esperando resultado...' : '🎯 Adivinar Ahora' }}
                </button>
            </div>
        </template>

        <!-- ── VISTA TRIPULACIÓN / ESPECTADORES ── -->
        <template v-else>
            <p class="text-base md:text-lg text-white/70 uppercase tracking-[0.2em] font-black mb-6 max-w-md z-10">
                El impostor intenta adivinar la categoría secreta...
                <br>
                <span class="text-white/40 text-xs">Si acierta, robará la victoria en el último momento.</span>
            </p>

            <!-- Texto en vivo del Impostor -->
            <div class="w-full max-w-md bg-white/5 border-2 border-action-error/40 rounded-2xl px-6 py-5 min-h-[70px]
                        flex items-center justify-center z-10 shadow-inner transition-all duration-300">
                <p class="text-xl md:text-2xl font-black text-white tracking-wide"
                   :class="lastWishText ? 'opacity-100' : 'opacity-30'">
                    {{ lastWishText || '...' }}
                </p>
            </div>

            <p class="text-[10px] uppercase tracking-widest text-white/30 mt-3 z-10">
                Escribe en tiempo real del impostor
            </p>
        </template>

    </div>
</template>
