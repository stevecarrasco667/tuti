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
    <div class="h-full w-full flex flex-col items-center justify-center p-4 md:p-6 text-center bg-panel-base backdrop-blur-md rounded-3xl border-[4px] border-white/50 relative overflow-y-auto shadow-game-panel scrollbar-thin">
        <!-- Fondo Animado FX -->
        <div class="absolute inset-0 z-0 opacity-40 pointer-events-none"
             :class="isImpostor ? 'bg-gradient-to-br from-action-error/40 via-transparent' : 'bg-gradient-to-br from-action-secondary/40 via-transparent'">
        </div>

        <div class="z-10 flex-1 flex flex-col items-center justify-center w-full max-w-2xl gap-4 md:gap-6 py-4 min-h-0">
            <span class="text-5xl md:text-6xl animate-bounce drop-shadow-md flex-none">{{ isImpostor ? '🤫' : '🕵️' }}</span>

            <!-- Category for EVERYONE (public info) -->
            <div class="flex-none flex flex-col items-center gap-1.5">
                <p class="text-[9px] md:text-[11px] font-black tracking-[0.3em] text-ink-muted uppercase">Categoría de la ronda</p>
                <span class="text-xl md:text-3xl font-black tracking-widest uppercase px-4 py-1.5 rounded-2xl border-2 shadow-sm leading-none"
                      :class="isImpostor ? 'bg-action-error/20 border-action-error/40 text-action-error' : 'bg-tuti-teal/20 border-tuti-teal/40 text-tuti-teal'">
                    {{ currentCategory }}
                </span>
            </div>

            <!-- Título Principal Fluido -->
            <h1 class="font-black uppercase tracking-tighter drop-shadow-sm leading-none flex-none text-[clamp(2.5rem,8vw,5rem)]"
                :class="isImpostor ? 'text-action-error' : 'text-tuti-teal'">
                {{ isImpostor ? (allies > 0 ? 'Son los Impostores' : 'Eres el Impostor') : 'Eres un Tripulante' }}
            </h1>

            <!-- Tarjeta de Misión -->
            <div class="bg-panel-card border-4 border-white/10 p-4 md:p-6 rounded-3xl backdrop-blur-xl shadow-sm flex-none w-full max-w-lg mx-auto">
                <p class="text-lg md:text-2xl text-ink-soft font-black mb-2 uppercase tracking-wide leading-tight">
                    {{ isImpostor ? 'Tu misión es sobrevivir y engañar.' : 'Encuentra al mentiroso.' }}
                </p>

                <div class="text-xl md:text-2xl font-black mt-2 md:mt-4 text-ink-main">
                    <template v-if="isImpostor">
                        <p class="text-sm md:text-base text-ink-muted font-bold leading-snug">No conoces la palabra secreta. ¡Blufea con la categoría!</p>
                        <template v-if="allies > 0">
                            <span class="text-xs md:text-sm text-action-error font-black mt-2 block">Tus aliados: {{ allies }} impostor{{ allies > 1 ? 'es' : '' }} más</span>
                        </template>
                    </template>
                    <template v-else>
                        <span class="text-sm md:text-base text-ink-muted leading-none block mb-2">La palabra secreta es:</span>
                        <span class="text-white font-black tracking-widest bg-tuti-teal border-2 border-tuti-teal/50 px-4 py-1.5 md:py-2 rounded-2xl inline-block shadow-sm text-2xl md:text-3xl leading-none">{{ secretWord }}</span>
                    </template>
                </div>
            </div>

            <!-- Timer con Margin Auto -->
            <div class="mt-auto pt-2 flex-none">
                <div class="text-center bg-panel-card/60 p-3 md:p-4 rounded-3xl border-2 border-white/10 shadow-sm inline-block min-w-[120px]">
                    <p class="text-[9px] md:text-[10px] font-black tracking-widest text-ink-muted uppercase mb-1">El juego comienza en</p>
                    <div class="text-5xl md:text-6xl font-black font-mono drop-shadow-sm leading-none" :class="timerColor">
                        {{ Math.max(0, timeRemaining) }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
