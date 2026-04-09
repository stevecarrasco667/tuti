<script setup lang="ts">
// [Sprint 2 - P2] Premios / Highlights de partida (títulos cómicos)
defineProps<{
    titles: Array<{ playerId: string; emoji: string; title: string; description: string }>;
    playerMap: Record<string, { name: string; avatar: string }>;
}>();
</script>

<template>
    <div v-if="titles.length > 0" class="w-full">
        <div class="flex items-center justify-center gap-4 mb-6">
            <div class="h-px bg-white/10 flex-1"></div>
            <h3 class="text-white/50 font-black text-center uppercase tracking-[0.2em] text-xs">🏅 Premios de la Partida</h3>
            <div class="h-px bg-white/10 flex-1"></div>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
            <div
                v-for="t in titles"
                :key="t.playerId"
                class="relative overflow-hidden bg-panel-card/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center shadow-lg hover:border-white/20 transition-all group"
            >
                <div class="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span class="text-4xl sm:text-5xl mb-2 sm:mb-3">{{ t.emoji }}</span>
                <span class="text-white font-black text-[11px] sm:text-sm uppercase tracking-wide leading-tight">{{ t.title }}</span>
                <div class="mt-3 sm:mt-4 flex items-center gap-2 bg-panel-base/50 px-3 py-1.5 rounded-full border border-white/5 w-full justify-center max-w-[140px]">
                    <span class="text-sm sm:text-lg">{{ playerMap[t.playerId]?.avatar || '👤' }}</span>
                    <span class="text-white/80 font-bold text-[9px] sm:text-xs truncate w-full text-left">{{ playerMap[t.playerId]?.name }}</span>
                </div>
                <span class="text-white/40 font-medium text-[9px] sm:text-[10px] mt-2 sm:mt-3 italic line-clamp-2 px-1">{{ t.description }}</span>
            </div>
        </div>
    </div>
</template>
