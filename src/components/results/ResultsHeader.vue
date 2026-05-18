<script setup lang="ts">
import { useGame } from '../../composables/useGame';
import ConfettiCanvas from '../ui/ConfettiCanvas.vue';
import { useI18n } from 'vue-i18n';

const { gameState } = useGame();
const { t } = useI18n();

// Exposición de props para el shell padre de GameOverView
defineProps<{
    iWon: boolean;
    amIHost: boolean;
}>();
</script>

<template>
    <!-- Confeti para el ganador -->
    <ConfettiCanvas v-if="iWon" class="z-10" />

    <!-- HEADER Premium: Menos parpadeo, mejor tipografía -->
    <div class="text-center relative z-20">
        <template v-if="gameState.gameOverReason === 'ABANDONED'">
            <h2 class="text-5xl sm:text-6xl md:text-7xl lg:text-[5rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-purple-300 via-purple-400 to-purple-600 drop-shadow-[0_0_20px_rgba(168,85,247,0.4)] uppercase tracking-tighter mix-blend-screen transition-transform hover:scale-105 duration-700">{{ t('results.victory') }}</h2>
            <div class="mt-4 bg-purple-900/40 backdrop-blur-md px-6 py-3 rounded-[2rem] inline-block border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                <p class="text-purple-300 text-lg font-black uppercase tracking-widest">{{ t('results.byAbandon') }}</p>
                <p class="text-white/60 font-medium text-sm mt-0.5">{{ t('results.byAbandonDesc') }}</p>
            </div>
        </template>
        <template v-else-if="gameState.config.mode === 'IMPOSTOR'">
            <h2 class="text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black uppercase tracking-tight transition-transform hover:scale-105 duration-700"
                style="line-height: 1.1;"
                :class="gameState.impostorData?.cycleResult?.winner === 'IMPOSTOR' ? 'text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-600 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-cyan-500 drop-shadow-[0_0_30px_rgba(34,211,238,0.5)]'">
                {{ gameState.impostorData?.cycleResult?.winner === 'IMPOSTOR' ? t('results.impostorsWin') : t('results.crewWin') }}
            </h2>
        </template>
        <template v-else>
            <!-- eSports Style Victory Text -->
            <div class="relative inline-block group">
                <h2 class="text-6xl sm:text-7xl md:text-[5.5rem] lg:text-[6.5rem] font-black uppercase tracking-tighter transition-transform group-hover:scale-105 duration-700"
                    style="line-height: 1.1;"
                    :class="iWon ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-400 to-amber-600 drop-shadow-[0_10px_20px_rgba(217,119,6,0.5)]' : 'text-transparent bg-clip-text bg-gradient-to-b from-rose-400 to-rose-700 drop-shadow-[0_10px_20px_rgba(225,29,72,0.4)]'">
                    {{ iWon ? t('results.victory') : t('results.gameOver') }}
                </h2>
                <!-- Decorative glow behind text -->
                <div class="absolute inset-0 blur-[40px] -z-10 opacity-40 mix-blend-screen" :class="iWon ? 'bg-yellow-500' : 'bg-rose-600'"></div>
            </div>
        </template>
        <div v-if="gameState.config.mode !== 'IMPOSTOR'" class="inline-block mt-6 bg-white/[0.03] backdrop-blur-xl border border-white/10 px-8 py-2 rounded-full shadow-lg relative overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
            <p class="text-white/70 font-bold text-xs sm:text-sm lg:text-base tracking-[0.4em] uppercase relative z-10">{{ t('results.finalPodium') || 'PODIO FINAL' }}</p>
        </div>
    </div>
</template>
