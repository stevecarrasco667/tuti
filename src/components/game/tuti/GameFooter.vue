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
    <div class="flex-none bg-gradient-to-t from-panel-base via-panel-base/90 to-transparent p-4 pb-safe pt-12 -mt-8 z-30 pointer-events-none">
        <div class="w-full max-w-[95%] xl:max-w-7xl mx-auto flex items-center justify-between gap-4 pointer-events-auto mt-4 px-2">
            
            <!-- My Progress (Left) -->
             <div v-show="status !== 'RESULTS'" class="hidden md:flex flex-col w-20 bg-panel-card/60 p-2 rounded-xl border-[3px] border-white/10 shadow-sm items-center backdrop-blur-md">
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
                class="flex-1 max-w-sm bg-action-primary hover:bg-action-hover text-white font-black text-xl py-4 rounded-3xl shadow-[0_0_30px_-5px_rgba(74,222,128,0.4)] border-4 border-green-300 transition-transform active:scale-[0.98] mx-auto uppercase tracking-wide flex items-center justify-center gap-2"
            >
                Siguiente Ronda <span class="text-2xl">⚡</span>
            </button>
             <div v-else-if="status === 'RESULTS'" class="w-full text-center text-amber-500 bg-panel-input border-2 border-amber-500/30 shadow-[0_0_30px_-5px_rgba(245,158,11,0.2)] backdrop-blur-sm max-w-xs mx-auto rounded-full text-sm font-black uppercase tracking-widest animate-[pulse_2s_ease-in-out_infinite] py-3.5 flex items-center justify-center gap-2">
                <span class="text-lg">⏳</span> Esperando al anfitrión...
            </div>

            <!-- Spacer (Right) -->
             <div v-show="status !== 'RESULTS'" class="hidden md:block w-20"></div>
        </div>
    </div>
</template>
