<script setup lang="ts">
// [Sprint 2 - P2] Premios / Highlights de partida (títulos cómicos) Rediseño Premium
defineProps<{
    titles: Array<{ playerId: string; emoji: string; titleId: string }>;
    playerMap: Record<string, { name: string; avatar: string }>;
}>();

import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>

<template>
    <div v-if="titles.length > 0" class="w-full">
        <!-- Header -->
        <div class="flex items-center justify-center gap-4 mb-5 sm:mb-6">
            <div class="h-px bg-gradient-to-r from-transparent to-white/20 flex-1"></div>
            <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-yellow-500/80" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
                <h3 class="text-white/60 font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs">{{ t('results.matchAwards') || 'PREMIOS DE LA PARTIDA' }}</h3>
                <svg class="w-4 h-4 text-yellow-500/80" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
            </div>
            <div class="h-px bg-gradient-to-l from-transparent to-white/20 flex-1"></div>
        </div>

        <!-- Lista Vertical Elegante -->
        <div class="flex flex-col gap-3 sm:gap-4">
            <div
                v-for="award in titles"
                :key="award.playerId"
                class="group relative flex items-center justify-between p-3 sm:p-4 bg-white/[0.03] backdrop-blur-md rounded-[1.25rem] border border-white/5 shadow-sm hover:bg-white/[0.05] transition-all duration-300"
            >
                <!-- Info del Premio (Izquierda) -->
                <div class="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 pr-2">
                    <div class="w-10 h-10 flex-none rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                        <span class="text-xl sm:text-2xl drop-shadow-sm">{{ award.emoji }}</span>
                    </div>
                    <div class="flex flex-col flex-1 min-w-0">
                        <span class="text-white/90 font-black text-xs sm:text-sm uppercase tracking-wider truncate">{{ t(`titles.${award.titleId}.name`) }}</span>
                        <!-- Cambiado a line-clamp-2 para que se lea por qué ganaron -->
                        <span class="text-white/50 font-medium text-[10px] sm:text-xs leading-snug line-clamp-2 mt-0.5 pr-2">{{ t(`titles.${award.titleId}.desc`) }}</span>
                    </div>
                </div>

                <!-- Ganador (Derecha) -->
                <div class="flex items-center gap-2 sm:gap-3 flex-none pl-3 sm:pl-4 border-l border-white/10">
                    <div class="flex flex-col items-end">
                        <span class="text-white/30 font-bold text-[8px] sm:text-[9px] uppercase tracking-widest mb-0.5">GANADOR</span>
                        <!-- Aumentado el max-w para que nombres largos como ESTEBAN CARRASCO entren mejor -->
                        <span class="text-yellow-400/90 font-bold text-[10px] sm:text-xs uppercase max-w-[100px] sm:max-w-[150px] truncate text-right">{{ playerMap[award.playerId]?.name }}</span>
                    </div>
                    <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-panel-base border border-yellow-400/20 flex items-center justify-center shadow-md flex-none">
                        <span class="text-lg sm:text-xl">{{ playerMap[award.playerId]?.avatar || '👤' }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
