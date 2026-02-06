<script setup lang="ts">
import { RoomState } from '../../../shared/types';

defineProps<{
    status: RoomState['status'];
    amIHost: boolean;
    hasConfirmed: boolean;
    myProgress: { current: number, total: number };
}>();

defineEmits<{
    (e: 'confirm-votes'): void;
    (e: 'next-round'): void;
}>();
</script>

<template>
    <div class="flex-none bg-gradient-to-t from-black via-indigo-950/90 to-transparent p-4 pb-8 pt-12 -mt-8 z-30 pointer-events-none">
        <div class="w-full max-w-[95%] xl:max-w-7xl mx-auto flex items-center justify-between gap-4 pointer-events-auto">
            
            <!-- My Progress (Left) -->
             <div class="hidden md:flex flex-col w-20">
                 <span class="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Progreso</span>
                 <span class="text-2xl font-mono font-bold text-yellow-400 leading-none">
                     {{ myProgress.current }}<span class="text-base text-white/20">/{{ myProgress.total }}</span>
                 </span>
             </div>

             <!-- CONFIRM -->
            <button 
                v-if="status === 'REVIEW'"
                @click="$emit('confirm-votes')"
                class="flex-1 max-w-sm bg-green-600 hover:bg-green-500 text-white font-black text-lg py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] mx-auto"
                :disabled="hasConfirmed"
            >
                {{ hasConfirmed ? 'Enviado ✅' : 'Confirmar Votos' }}
            </button>

             <!-- NEXT -->
            <button 
                v-if="status === 'RESULTS' && amIHost"
                @click="$emit('next-round')"
                class="flex-1 max-w-sm bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] mx-auto"
            >
                Siguiente Ronda ➡️
            </button>
             <div v-else-if="status === 'RESULTS'" class="w-full text-center text-white/40 text-sm font-bold animate-pulse py-4">
                Esperando al anfitrión...
            </div>

            <!-- Spacer (Right) -->
             <div class="hidden md:block w-20"></div>
        </div>
    </div>
</template>
