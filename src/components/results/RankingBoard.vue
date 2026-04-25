<script setup lang="ts">
import type { Player } from '../../../shared/types';
import { useI18n } from 'vue-i18n';

// [Sprint 2 - P2] Podio Classic Mode + Tabla General
defineProps<{
    top3: Player[];
    rest: Player[];
    titleMap: Record<string, { emoji: string; title: string; description: string }>;
}>();

const { t } = useI18n();
</script>

<template>
    <!-- PODIO (Glassmorphism) - Solo Modo Clásico -->
    <div class="flex items-end justify-center gap-3 sm:gap-6 lg:gap-8 w-full mx-auto mt-6">
        <!-- 2nd -->
        <div v-if="top3[1]" class="relative w-1/3 max-w-[180px] lg:max-w-[200px] bg-panel-card/40 backdrop-blur-xl border border-white/10 rounded-3xl h-44 sm:h-48 lg:h-56 flex flex-col items-center justify-start pt-10 lg:pt-12 shadow-xl transition-transform duration-500 hover:-translate-y-2">
            <div class="absolute -top-12 lg:-top-14 left-1/2 -translate-x-1/2">
                <div class="relative">
                    <div class="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full border-4 border-panel-base bg-panel-input flex items-center justify-center shadow-xl relative z-10">
                        <span class="text-4xl sm:text-5xl lg:text-6xl drop-shadow-md">{{ top3[1].avatar || '👤' }}</span>
                    </div>
                    <div class="absolute -bottom-1 -right-1 lg:-bottom-2 lg:-right-2 bg-panel-base border border-white/20 text-ink-muted font-black rounded-full w-7 h-7 lg:w-9 lg:h-9 flex items-center justify-center shadow-md z-20 text-xs lg:text-sm">2</div>
                </div>
            </div>
            <span class="text-ink-main font-black text-sm sm:text-base lg:text-lg uppercase tracking-wider truncate w-full text-center px-2 drop-shadow-sm z-10">{{ top3[1].name }}</span>
            <div class="mt-2 text-ink-main font-black text-sm sm:text-base lg:text-lg z-10 bg-white/5 px-3 py-1 lg:py-1.5 rounded-full border border-white/10 shadow-inner">{{ top3[1].score }} pts</div>
            <span v-if="titleMap[top3[1].id]" class="mt-auto mb-3 lg:mb-4 text-[9px] sm:text-[10px] lg:text-xs font-bold px-2 lg:px-3 py-1 bg-panel-card/80 backdrop-blur-md rounded-full text-white/70 border border-white/10 text-center mx-2 z-10">{{ titleMap[top3[1].id].emoji }} {{ titleMap[top3[1].id].title }}</span>
        </div>

        <!-- 1st -->
        <div v-if="top3[0]" class="relative w-1/3 max-w-[220px] lg:max-w-[260px] bg-panel-card/60 backdrop-blur-xl border border-yellow-400/30 rounded-3xl h-56 sm:h-64 lg:h-72 flex flex-col items-center justify-start pt-14 lg:pt-16 shadow-[0_0_40px_rgba(250,204,21,0.15)] z-20 transition-transform duration-500 hover:-translate-y-2">
            <div class="absolute -top-16 lg:-top-20 left-1/2 -translate-x-1/2">
                <div class="relative">
                    <div class="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full border-4 lg:border-[6px] border-panel-base bg-panel-input flex items-center justify-center shadow-2xl relative z-10">
                        <span class="text-6xl sm:text-7xl lg:text-[5.5rem] drop-shadow-md">{{ top3[0].avatar || '👤' }}</span>
                    </div>
                    <div class="absolute -top-6 lg:-top-8 left-1/2 -translate-x-1/2 text-5xl lg:text-6xl z-20 drop-shadow-lg animate-bounce">👑</div>
                    <div class="absolute -bottom-1 -right-1 lg:-bottom-2 lg:-right-2 bg-gradient-to-br from-yellow-300 to-yellow-600 border border-yellow-200 text-panel-base font-black rounded-full w-9 h-9 lg:w-11 lg:h-11 flex items-center justify-center shadow-lg z-20 text-sm lg:text-base">1</div>
                </div>
            </div>
            <span class="text-white font-black text-base sm:text-lg lg:text-2xl uppercase tracking-widest truncate w-full text-center px-2 drop-shadow-md z-10">{{ top3[0].name }}</span>
            <div class="mt-2 text-panel-base font-black text-lg sm:text-2xl lg:text-3xl z-10 bg-gradient-to-r from-yellow-300 to-yellow-500 px-4 py-1.5 lg:py-2 rounded-full border border-yellow-200 shadow-[0_4px_10px_rgba(250,204,21,0.3)]">{{ top3[0].score }} pts</div>
            <span v-if="titleMap[top3[0].id]" class="mt-auto mb-4 lg:mb-5 text-[10px] sm:text-xs lg:text-sm font-bold px-3 py-1.5 bg-panel-card/80 backdrop-blur-md rounded-full text-white/90 border border-white/10 text-center mx-2 z-10">{{ titleMap[top3[0].id].emoji }} {{ titleMap[top3[0].id].title }}</span>
        </div>

        <!-- 3rd -->
        <div v-if="top3[2]" class="relative w-1/3 max-w-[180px] lg:max-w-[200px] bg-panel-card/30 backdrop-blur-xl border border-white/10 rounded-3xl h-36 sm:h-40 lg:h-48 flex flex-col items-center justify-start pt-8 lg:pt-10 shadow-lg transition-transform duration-500 hover:-translate-y-2">
            <div class="absolute -top-10 lg:-top-12 left-1/2 -translate-x-1/2">
                <div class="relative">
                    <div class="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full border-4 border-panel-base bg-panel-input flex items-center justify-center shadow-lg relative z-10">
                        <span class="text-3xl sm:text-4xl lg:text-5xl drop-shadow-md">{{ top3[2].avatar || '👤' }}</span>
                    </div>
                    <div class="absolute -bottom-1 -right-1 lg:-bottom-2 lg:-right-2 bg-panel-base border border-white/20 text-ink-muted font-black rounded-full w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center shadow-sm z-20 text-[10px] lg:text-xs">3</div>
                </div>
            </div>
            <span class="text-ink-main font-black text-xs sm:text-sm lg:text-base uppercase tracking-wider truncate w-full text-center px-1 drop-shadow-sm z-10">{{ top3[2].name }}</span>
            <div class="mt-1 text-ink-muted font-bold text-xs sm:text-sm lg:text-base z-10 bg-white/5 px-2 lg:px-3 py-0.5 lg:py-1 rounded-full border border-white/5">{{ top3[2].score }} pts</div>
            <span v-if="titleMap[top3[2].id]" class="mt-auto mb-3 lg:mb-4 text-[8px] sm:text-[9px] lg:text-xs font-bold px-2 py-0.5 lg:py-1 bg-panel-card/80 backdrop-blur-md rounded-full text-white/60 border border-white/5 text-center mx-1 z-10">{{ titleMap[top3[2].id].emoji }} {{ titleMap[top3[2].id].title }}</span>
        </div>
    </div>

    <!-- TABLA GENERAL (4to lugar en adelante) -->
    <div v-if="rest.length > 0" class="w-full mt-6">
        <div class="bg-panel-base/60 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl">
            <h3 class="text-white/50 font-black text-center mb-5 sm:mb-6 uppercase tracking-[0.2em] text-xs">{{ t('results.generalTable') }}</h3>
            <div class="space-y-2 sm:space-y-3">
                <div v-for="(player, idx) in rest" :key="player.id" class="flex items-center justify-between p-2 sm:p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                    <div class="flex items-center gap-2 sm:gap-3">
                        <span class="text-white/30 font-black text-[10px] sm:text-xs uppercase w-5 sm:w-6 text-center">#{{ idx + 4 }}</span>
                        <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-panel-input border border-white/10 shadow-sm text-lg sm:text-2xl flex items-center justify-center">{{ player.avatar || '👤' }}</div>
                        <span class="text-white/90 font-black uppercase tracking-wider text-xs sm:text-sm">{{ player.name }}</span>
                    </div>
                    <span class="text-white/70 font-black bg-panel-base/80 px-2 sm:px-3 py-1 rounded-full border border-white/5 text-xs sm:text-sm">{{ player.score }} pts</span>
                </div>
            </div>
        </div>
    </div>
</template>
