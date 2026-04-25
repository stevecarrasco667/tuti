<script setup lang="ts">
import { computed } from 'vue';
import { useGame } from '../../composables/useGame';

// [Sprint 2 - P2] Reveal del Gran Reveal del Impostor al final de la partida.
// Modo CREW: muestra los héroes + impostores descubiertos.
// Modo IMPOSTOR: muestra los impostores triunfantes.
const { gameState } = useGame();

const crewWinners = computed(() => {
    if (gameState.value.config.mode !== 'IMPOSTOR') return [];
    const impostors = gameState.value.impostorData?.cycleResult?.revealedImpostorIds || [];
    return gameState.value.players.filter(p => p.isConnected && !impostors.includes(p.id));
});

import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>

<template>
    <Transition
        enter-active-class="transition duration-1000 ease-out"
        enter-from-class="opacity-0 translate-y-8 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
    >
        <div class="flex flex-col gap-6 mt-2 w-full max-w-3xl mx-auto">

            <!-- ESCENARIO A: Victoria Tripulante -->
            <template v-if="gameState.impostorData?.cycleResult?.winner === 'CREW'">
                <!-- Héroes Sobrevivientes -->
                <div class="bg-panel-card/80 backdrop-blur-md border-[3px] border-tuti-teal/40 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    <h3 class="text-lg md:text-xl font-black text-center uppercase tracking-widest mb-6 text-tuti-teal drop-shadow-md">{{ t('impostorResults.survivingCrew') }}</h3>
                    <div class="flex flex-wrap items-center justify-center gap-4">
                        <div v-for="crew in crewWinners" :key="crew.id"
                             class="flex items-center gap-3 bg-panel-base border border-white/20 px-4 py-3 rounded-2xl shadow-lg hover:scale-105 transition-transform">
                            <span class="text-2xl md:text-3xl">{{ crew.avatar || '👤' }}</span>
                            <span class="text-ink-main font-black text-sm md:text-base uppercase tracking-wider">{{ crew.name }}</span>
                        </div>
                    </div>
                </div>
                <!-- Impostores Perdedores -->
                <div class="bg-action-error/5 backdrop-blur-md border-[2px] border-action-error/30 rounded-3xl p-5 shadow-inner">
                    <h3 class="text-sm font-black text-center uppercase tracking-widest text-action-error/80 mb-4">{{ t('impostorResults.discoveredImpostors') }}</h3>
                    <div class="flex flex-wrap items-center justify-center gap-3">
                        <div v-for="impId in gameState.impostorData?.cycleResult?.revealedImpostorIds || []" :key="impId"
                             class="flex items-center gap-2 bg-panel-base/50 border border-action-error/20 px-3 py-2 rounded-xl">
                            <span class="text-xl opacity-80">{{ gameState.players.find(p => p.id === impId)?.avatar || '👤' }}</span>
                            <span class="text-ink-muted font-bold text-xs uppercase tracking-wider">{{ gameState.players.find(p => p.id === impId)?.name }}</span>
                            <span class="text-sm ml-1">☠️</span>
                        </div>
                    </div>
                </div>
            </template>

            <!-- ESCENARIO B: Victoria Impostor -->
            <template v-else>
                <div class="bg-panel-card/80 backdrop-blur-md border-[4px] border-action-error/50 bg-action-error/10 rounded-3xl p-8 shadow-[0_0_40px_rgba(239,68,68,0.15)] relative overflow-hidden">
                    <h3 class="text-xl md:text-2xl font-black text-center uppercase tracking-widest mb-8 drop-shadow-md text-action-error">{{ t('impostorResults.impostorsWere') }}</h3>
                    <div class="flex flex-wrap items-center justify-center gap-5">
                        <div v-for="impId in gameState.impostorData?.cycleResult?.revealedImpostorIds || []" :key="impId"
                             class="flex items-center gap-4 bg-panel-base border-2 border-action-error/40 px-5 py-4 rounded-2xl shadow-2xl hover:scale-105 transition-transform">
                            <span class="text-4xl md:text-5xl">{{ gameState.players.find(p => p.id === impId)?.avatar || '👤' }}</span>
                            <span class="text-white font-black text-lg md:text-xl uppercase tracking-wider">{{ gameState.players.find(p => p.id === impId)?.name }}</span>
                            <span class="text-2xl ml-2 drop-shadow-sm">☠️</span>
                        </div>
                    </div>
                </div>
            </template>

            <!-- Palabra Secreta Reveal -->
            <div class="w-full text-center mt-2 animate-fade-in-up" style="animation-delay: 1.2s;">
                <p class="text-ink-muted text-[10px] sm:text-xs uppercase font-black tracking-[0.3em] mb-3">{{ t('impostorResults.secretWordWas') }}</p>
                <div class="inline-block bg-panel-card/60 backdrop-blur-sm px-8 py-3 rounded-2xl border-2 border-white/10 shadow-lg">
                    <span class="text-white font-black text-2xl sm:text-3xl uppercase tracking-[0.2em]">{{ gameState.impostorData?.cycleResult?.revealedSecretWord || '???' }}</span>
                </div>
                <div v-if="gameState.impostorData?.cycleResult?.lastWishSuccess" class="mt-4 flex justify-center">
                    <div class="inline-flex items-center gap-2 bg-action-error text-white font-black text-xs uppercase tracking-widest px-5 py-2 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-bounce border border-action-error/50">
                        <span>🃏</span><span>{{ t('impostorResults.guessedWord') }}</span><span>🃏</span>
                    </div>
                </div>
            </div>

        </div>
    </Transition>
</template>
