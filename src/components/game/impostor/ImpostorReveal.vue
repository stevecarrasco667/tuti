<script setup lang="ts">
import { computed } from 'vue';
import { ImpostorData } from '../../../../shared/types';
import { localImpostorRole } from '../../../composables/useGameState';

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
    <div class="fixed inset-0 z-[100] flex flex-col items-center justify-center text-center overflow-hidden bg-black">
        
        <!-- Spotlight Radial FX (Cinematic) -->
        <div class="absolute inset-0 z-0 pointer-events-none"
             :class="isImpostor 
                ? 'bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.25)_0%,_rgba(0,0,0,1)_80%)]' 
                : 'bg-[radial-gradient(circle_at_center,_rgba(106,215,229,0.25)_0%,_rgba(0,0,0,1)_80%)]'">
        </div>

        <div class="z-10 flex flex-col items-center justify-between w-full h-full max-w-5xl md:max-w-[90%] mx-auto px-4 py-8 relative">
            
            <!-- CONTENIDO CENTRAL FLEXIBLE -->
            <div class="flex-1 flex flex-col items-center justify-center w-full gap-6 md:gap-8 pt-8">
                <!-- Category (Floating, No Box) -->
                <div class="flex-none flex flex-col items-center">
                    <p class="text-[10px] md:text-xs font-black tracking-[0.4em] text-white/40 uppercase mb-2">Categoría</p>
                    <span class="text-2xl md:text-3xl font-black tracking-[0.2em] uppercase drop-shadow-sm opacity-90"
                          :class="isImpostor ? 'text-action-error' : 'text-tuti-teal'">
                        {{ currentCategory }}
                    </span>
                </div>

                <!-- Título Principal Brutalista -->
                <h1 class="font-black uppercase tracking-tighter leading-[0.9] flex-none text-[3.5rem] md:text-7xl lg:text-[8rem] w-full text-balance"
                    :class="isImpostor ? 'text-action-error drop-shadow-[0_0_50px_rgba(239,68,68,0.6)]' : 'text-tuti-teal drop-shadow-[0_0_50px_rgba(106,215,229,0.6)]'">
                    {{ isImpostor ? (allies > 0 ? 'Son los Impostores' : 'Eres el Impostor') : 'Eres un Tripulante' }}
                </h1>

                <!-- Misión y Secreto (Sin Tarjeta, Sin Glassbox) -->
                <div class="flex-none w-full max-w-3xl mx-auto flex flex-col gap-4">
                    <p class="text-lg md:text-2xl text-white/80 font-black uppercase tracking-widest leading-tight">
                        {{ isImpostor ? 'Tu misión es sobrevivir y engañar.' : 'Encuentra al mentiroso.' }}
                    </p>

                    <div class="text-lg md:text-xl font-black mt-2">
                        <template v-if="isImpostor">
                            <p class="text-base md:text-xl text-white/50 font-black tracking-widest uppercase mb-3">No conoces la palabra. ¡Blufea!</p>
                            <template v-if="allies > 0">
                                <span class="text-sm md:text-lg text-action-error font-black uppercase tracking-widest opacity-80 block mt-2">Aliados: {{ allies }}</span>
                            </template>
                        </template>
                        <template v-else>
                            <span class="text-[10px] md:text-xs text-white/40 leading-none block mb-2 uppercase tracking-[0.4em]">La palabra secreta es:</span>
                            <!-- Sin caja gris mortuoria. Puro contraste tipográfico radiante. -->
                            <span class="text-white font-black tracking-[0.1em] text-[2.5rem] md:text-[4rem] drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] block text-balance leading-none">{{ secretWord }}</span>
                        </template>
                    </div>
                </div>
            </div>

            <!-- Timer Fantasma y Minimalista (mt-auto) en lugar de absolute -->
            <div class="mt-auto flex-none flex flex-col items-center justify-end pb-4 pt-8">
                <div class="text-5xl md:text-7xl font-black font-mono animate-pulse drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]" 
                     :class="isImpostor ? 'text-action-error/80' : 'text-tuti-teal/80'">
                    {{ Math.max(0, timeRemaining) }}
                </div>
            </div>

        </div>
    </div>
</template>
        

