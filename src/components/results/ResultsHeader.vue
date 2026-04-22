<script setup lang="ts">
import { useGame } from '../../composables/useGame';
import ConfettiCanvas from '../ui/ConfettiCanvas.vue';

const { gameState } = useGame();

// Exposición de props para el shell padre de GameOverView
defineProps<{
    iWon: boolean;
    amIHost: boolean;
}>();
</script>

<template>
    <!-- Confeti para el ganador -->
    <ConfettiCanvas v-if="iWon" class="z-10" />

    <!-- HEADER con título dinámico: componente en flujo normal, sin posicionamiento absoluto -->
    <div class="text-center">
        <template v-if="gameState.gameOverReason === 'ABANDONED'">
            <h2 class="text-5xl sm:text-6xl md:text-7xl lg:text-[5rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-action-primary to-purple-500 drop-shadow-[0_5px_15px_rgba(168,85,247,0.5)] uppercase tracking-tighter mix-blend-screen animate-pulse">¡VICTORIA!</h2>
            <div class="mt-6 bg-panel-card/80 backdrop-blur-md px-6 py-3 rounded-2xl inline-block border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                <p class="text-purple-400 text-xl font-black uppercase tracking-widest">🏆 Por Abandono</p>
                <p class="text-white/70 font-bold text-sm mt-1">Tus rivales huyeron despavoridos.</p>
            </div>
        </template>
        <template v-else-if="gameState.config.mode === 'IMPOSTOR'">
            <h2 class="text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black animate-pulse uppercase"
                style="line-height: 1.1;"
                :class="gameState.impostorData?.cycleResult?.winner === 'IMPOSTOR' ? 'text-action-error drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]' : 'text-tuti-teal drop-shadow-[0_0_30px_rgba(106,215,229,0.8)]'">
                {{ gameState.impostorData?.cycleResult?.winner === 'IMPOSTOR' ? '¡IMPOSTORES GANAN!' : '¡TRIPULACIÓN GANA!' }}
            </h2>
        </template>
        <template v-else>
            <h2 class="text-6xl sm:text-7xl md:text-[5rem] lg:text-[6.5rem] font-black drop-shadow-[0_4px_20px_rgba(250,204,21,0.3)] animate-pulse"
                style="line-height: 1.1;"
                :class="iWon ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600' : 'text-action-error drop-shadow-[0_4px_20px_rgba(244,63,94,0.3)]'">
                {{ iWon ? '¡VICTORIA!' : 'GAME OVER' }}
            </h2>
        </template>
        <div v-if="gameState.config.mode !== 'IMPOSTOR'" class="inline-block mt-4 bg-panel-base/60 backdrop-blur-xl border border-white/10 px-6 py-2.5 rounded-full shadow-lg">
            <p class="text-yellow-400 font-bold text-sm lg:text-base tracking-[0.4em] uppercase">Podio Final</p>
        </div>
    </div>
</template>
