<script setup lang="ts">
import { computed } from 'vue';
import { RoomState } from '../../../../shared/types';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
    status: RoomState['status'];
    amIHost: boolean;
    canStop: boolean;
    cooldown: boolean;
    hasConfirmed: boolean;
    myProgress: { current: number, total: number };
    isStopping?: boolean;
    // [P11] Nuevas props
    graceSecondsLeft?: number;
    isGraceActive?: boolean;
    endingCountdownBy?: string | null;
    isSpectator?: boolean;
    readyResultsCount?: number;
    activePlayersCount?: number;
}>();

defineEmits<{
    (e: 'stop'): void;
    (e: 'confirm-votes'): void;
    (e: 'next-round'): void;
}>();

// FASE 3: Porcentaje de progreso para la barra visual
const progressPercent = computed(() => {
    if (!props.myProgress.total) return 0;
    return Math.round((props.myProgress.current / props.myProgress.total) * 100);
});

const { t } = useI18n();

// [P11] Jerarquía de estados del botón Basta
const isEnding = computed(() => props.status === 'ENDING_COUNTDOWN');
const isButtonDisabled = computed(() =>
    props.isStopping ||
    isEnding.value ||
    !!props.isGraceActive ||
    !props.canStop
);

const buttonLabel = computed(() => {
    if (isEnding.value) return t('gameFooter.someoneStopped', { name: props.endingCountdownBy ?? 'Alguien' });
    if (props.isStopping) return t('gameFooter.sending');
    if (props.isGraceActive) return t('gameFooter.waitGrace', { seconds: props.graceSecondsLeft });
    if (!props.canStop) return t('gameFooter.completeAll');
    return t('gameFooter.stop');
});
</script>

<template>
    <div v-if="status !== 'REVIEW'" class="flex-none bg-gradient-to-t from-panel-base via-panel-base/90 to-transparent p-4 pb-safe pt-10 -mt-6 z-30 pointer-events-none"
         :class="status === 'RESULTS' ? 'lg:pr-[216px]' : ''"
    >
        <div class="w-full max-w-xl mx-auto flex flex-col items-center gap-2 pointer-events-auto">

            <!-- ═══════════════════════════════════════════ -->
            <!-- PLAYING / ENDING_COUNTDOWN: Botón BASTA    -->
            <!-- ═══════════════════════════════════════════ -->
            <template v-if="status === 'PLAYING' || status === 'ENDING_COUNTDOWN'">
                <!-- Barra de progreso — Soft-Pop: amarillo -> verde -->
                <div class="w-full flex items-center gap-3 px-1">
                    <div class="flex-1 h-2 bg-panel-card/80 rounded-full overflow-hidden shadow-inner">
                        <div
                            class="h-full rounded-full transition-all duration-500"
                            :class="progressPercent === 100
                                ? 'bg-game-green'
                                : progressPercent >= 50
                                    ? 'bg-game-yellow'
                                    : 'bg-game-yellow/60'"
                            :style="{ width: progressPercent + '%' }"
                        ></div>
                    </div>
                    <span class="text-[11px] font-black text-ink-soft tabular-nums whitespace-nowrap">
                        {{ myProgress.current }}<span class="text-ink-muted">/{{ myProgress.total }}</span>
                    </span>
                </div>

                <!-- [Sprint 5 - Spectator Mode] Audience Passive Status -->
                <div v-if="isSpectator"
                    class="w-full text-center text-game-yellow bg-game-yellow/10 border-2 border-game-yellow/30 rounded-full text-sm font-heading font-black uppercase tracking-widest animate-pulse py-3.5 flex items-center justify-center gap-2"
                >
                    <span class="text-lg">👀</span> {{ t('gameFooter.playersTyping') }}
                </div>

                <!-- Botón BASTA — Soft-Pop 3D squishy -->
                <button
                    v-else
                    @click="$emit('stop')"
                    :title="isGraceActive ? `Debes esperar el tiempo de gracia inicial antes de poder gritar BASTA.` : undefined"
                    class="w-full font-heading font-black py-5 rounded-[2rem] uppercase tracking-widest text-xl
                           flex items-center justify-center gap-3
                           transition-all duration-75"
                    :class="isEnding
                        ? 'bg-game-red/50 text-white/70 shadow-none cursor-not-allowed animate-pulse translate-y-[6px]'
                        : isButtonDisabled
                            ? 'bg-panel-card text-ink-muted shadow-none translate-y-[6px] cursor-not-allowed'
                            : 'bg-game-red text-white shadow-3d-red hover:bg-game-red/90 active:shadow-none active:translate-y-[6px]'
                    "
                    :disabled="isButtonDisabled"
                >
                    <span>{{ buttonLabel }}</span>
                </button>
            </template>

            <!-- RESULTS: Siguiente Ronda -->
            <template v-if="status === 'RESULTS'">
                <button
                    v-if="amIHost"
                    @click="$emit('next-round')"
                    class="w-full font-heading font-black text-xl py-5 rounded-[2rem]
                           bg-game-green text-panel-base shadow-3d-green
                           hover:bg-game-green/90
                           active:shadow-none active:translate-y-[6px]
                           transition-all duration-75 uppercase tracking-widest
                           flex items-center justify-center gap-2"
                >
                    {{ t('gameFooter.nextRound') }} <span class="text-2xl">⚡</span>
                </button>
                <div
                    v-else
                    class="w-full text-center text-game-yellow bg-game-yellow/10 border-2 border-game-yellow/30 rounded-full text-sm font-heading font-black uppercase tracking-widest animate-pulse py-3.5 flex items-center justify-center gap-2"
                >
                    <span class="text-lg">⏳</span> {{ t('gameFooter.waitingHost') }}
                </div>
            </template>

        </div>
    </div>
</template>
