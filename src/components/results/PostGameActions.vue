<script setup lang="ts">
// [Sprint 4 - Factor K] PostGameActions — Smart Share Unificado.
// El CTO nos dice: un solo CTA prominente para viralizar. Las acciones secundarias
// (Salir) quedan visualmente relegadas para no competir con el objetivo de compartir.
defineProps<{
    amIHost: boolean;
    isCapturing: boolean;
}>();

defineEmits<{
    (e: 'restart'): void;
    (e: 'share'): void;
    (e: 'exit'): void;
}>();

import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>

<template>
    <div class="flex flex-col gap-2.5">

        <!-- ── CTA PRINCIPAL: Compartir partida ─────────────────────────── -->
        <button
            id="btn-share-summary"
            @click="$emit('share')"
            :disabled="isCapturing"
            class="w-full relative overflow-hidden group bg-gradient-to-tr from-yellow-500 via-yellow-400 to-amber-500 hover:from-yellow-400 hover:via-yellow-300 hover:to-amber-400 text-yellow-950 font-black text-xs uppercase tracking-[0.12em] py-3 rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.35)] border border-yellow-200 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-1.5"
        >
            <!-- Shimmer animado -->
            <span class="absolute inset-0 w-1/3 bg-white/30 skew-x-[-20deg] -translate-x-full group-hover:translate-x-[400%] transition-transform duration-700 ease-in-out pointer-events-none" />

            <span class="text-base leading-none">{{ isCapturing ? '⏳' : '🚀' }}</span>
            <span>{{ isCapturing ? '...' : t('results.share') }}</span>
        </button>

        <!-- ── ACCIONES PRIMARIAS: Solo para el host ─────────────────────── -->
        <button
            v-if="amIHost"
            @click="$emit('restart')"
            class="w-full bg-white/5 hover:bg-yellow-400/10 border border-white/10 hover:border-yellow-400/30 text-yellow-400/90 font-bold text-xs uppercase tracking-widest py-2 rounded-xl transition-all active:scale-95"
        >
            🔥 {{ t('results.restart') }}
        </button>
        <div
            v-else
            class="w-full flex items-center justify-center py-2 text-white/30 text-xs font-semibold uppercase tracking-widest"
        >
            ⏳ {{ t('results.waitingRestart') }}
        </div>

        <!-- ── ACCIÓN SECUNDARIA: Salir (visualmente en segundo plano) ──── -->
        <button
            @click="$emit('exit')"
            class="w-full text-white/25 hover:text-red-400/70 font-semibold text-[10px] uppercase tracking-widest py-1 transition-colors"
        >
            🚪 {{ t('gameHUD.exit') }}
        </button>
    </div>
</template>
