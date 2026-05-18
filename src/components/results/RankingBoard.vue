<script setup lang="ts">
import type { Player } from '../../../shared/types';
import { useI18n } from 'vue-i18n';

// [Sprint 2 - P2] Podio Classic Mode + Tabla General (Rediseño Premium)
defineProps<{
    top3: Player[];
    rest: Player[];
    titleMap: Record<string, { emoji: string; titleId: string }>;
}>();

const { t } = useI18n();

const getMedalColor = (index: number) => {
    if (index === 0) return 'from-yellow-300 via-yellow-400 to-yellow-600 border-yellow-200 text-yellow-900 shadow-[0_0_15px_rgba(250,204,21,0.5)]'; // Oro
    if (index === 1) return 'from-slate-200 via-slate-300 to-slate-400 border-slate-100 text-slate-800 shadow-[0_0_10px_rgba(148,163,184,0.4)]'; // Plata
    return 'from-amber-600 via-amber-700 to-amber-800 border-amber-500 text-amber-100 shadow-[0_0_10px_rgba(217,119,6,0.4)]'; // Bronce
};
</script>

<template>
    <div class="w-full flex flex-col gap-10 lg:gap-12 mt-4">
        
        <!-- ============================================== -->
        <!-- PODIO TOP 3 (Glassmorphism Premium)            -->
        <!-- ============================================== -->
        <div class="flex items-end justify-center gap-4 sm:gap-6 lg:gap-8 w-full max-w-4xl mx-auto px-2">
            
            <!-- SEGUNDO LUGAR (Izquierda) -->
            <div v-if="top3[1]" class="relative w-[30%] max-w-[180px] flex flex-col items-center">
                <!-- Avatar & Medal -->
                <div class="relative mb-4">
                    <div class="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full border-[3px] border-slate-300/80 bg-panel-input flex items-center justify-center shadow-lg relative z-10 transition-transform duration-500 hover:scale-105">
                        <span class="text-5xl sm:text-6xl lg:text-7xl drop-shadow-md">{{ top3[1].avatar || '👤' }}</span>
                    </div>
                    <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-b border-2 font-black rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center z-20 text-sm sm:text-base" :class="getMedalColor(1)">
                        2
                    </div>
                </div>
                <!-- Card -->
                <div class="w-full bg-white/[0.05] backdrop-blur-md border border-slate-300/30 rounded-2xl p-4 pt-6 sm:pt-8 flex flex-col items-center shadow-2xl transition-all hover:bg-white/[0.08]">
                    <span class="text-white/95 font-black text-sm sm:text-base uppercase tracking-widest truncate w-full text-center">{{ top3[1].name }}</span>
                    <div class="mt-1.5 text-slate-200 font-bold text-xs sm:text-sm bg-white/10 px-3 py-1 rounded-full border border-white/10">{{ top3[1].score }} pts</div>
                </div>
            </div>

            <!-- PRIMER LUGAR (Centro) -->
            <div v-if="top3[0]" class="relative w-[40%] max-w-[220px] flex flex-col items-center z-20 -mt-8 sm:-mt-12">
                <!-- Corona SVG Integrada -->
                <div class="absolute -top-10 sm:-top-12 left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]">
                    <svg class="w-12 h-12 sm:w-16 sm:h-16 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.5 19H21.5V21H2.5V19ZM12 2L15.5 10L22 8L18.5 16H5.5L2 8L8.5 10L12 2Z"/>
                    </svg>
                </div>
                <!-- Avatar & Medal -->
                <div class="relative mb-5">
                    <div class="w-24 h-24 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-full border-[4px] sm:border-[5px] border-yellow-400 bg-panel-input flex items-center justify-center shadow-[0_0_40px_rgba(250,204,21,0.3)] relative z-10 transition-transform duration-500 hover:scale-105">
                        <span class="text-6xl sm:text-7xl lg:text-[5.5rem] drop-shadow-md">{{ top3[0].avatar || '👤' }}</span>
                    </div>
                    <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-gradient-to-b border-2 font-black rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center z-20 text-base sm:text-xl" :class="getMedalColor(0)">
                        1
                    </div>
                </div>
                <!-- Card -->
                <div class="w-full bg-gradient-to-b from-yellow-500/10 to-transparent backdrop-blur-xl border border-yellow-400/30 rounded-[2rem] p-5 pt-8 sm:pt-10 flex flex-col items-center shadow-[0_0_30px_rgba(250,204,21,0.1)] transition-all hover:border-yellow-400/50">
                    <span class="text-yellow-400 font-black text-base sm:text-lg lg:text-xl uppercase tracking-widest truncate w-full text-center drop-shadow-sm">{{ top3[0].name }}</span>
                    <div class="mt-2 text-yellow-950 font-black text-sm sm:text-base lg:text-lg bg-gradient-to-r from-yellow-300 to-yellow-500 px-4 py-1.5 rounded-full shadow-md">{{ top3[0].score }} pts</div>
                </div>
            </div>

            <!-- TERCER LUGAR (Derecha) -->
            <div v-if="top3[2]" class="relative w-[30%] max-w-[180px] flex flex-col items-center">
                <!-- Avatar & Medal -->
                <div class="relative mb-4">
                    <div class="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full border-[3px] border-amber-600/80 bg-panel-input flex items-center justify-center shadow-lg relative z-10 transition-transform duration-500 hover:scale-105">
                        <span class="text-4xl sm:text-5xl lg:text-6xl drop-shadow-md">{{ top3[2].avatar || '👤' }}</span>
                    </div>
                    <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-b border-2 font-black rounded-full w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center z-20 text-xs sm:text-sm" :class="getMedalColor(2)">
                        3
                    </div>
                </div>
                <!-- Card -->
                <div class="w-full bg-white/[0.04] backdrop-blur-md border border-amber-600/30 rounded-2xl p-3 pt-5 sm:pt-7 flex flex-col items-center shadow-lg transition-all hover:bg-white/[0.06]">
                    <span class="text-white/85 font-black text-xs sm:text-sm uppercase tracking-widest truncate w-full text-center">{{ top3[2].name }}</span>
                    <div class="mt-1.5 text-amber-400 font-bold text-xs sm:text-sm bg-white/10 px-2 py-1 rounded-full border border-white/10">{{ top3[2].score }} pts</div>
                </div>
            </div>
        </div>

        <!-- ============================================== -->
        <!-- TABLA GENERAL (4to lugar en adelante)        -->
        <!-- ============================================== -->
        <div v-if="rest.length > 0" class="w-full max-w-2xl mx-auto px-2">
            <div class="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 sm:p-6 shadow-2xl">
                <h3 class="text-white/40 font-black text-center mb-4 uppercase tracking-[0.3em] text-[10px] sm:text-xs">
                    {{ t('results.generalTable') || 'RESTO DE LA CLASIFICACIÓN' }}
                </h3>
                <div class="space-y-2">
                    <div v-for="(player, idx) in rest" :key="player.id" class="flex items-center justify-between p-3 sm:p-4 bg-white/[0.03] rounded-2xl border border-white/[0.05] hover:bg-white/[0.06] transition-colors">
                        <div class="flex items-center gap-3 sm:gap-4">
                            <span class="text-white/30 font-black text-[10px] sm:text-xs uppercase w-6 text-center">#{{ idx + 4 }}</span>
                            <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-panel-base border border-white/10 shadow-sm text-lg sm:text-2xl flex items-center justify-center">{{ player.avatar || '👤' }}</div>
                            <span class="text-white/80 font-bold uppercase tracking-wider text-xs sm:text-sm">{{ player.name }}</span>
                        </div>
                        <span class="text-white/60 font-black bg-panel-base/50 px-3 py-1 rounded-full text-xs sm:text-sm">{{ player.score }} pts</span>
                    </div>
                </div>
            </div>
        </div>
        
    </div>
</template>

