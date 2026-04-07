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
        
        <!-- Spotlight Radial FX -->
        <div class="absolute inset-0 z-0 pointer-events-none"
             :class="isImpostor 
                ? 'bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.25)_0%,_rgba(0,0,0,1)_80%)]' 
                : 'bg-[radial-gradient(circle_at_center,_rgba(106,215,229,0.25)_0%,_rgba(0,0,0,1)_80%)]'">
        </div>

        <div class="z-10 flex flex-col items-center justify-between w-full h-full max-w-5xl md:max-w-[90%] mx-auto px-4 py-[clamp(0.5rem,2dvh,2rem)] relative">
            
            <!-- CONTENIDO CENTRAL COMPACTADO -->
            <div class="flex-1 flex flex-col items-center justify-center w-full gap-[clamp(0.5rem,3dvh,2rem)]">
                
                <!-- Category -->
                <div class="flex-none flex flex-col items-center">
                    <p class="text-[clamp(0.6rem,1.5dvh,0.75rem)] font-black tracking-[0.4em] text-white/40 uppercase mb-1">Categoría</p>
                    <span class="text-[clamp(1.2rem,3.5dvh,1.875rem)] font-black tracking-[0.2em] uppercase drop-shadow-sm opacity-90"
                          :class="isImpostor ? 'text-action-error' : 'text-tuti-teal'">
                        {{ currentCategory }}
                    </span>
                </div>

                <!-- Título Principal Liquido -->
                <h1 class="font-black uppercase tracking-tighter leading-[0.9] flex-none w-full text-balance text-[clamp(2.5rem,10dvh,8rem)]"
                    :class="isImpostor ? 'text-action-error drop-shadow-[0_0_50px_rgba(239,68,68,0.6)]' : 'text-tuti-teal drop-shadow-[0_0_50px_rgba(106,215,229,0.6)]'">
                    {{ isImpostor ? (allies > 0 ? 'Son los Impostores' : 'Eres el Impostor') : 'Eres un Tripulante' }}
                </h1>

                <!-- Misión y Secreto -->
                <div class="flex-none w-full max-w-3xl mx-auto flex flex-col gap-[clamp(0.2rem,1.5dvh,1rem)]">
                    <p class="text-[clamp(1rem,3dvh,1.5rem)] text-white/80 font-black uppercase tracking-widest leading-tight">
                        {{ isImpostor ? 'Tu misión es sobrevivir y engañar.' : 'Encuentra al mentiroso.' }}
                    </p>

                    <div class="font-black mt-1">
                        <template v-if="isImpostor">
                            <p class="text-[clamp(0.85rem,2.5dvh,1.25rem)] text-white/50 font-black tracking-widest uppercase mb-1">No conoces la palabra. ¡Blufea!</p>
                            <template v-if="allies > 0">
                                <span class="text-[clamp(0.75rem,2dvh,1.125rem)] text-action-error font-black uppercase tracking-widest opacity-80 block mt-1">Aliados: {{ allies }}</span>
                            </template>
                        </template>
                        <template v-else>
                            <span class="text-[clamp(0.6rem,1.5dvh,0.75rem)] text-white/40 leading-none block mb-1 uppercase tracking-[0.4em]">La palabra secreta es:</span>
                            <span class="text-white font-black tracking-[0.1em] text-[clamp(2rem,7dvh,4rem)] drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] block text-balance leading-none">{{ secretWord }}</span>
                        </template>
                    </div>
                </div>
            </div>

            <!-- Timer Adaptativo -->
            <div class="mt-auto flex-none flex flex-col items-center justify-end">
                <div class="text-[clamp(3rem,10dvh,4.5rem)] font-black font-mono animate-pulse drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] leading-none" 
                     :class="isImpostor ? 'text-action-error/80' : 'text-tuti-teal/80'">
                    {{ Math.max(0, timeRemaining) }}
                </div>
            </div>

        </div>
    </div>
</template>
        

