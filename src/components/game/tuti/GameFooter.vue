<script setup lang="ts">
import { RoomState } from '../../../../shared/types';

defineProps<{
    status: RoomState['status'];
    amIHost: boolean;
    canStop: boolean;
    cooldown: boolean;
    hasConfirmed: boolean;
    myProgress: { current: number, total: number };
    isStopping?: boolean;
}>();

defineEmits<{
    (e: 'stop'): void;
    (e: 'confirm-votes'): void;
    (e: 'next-round'): void;
}>();
</script>

<template>
    <div class="flex-none bg-gradient-to-t from-tuti-base via-tuti-base/90 to-transparent p-4 pb-safe pt-12 -mt-8 z-30 pointer-events-none">
        <div class="w-full max-w-[95%] xl:max-w-7xl mx-auto flex items-center justify-between gap-4 pointer-events-auto mt-4 px-2">
            
            <!-- My Progress (Left) -->
             <div class="hidden md:flex flex-col w-20 bg-white/60 p-2 rounded-xl border-[3px] border-white shadow-sm items-center backdrop-blur-md">
                 <span class="text-[9px] text-ink-soft font-black uppercase tracking-widest text-center">Progreso</span>
                 <span class="text-2xl font-black text-ink-main leading-none mt-1">
                     {{ myProgress.current }}<span class="text-base text-ink-muted/50 font-bold">/{{ myProgress.total }}</span>
                 </span>
             </div>

            <!-- STOP BUTTON (Center) -->
            <button 
                v-if="status === 'PLAYING'"
                @click="$emit('stop')"
                class="flex-1 max-w-sm bg-action-error hover:bg-red-500 text-white font-black text-2xl py-4 rounded-3xl shadow-game-btn transition-transform active:scale-[0.98] flex items-center justify-center gap-3 border-4 border-white/90 uppercase tracking-widest"
                :class="{'opacity-60 saturate-50 cursor-not-allowed shadow-none translate-y-1': (!canStop && !cooldown) || isStopping, 'animate-shake': cooldown}"
                :disabled="isStopping"
            >
                <span class="text-3xl drop-shadow-sm">{{ isStopping ? '⏳' : '✋' }}</span>
                <span class="drop-shadow-sm">{{ isStopping ? 'ENVIANDO...' : 'BASTA' }}</span>
            </button>

             <!-- CONFIRM: Now handled by ReviewPhase's sticky footer -->

             <!-- NEXT -->
            <button 
                v-if="status === 'RESULTS' && amIHost"
                @click="$emit('next-round')"
                class="flex-1 max-w-sm bg-action-primary hover:bg-action-hover text-white font-black text-xl py-4 rounded-3xl shadow-game-btn border-4 border-green-300 transition-transform active:scale-[0.98] mx-auto uppercase tracking-wide flex items-center justify-center gap-2"
            >
                Siguiente Ronda <span class="text-2xl">⚡</span>
            </button>
             <div v-else-if="status === 'RESULTS'" class="w-full text-center text-ink-main/60 bg-white/50 border-2 border-white backdrop-blur-sm max-w-sm mx-auto rounded-full shadow-sm text-sm font-black uppercase tracking-widest animate-pulse py-4 flex items-center justify-center">
                ⏳ Esperando al anfitrión...
            </div>

            <!-- Spacer (Right) -->
             <div class="hidden md:block w-20"></div>
        </div>
    </div>
</template>
