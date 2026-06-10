<script setup lang="ts">
import type { Player } from '../../../shared/types';
import { useI18n } from 'vue-i18n';
import AvatarWrapper from '../ui/AvatarWrapper.vue';

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
    <div class="w-full flex flex-col gap-6 lg:gap-8 mt-2">
        
        <!-- ============================================== -->
        <!-- PODIO TOP 3 (Glassmorphism Premium Refinado)  -->
        <!-- ============================================== -->
        <div class="flex items-end justify-center gap-3 sm:gap-5 lg:gap-6 w-full max-w-3xl mx-auto px-2">
            
            <!-- SEGUNDO LUGAR (Izquierda) -->
            <div v-if="top3[1]" class="relative w-[30%] max-w-[150px] flex flex-col items-center">
                <!-- Avatar & Medal -->
                <div class="relative mb-2">
                    <AvatarWrapper :frameId="top3[1].frameId">
                        <div class="w-16 h-16 sm:w-20 sm:h-20 lg:w-22 lg:h-22 rounded-full border-[3px] border-slate-300/80 bg-panel-input flex items-center justify-center shadow-lg relative z-10 transition-transform duration-500 hover:scale-105">
                            <span class="text-4xl sm:text-5xl lg:text-6xl drop-shadow-md">{{ top3[1].avatar || '👤' }}</span>
                        </div>
                    </AvatarWrapper>
                    <div class="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-b border-2 font-black rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center z-20 text-xs sm:text-sm" :class="getMedalColor(1)">
                        2
                    </div>
                </div>
                <!-- Card -->
                <div class="w-full bg-white/[0.05] backdrop-blur-md border border-slate-300/30 rounded-xl p-3 pt-5 flex flex-col items-center shadow-2xl transition-all hover:bg-white/[0.08]">
                    <span class="text-white/95 font-black text-xs sm:text-sm uppercase tracking-widest truncate w-full text-center">{{ top3[1].name }}</span>
                    <div class="mt-1 text-slate-200 font-bold text-[10px] sm:text-xs bg-white/10 px-2 py-0.5 rounded-full border border-white/10">{{ top3[1].score }} pts</div>
                </div>
            </div>

            <!-- PRIMER LUGAR (Centro) -->
            <div v-if="top3[0]" class="relative w-[40%] max-w-[180px] flex flex-col items-center z-20 -mt-6 sm:-mt-8">
                <!-- Corona SVG Integrada -->
                <div class="absolute -top-7 sm:-top-8 left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]">
                    <svg class="w-9 h-9 sm:w-11 sm:h-11 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.5 19H21.5V21H2.5V19ZM12 2L15.5 10L22 8L18.5 16H5.5L2 8L8.5 10L12 2Z"/>
                    </svg>
                </div>
                <!-- Avatar & Medal -->
                <div class="relative mb-3">
                    <AvatarWrapper :frameId="top3[0].frameId">
                        <div class="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full border-[4px] border-yellow-400 bg-panel-input flex items-center justify-center shadow-[0_0_30px_rgba(250,204,21,0.3)] relative z-10 transition-transform duration-500 hover:scale-105">
                            <span class="text-5xl sm:text-6xl lg:text-7xl drop-shadow-md">{{ top3[0].avatar || '👤' }}</span>
                        </div>
                    </AvatarWrapper>
                    <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-b border-2 font-black rounded-full w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center z-20 text-sm sm:text-base" :class="getMedalColor(0)">
                        1
                    </div>
                </div>
                <!-- Card -->
                <div class="w-full bg-gradient-to-b from-yellow-500/10 to-transparent backdrop-blur-xl border border-yellow-400/30 rounded-2xl p-4 pt-6 flex flex-col items-center shadow-[0_0_20px_rgba(250,204,21,0.1)] transition-all hover:border-yellow-400/50">
                    <span class="text-yellow-400 font-black text-sm sm:text-base lg:text-lg uppercase tracking-widest truncate w-full text-center drop-shadow-sm">{{ top3[0].name }}</span>
                    <div class="mt-1.5 text-yellow-950 font-black text-xs sm:text-sm lg:text-base bg-gradient-to-r from-yellow-300 to-yellow-500 px-3 py-1 rounded-full shadow-md">{{ top3[0].score }} pts</div>
                </div>
            </div>

            <!-- TERCER LUGAR (Derecha) -->
            <div v-if="top3[2]" class="relative w-[30%] max-w-[150px] flex flex-col items-center">
                <!-- Avatar & Medal -->
                <div class="relative mb-2">
                    <AvatarWrapper :frameId="top3[2].frameId">
                        <div class="w-14 h-14 sm:w-16 sm:h-16 lg:w-18 lg:h-18 rounded-full border-[3px] border-amber-600/80 bg-panel-input flex items-center justify-center shadow-lg relative z-10 transition-transform duration-500 hover:scale-105">
                            <span class="text-3xl sm:text-4xl lg:text-5xl drop-shadow-md">{{ top3[2].avatar || '👤' }}</span>
                        </div>
                    </AvatarWrapper>
                    <div class="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-b border-2 font-black rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center z-20 text-[10px] sm:text-xs" :class="getMedalColor(2)">
                        3
                    </div>
                </div>
                <!-- Card -->
                <div class="w-full bg-white/[0.04] backdrop-blur-md border border-amber-600/30 rounded-xl p-3 pt-5 flex flex-col items-center shadow-lg transition-all hover:bg-white/[0.06]">
                    <span class="text-white/85 font-black text-xs uppercase tracking-widest truncate w-full text-center">{{ top3[2].name }}</span>
                    <div class="mt-1 text-amber-400 font-bold text-[10px] sm:text-xs bg-white/10 px-2 py-0.5 rounded-full border border-white/10">{{ top3[2].score }} pts</div>
                </div>
            </div>
        </div>

        <!-- ============================================== -->
        <!-- TABLA GENERAL (4to lugar en adelante - Compacto)-->
        <!-- ============================================== -->
        <div v-if="rest.length > 0" class="w-full max-w-xl mx-auto px-2">
            <div class="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-3 sm:p-4 shadow-2xl">
                <h3 class="text-white/40 font-black text-center mb-3 uppercase tracking-[0.3em] text-[9px] sm:text-[10px]">
                    {{ t('results.generalTable') || 'RESTO DE LA CLASIFICACIÓN' }}
                </h3>
                <div class="space-y-1.5">
                    <div v-for="(player, idx) in rest" :key="player.id" class="flex items-center justify-between py-2 px-3 bg-white/[0.03] rounded-xl border border-white/[0.05] hover:bg-white/[0.06] transition-colors">
                        <div class="flex items-center gap-3">
                            <span class="text-white/30 font-black text-[9px] sm:text-xs uppercase w-5 text-center">#{{ idx + 4 }}</span>
                            <AvatarWrapper :frameId="player.frameId">
                                <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-panel-base border border-white/10 shadow-sm text-sm sm:text-base flex items-center justify-center">{{ player.avatar || '👤' }}</div>
                            </AvatarWrapper>
                            <span class="text-white/80 font-bold uppercase tracking-wider text-[11px] sm:text-xs">{{ player.name }}</span>
                        </div>
                        <span class="text-white/60 font-black bg-panel-base/50 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs">{{ player.score }} pts</span>
                    </div>
                </div>
            </div>
        </div>
        
    </div>
</template>

