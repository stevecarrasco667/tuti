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
    <div class="h-full w-full flex flex-col items-center justify-center text-center relative overflow-hidden bg-black">
        
        <!-- Spotlight Radial FX (Cinematic) -->
        <div class="absolute inset-0 z-0 pointer-events-none"
             :class="isImpostor 
                ? 'bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.25)_0%,_rgba(0,0,0,1)_80%)]' 
                : 'bg-[radial-gradient(circle_at_center,_rgba(106,215,229,0.25)_0%,_rgba(0,0,0,1)_80%)]'">
        </div>

        <div class="z-10 flex-1 flex flex-col items-center justify-center w-full max-w-5xl md:max-w-[90%] mx-auto gap-8 py-10 min-h-0 relative">
            
            <!-- Category (Floating, No Box) -->
            <div class="flex-none flex flex-col items-center">
                <p class="text-[10px] md:text-xs font-black tracking-[0.4em] text-white/40 uppercase mb-2">Categoría</p>
                <span class="text-2xl md:text-3xl font-black tracking-[0.2em] uppercase drop-shadow-sm opacity-90"
                      :class="isImpostor ? 'text-action-error' : 'text-tuti-teal'">
                    {{ currentCategory }}
                </span>
            </div>

            <!-- Título Principal Brutalista -->
            <h1 class="font-black uppercase tracking-tighter leading-none flex-none text-6xl md:text-[6.5rem] lg:text-[8rem] w-full"
                :class="isImpostor ? 'text-action-error drop-shadow-[0_0_60px_rgba(239,68,68,0.6)]' : 'text-tuti-teal drop-shadow-[0_0_60px_rgba(106,215,229,0.6)]'">
                {{ isImpostor ? (allies > 0 ? 'Son los Impostores' : 'Eres el Impostor') : 'Eres un Tripulante' }}
            </h1>

            <!-- Misión y Secreto (Sin Tarjeta) -->
            <div class="flex-none w-full max-w-3xl mx-auto flex flex-col gap-6 mt-4">
                <p class="text-xl md:text-3xl text-white/80 font-black uppercase tracking-widest leading-tight">
                    {{ isImpostor ? 'Tu misión es sobrevivir y engañar.' : 'Encuentra al mentiroso.' }}
                </p>

                <div class="text-lg md:text-xl font-black mt-4">
                    <template v-if="isImpostor">
                        <p class="text-base md:text-xl text-white/50 font-black tracking-widest uppercase mb-3">No conoces la palabra. ¡Blufea!</p>
                        <template v-if="allies > 0">
                            <span class="text-sm md:text-lg text-action-error font-black uppercase tracking-widest opacity-80 absolute top-4 left-4 md:left-8"> Aliados: {{ allies }}</span>
                        </template>
                    </template>
                    <template v-else>
                        <span class="text-xs md:text-sm text-white/40 leading-none block mb-4 uppercase tracking-[0.4em]">La palabra secreta es:</span>
                        <!-- Glassmorphism ultraligero solo para la palabra -->
                        <span class="text-white font-black tracking-[0.2em] px-8 md:px-12 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md text-4xl md:text-5xl drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">{{ secretWord }}</span>
                    </template>
                </div>
            </div>

        </div>

        <!-- Timer Fantasma y Minimalista anclado al fondo -->
        <div class="absolute bottom-8 lg:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div class="text-5xl md:text-[5rem] font-black font-mono animate-pulse drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]" 
                 :class="isImpostor ? 'text-action-error/80' : 'text-tuti-teal/80'">
                {{ Math.max(0, timeRemaining) }}
            </div>
        </div>

    </div>
</template>
