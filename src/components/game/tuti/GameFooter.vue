<script setup lang="ts">
import { computed } from 'vue';
import { RoomState } from '../../../../shared/types';

const props = defineProps<{
    status: RoomState['status'];
    amIHost: boolean;
    canStop: boolean;
    cooldown: boolean;
    hasConfirmed: boolean;
    myProgress: { current: number, total: number };
    isStopping?: boolean;
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
</script>

<template>
    <div v-if="status !== 'REVIEW'" class="flex-none bg-gradient-to-t from-panel-base via-panel-base/90 to-transparent p-4 pb-safe pt-10 -mt-6 z-30 pointer-events-none">
        <div class="w-full max-w-lg mx-auto flex flex-col items-center gap-2 pointer-events-auto">

            <!-- ═══════════════════════════════════════════ -->
            <!-- PLAYING: Barra de Progreso + Botón BASTA   -->
            <!-- ═══════════════════════════════════════════ -->
            <template v-if="status === 'PLAYING'">
                <!-- Barra de progreso integrada (FASE 3) -->
                <div class="w-full flex items-center gap-3 px-1">
                    <div class="flex-1 h-1.5 bg-panel-card/80 rounded-full overflow-hidden shadow-inner">
                        <div
                            class="h-full rounded-full transition-all duration-500"
                            :class="progressPercent === 100 ? 'bg-action-primary shadow-[0_0_8px_rgba(74,222,128,0.7)]' : 'bg-action-blue'"
                            :style="{ width: progressPercent + '%' }"
                        ></div>
                    </div>
                    <span class="text-[11px] font-black text-ink-soft tabular-nums whitespace-nowrap">
                        {{ myProgress.current }}<span class="text-ink-muted">/{{ myProgress.total }}</span>
                    </span>
                </div>

                <!-- Botón BASTA (ancho completo, centrado, prominente) -->
                <button
                    @click="$emit('stop')"
                    class="w-full bg-action-error hover:bg-red-500 text-white font-black text-2xl py-4 rounded-3xl shadow-game-btn transition-all active:scale-[0.98] flex items-center justify-center gap-3 border-4 border-white/90 uppercase tracking-widest"
                    :class="{
                        'opacity-60 saturate-50 cursor-not-allowed shadow-none': (!canStop && !cooldown) || isStopping,
                        'animate-shake': cooldown,
                        'shadow-[0_0_30px_-5px_rgba(239,68,68,0.6)]': canStop && !isStopping
                    }"
                    :disabled="isStopping"
                >
                    <span class="text-3xl drop-shadow-sm">{{ isStopping ? '⏳' : '✋' }}</span>
                    <span class="drop-shadow-sm">{{ isStopping ? 'ENVIANDO...' : 'BASTA' }}</span>
                </button>
            </template>

            <!-- ═══════════════════════════════════════════ -->
            <!-- RESULTS: Siguiente Ronda / Esperando       -->
            <!-- ═══════════════════════════════════════════ -->
            <button
                v-if="status === 'RESULTS' && amIHost"
                @click="$emit('next-round')"
                class="w-full bg-action-primary hover:bg-action-hover text-white font-black text-xl py-4 rounded-3xl shadow-[0_0_30px_-5px_rgba(74,222,128,0.4)] border-4 border-green-300 transition-all active:scale-[0.98] uppercase tracking-wide flex items-center justify-center gap-2"
            >
                Siguiente Ronda <span class="text-2xl">⚡</span>
            </button>
            <div
                v-else-if="status === 'RESULTS'"
                class="w-full text-center text-amber-500 bg-panel-input border-2 border-amber-500/30 shadow-[0_0_30px_-5px_rgba(245,158,11,0.2)] backdrop-blur-sm rounded-full text-sm font-black uppercase tracking-widest animate-[pulse_2s_ease-in-out_infinite] py-3.5 flex items-center justify-center gap-2"
            >
                <span class="text-lg">⏳</span> Esperando al anfitrión...
            </div>

        </div>
    </div>
</template>
