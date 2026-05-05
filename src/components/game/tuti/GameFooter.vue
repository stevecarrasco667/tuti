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
                <!-- [FE-3.4] Barra de progreso: amarillo → verde al completarse -->
                <div class="w-full flex items-center gap-3 px-1">
                    <div class="flex-1 h-2.5 bg-panel-card/80 rounded-full overflow-hidden border border-white/10">
                        <div
                            class="h-full rounded-full transition-all duration-500"
                            :class="progressPercent === 100
                                ? 'bg-game-green'
                                : progressPercent >= 50
                                    ? 'bg-game-yellow'
                                    : 'bg-game-orange'"
                            :style="{ width: progressPercent + '%' }"
                        ></div>
                    </div>
                    <span class="text-[11px] font-heading font-black text-ink-main tabular-nums whitespace-nowrap"
                          :class="progressPercent === 100 ? 'text-game-green' : 'text-ink-soft'">
                        {{ myProgress.current }}<span class="text-ink-muted">/{{ myProgress.total }}</span>
                    </span>
                </div>

                <!-- [Sprint 5 - Spectator Mode] Audience Passive Status -->
                <div v-if="isSpectator"
                    class="w-full text-center text-action-primary bg-panel-input border-2 border-action-primary/30 shadow-[0_0_30px_-5px_rgba(74,222,128,0.2)] backdrop-blur-sm rounded-full text-sm font-black uppercase tracking-widest animate-[pulse_2s_ease-in-out_infinite] py-3.5 flex items-center justify-center gap-2"
                >
                    <span class="text-lg">👀</span> {{ t('gameFooter.playersTyping') }}
                </div>

                <!-- [FE-3] Botón BASTA — Neo-Brutalista con press effect -->
                <button
                    v-else
                    @click="$emit('stop')"
                    :title="isGraceActive ? `Debes esperar el tiempo de gracia inicial antes de poder gritar BASTA.` : undefined"
                    class="w-full font-heading font-black py-4 rounded-xl uppercase tracking-widest text-xl flex items-center justify-center gap-3 transition-all duration-75"
                    :class="isEnding
                        ? 'bg-game-red/60 border-2 border-red-400/60 text-white opacity-90 cursor-not-allowed animate-pulse shadow-none'
                        : isButtonDisabled
                            ? 'bg-panel-card border-2 border-white/20 text-ink-muted opacity-60 cursor-not-allowed shadow-none'
                            : 'nb-btn-danger text-2xl active:translate-x-[5px] active:translate-y-[5px] active:shadow-hard-pressed'"
                    :disabled="isButtonDisabled"
                >
                    <span>{{ buttonLabel }}</span>
                </button>
            </template>

            <!-- ═══════════════════════════════════════════ -->
            <!-- RESULTS: Siguiente Ronda / Esperando       -->
            <!-- ═══════════════════════════════════════════ -->
            <!-- [FE-5.3] Botón SIGUIENTE RONDA — nb-btn-success con press effect máximo -->
            <button
                v-if="status === 'RESULTS' && amIHost"
                @click="$emit('next-round')"
                class="nb-btn-success w-full text-xl py-4 rounded-xl tracking-widest"
            >
                {{ t('gameFooter.nextRound') }} <span class="text-2xl ml-1">⚡</span>
            </button>
            <div
                v-else-if="status === 'RESULTS'"
                class="w-full text-center text-game-yellow bg-panel-input border-2 border-game-yellow/40 shadow-hard-white-sm rounded-xl text-sm font-heading font-black uppercase tracking-widest animate-pulse py-3.5 flex items-center justify-center gap-2"
            >
                <span class="text-lg">⏳</span> {{ t('gameFooter.waitingHost') }}
            </div>

        </div>
    </div>
</template>
