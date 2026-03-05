<script setup lang="ts">
import { computed } from 'vue';
import { ImpostorData } from '../../../../shared/types';
import { localImpostorRole } from '../../../composables/useGame';

const props = defineProps<{
    impostorData: ImpostorData;
    myUserId: string;
    timeRemaining: number;
    timerColor: string;
}>();

// Sprint 3.4: Consume private role whisper instead of public state
const isImpostor = computed(() => localImpostorRole.value?.role === 'impostor');
const allies = computed(() => localImpostorRole.value?.allies.length ?? 0);
const secretWord = computed(() => localImpostorRole.value?.word ?? null);
const currentCategory = computed(() => props.impostorData.currentCategoryName);
</script>

<template>
    <div class="h-full w-full flex flex-col items-center justify-center p-6 text-center bg-panel-base backdrop-blur-md rounded-3xl border-[4px] border-white/50 relative overflow-hidden shadow-game-panel">
        <!-- Fondo Animado FX -->
        <div class="absolute inset-0 z-0 opacity-40 pointer-events-none"
             :class="isImpostor ? 'bg-gradient-to-br from-action-error/40 via-transparent' : 'bg-gradient-to-br from-action-secondary/40 via-transparent'">
        </div>

        <div class="z-10 flex flex-col items-center max-w-2xl space-y-6">
            <span class="text-6xl animate-bounce drop-shadow-md">{{ isImpostor ? '🤫' : '🕵️' }}</span>

            <!-- Category for EVERYONE (public info) -->
            <p class="text-[11px] font-black tracking-[0.3em] text-ink-muted uppercase">Categoría de la ronda</p>
            <span class="text-3xl md:text-4xl font-black tracking-widest uppercase px-6 py-2 rounded-2xl border-2 shadow-sm"
                  :class="isImpostor ? 'bg-action-error/20 border-action-error/40 text-action-error' : 'bg-tuti-teal/20 border-tuti-teal/40 text-tuti-teal'">
                {{ currentCategory }}
            </span>

            <h1 class="text-5xl md:text-7xl font-black uppercase tracking-tighter drop-shadow-sm"
                :class="isImpostor ? 'text-action-error' : 'text-tuti-teal'">
                {{ isImpostor ? (allies > 0 ? 'Son los Impostores' : 'Eres el Impostor') : 'Eres un Tripulante' }}
            </h1>

            <div class="bg-panel-card border-4 border-white/10 p-6 rounded-3xl backdrop-blur-xl mt-8 shadow-sm">
                <p class="text-xl md:text-2xl text-ink-soft font-black mb-2 uppercase tracking-wide">
                    {{ isImpostor ? 'Tu misión es sobrevivir y engañar.' : 'Encuentra al mentiroso.' }}
                </p>

                <div class="text-2xl md:text-3xl font-black mt-4 text-ink-main">
                    <template v-if="isImpostor">
                        <p class="text-base text-ink-muted font-bold mb-2">No conoces la palabra secreta. ¡Blufea con la categoría!</p>
                        <template v-if="allies > 0">
                            <span class="text-sm text-action-error font-black mt-2 block">Tus aliados: {{ allies }} impostor{{ allies > 1 ? 'es' : '' }} más</span>
                        </template>
                    </template>
                    <template v-else>
                        La palabra secreta es:<br/>
                        <span class="text-white font-black tracking-widest bg-tuti-teal border-2 border-tuti-teal/50 px-5 py-2 rounded-2xl inline-block mt-3 shadow-sm">{{ secretWord }}</span>
                    </template>
                </div>
            </div>

            <div class="mt-12 text-center bg-panel-card/60 p-4 rounded-3xl border-2 border-white/10 shadow-sm inline-block">
                <p class="text-[10px] font-black tracking-widest text-ink-muted uppercase mb-1">El juego comienza en</p>
                <div class="text-6xl font-black font-mono drop-shadow-sm leading-none" :class="timerColor">
                    {{ Math.max(0, timeRemaining) }}
                </div>
            </div>
        </div>
    </div>
</template>
