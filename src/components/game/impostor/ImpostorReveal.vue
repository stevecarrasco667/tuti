<script setup lang="ts">
import { computed } from 'vue';
import { ImpostorData } from '../../../../shared/types';

const props = defineProps<{
    impostorData: ImpostorData;
    myUserId: string;
    timeRemaining: number;
    timerColor: string;
}>();

const isImpostor = computed(() => props.myUserId === props.impostorData.impostorId);
</script>

<template>
    <div class="h-full w-full flex flex-col items-center justify-center p-6 text-center bg-black/80 backdrop-blur-md rounded-2xl border border-white/5 relative overflow-hidden shadow-2xl">
        <!-- Fondo Animado FX -->
        <div class="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-overlay"
             :class="isImpostor ? 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-600 via-black to-black' : 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-600 via-black to-black'">
        </div>

        <div class="z-10 flex flex-col items-center max-w-2xl space-y-6">
            <span class="text-6xl animate-bounce">{{ isImpostor ? '🤫' : '🕵️' }}</span>
            
            <h1 class="text-5xl md:text-7xl font-black uppercase tracking-tighter drop-shadow-2xl"
                :class="isImpostor ? 'text-red-500 [text-shadow:0_0_30px_rgba(239,68,68,0.8)]' : 'text-cyan-400 [text-shadow:0_0_30px_rgba(34,211,238,0.8)]'">
                {{ isImpostor ? 'Eres el Impostor' : 'Eres un Tripulante' }}
            </h1>

            <div class="bg-black/40 border border-white/10 p-6 rounded-xl backdrop-blur-xl mt-8">
                <p class="text-xl md:text-2xl text-slate-300 font-light mb-2">
                    {{ isImpostor ? 'Tu misión es sobrevivir y engañar.' : 'Encuentra al mentiroso.' }}
                </p>
                
                <div class="text-2xl md:text-3xl font-mono mt-4">
                    <template v-if="isImpostor">
                        La categoría es:<br/>
                        <span class="text-white font-bold tracking-widest bg-white/10 px-4 py-2 rounded-lg inline-block mt-2">{{ impostorData.secretCategory }}</span>
                    </template>
                    <template v-else>
                        La palabra secreta es:<br/>
                        <span class="text-white font-bold tracking-widest bg-white/10 px-4 py-2 rounded-lg inline-block mt-2">{{ impostorData.secretWord }}</span>
                    </template>
                </div>
            </div>

            <div class="mt-12 text-center">
                <p class="text-sm font-bold tracking-[0.2em] text-slate-500 uppercase mb-2">El juego comienza en</p>
                <div class="text-6xl font-black font-mono drop-shadow-lg" :class="timerColor">
                    {{ Math.max(0, timeRemaining) }}
                </div>
            </div>
        </div>
    </div>
</template>
