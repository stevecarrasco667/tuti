<script setup lang="ts">
import { computed } from 'vue';
import { useGame } from '../composables/useGame';
const { gameState, myUserId, resetGame, leaveGame } = useGame();

// Check if current user is host checking ID
const amIHost = computed(() => {
    const me = gameState.value.players.find(p => p.id === myUserId.value);
    return me?.isHost || false;
});

const sortedPlayers = computed(() => {
    return [...gameState.value.players].sort((a, b) => b.score - a.score);
});

const top3 = computed(() => sortedPlayers.value.slice(0, 3));
const rest = computed(() => sortedPlayers.value.slice(3));

const exitGame = () => {
    leaveGame();
};
</script>

<template>
    <div class="h-full flex flex-col w-full max-w-4xl mx-auto overflow-hidden">
        <!-- BODY (Scrollable) -->
        <div class="flex-1 overflow-y-auto min-h-0 p-4 scrollbar-thin scrollbar-thumb-white/20">
            <!-- CELEBRATION HEADER -->
            <!-- ABANDONMENT VICTORY HEADER -->
            <div v-if="gameState.gameOverReason === 'ABANDONED'" class="text-center mb-12 animate-bounce mt-8">
                <h2 class="text-6xl font-black text-amber-500 drop-shadow-sm uppercase tracking-tighter">
                    ¡VICTORIA!
                </h2>
                <div class="mt-4 bg-panel-card backdrop-blur-md px-6 py-3 rounded-2xl inline-block border-[3px] border-white shadow-sm">
                     <p class="text-amber-600 text-xl font-black uppercase tracking-widest">🏆 Por Abandono</p>
                     <p class="text-ink-soft font-bold text-sm mt-1">Tus rivales se han rendido.</p>
                </div>
            </div>

            <!-- NORMAL GAME OVER HEADER -->
            <div v-else class="text-center mb-8 mt-4">
                <h2 class="text-6xl font-black text-action-error drop-shadow-sm animate-bounce">
                    GAME OVER
                </h2>
                <p class="text-ink-main font-black text-lg mt-2 tracking-widest uppercase bg-white/40 border border-white/50 px-4 py-1 rounded-full w-fit mx-auto">Podio Final</p>
            </div>
            
            <!-- PODIUM (Hide only if strictly 0 players, but standard flow keeps them) -->
            <div class="flex items-end justify-center gap-2 mb-12 w-full max-w-2xl mx-auto h-64 sm:h-80">
                <!-- 2nd Place -->
                <div v-if="top3[1]" class="flex flex-col items-center w-1/3 animate-[slideUp_1s_ease-out_0.2s_both]">
                    <div class="relative mb-2">
                        <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-slate-300 overflow-hidden shadow-sm bg-white flex items-center justify-center">
                            <span class="text-4xl sm:text-5xl drop-shadow-sm">{{ top3[1].avatar || '👤' }}</span>
                        </div>
                        <div class="absolute -top-3 -right-3 bg-slate-200 border-2 border-slate-400 text-slate-700 font-black rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center shadow-sm">
                            2
                        </div>
                    </div>
                    <div class="w-full bg-slate-300 border-x-4 border-t-4 border-slate-400 rounded-t-2xl h-32 sm:h-48 flex flex-col items-center justify-start pt-4 shadow-inner relative">
                        <div class="absolute inset-0 bg-white/20 rounded-t-xl pointer-events-none"></div>
                       <span class="text-ink-main font-black text-xs sm:text-base uppercase tracking-wider truncate w-full text-center px-1 drop-shadow-sm z-10">{{ top3[1].name }}</span>
                       <span class="text-slate-600 font-black text-sm sm:text-lg mt-1 z-10">{{ top3[1].score }} pts</span>
                    </div>
                </div>

                <!-- 1st Place -->
                <div v-if="top3[0]" class="flex flex-col items-center w-1/3 z-10 animate-[slideUp_1s_ease-out_both]">
                     <div class="relative mb-4">
                        <div class="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-[6px] border-amber-400 overflow-hidden shadow-sm bg-white flex items-center justify-center relative">
                            <span class="text-5xl sm:text-7xl drop-shadow-sm">{{ top3[0].avatar || '👤' }}</span>
                        </div>
                         <div class="absolute -top-6 left-1/2 transform -translate-x-1/2 text-4xl sm:text-5xl drop-shadow-md z-20">
                            👑
                        </div>
                        <div class="absolute -bottom-2 -right-2 bg-amber-400 border-2 border-amber-600 text-amber-900 font-black rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shadow-sm z-20">
                            1
                        </div>
                    </div>
                    <div class="w-full bg-amber-400 border-x-4 border-t-4 border-amber-500 rounded-t-2xl h-48 sm:h-64 flex flex-col items-center justify-start pt-6 shadow-inner relative">
                        <div class="absolute inset-0 bg-white/20 rounded-t-xl pointer-events-none"></div>
                        <span class="text-ink-main font-black text-sm sm:text-xl uppercase tracking-widest truncate w-full text-center px-1 drop-shadow-sm z-10">{{ top3[0].name }}</span>
                        <span class="text-amber-800 font-black text-xl sm:text-2xl mt-2 z-10 bg-white/40 px-2 py-0.5 rounded-full border border-amber-500">{{ top3[0].score }} pts</span>
                    </div>
                </div>

                <!-- 3rd Place -->
                <div v-if="top3[2]" class="flex flex-col items-center w-1/3 animate-[slideUp_1s_ease-out_0.4s_both]">
                    <div class="relative mb-2">
                        <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-orange-300 overflow-hidden shadow-sm bg-white flex items-center justify-center">
                            <span class="text-3xl sm:text-4xl drop-shadow-sm">{{ top3[2].avatar || '👤' }}</span>
                        </div>
                         <div class="absolute -top-3 -right-3 bg-orange-200 border-2 border-orange-400 text-orange-900 font-black rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center shadow-sm">
                            3
                        </div>
                    </div>
                    <div class="w-full bg-orange-300 border-x-4 border-t-4 border-orange-400 rounded-t-2xl h-24 sm:h-36 flex flex-col items-center justify-start pt-4 shadow-inner relative">
                       <div class="absolute inset-0 bg-white/20 rounded-t-xl pointer-events-none"></div>
                       <span class="text-ink-main font-black text-xs sm:text-sm uppercase tracking-wider truncate w-full text-center px-1 drop-shadow-sm z-10">{{ top3[2].name }}</span>
                       <span class="text-orange-700 font-black text-sm sm:text-[15px] mt-1 z-10">{{ top3[2].score }} pts</span>
                    </div>
                </div>
            </div>
            
            <!-- REST OF PLAYERS -->
            <div v-if="rest.length > 0" class="w-full max-w-xl mx-auto bg-panel-base border-[4px] border-white backdrop-blur-md rounded-3xl p-6 shadow-game-panel mb-8">
                <h3 class="text-ink-main font-black text-center mb-4 uppercase tracking-[0.2em] text-sm">Tabla General</h3>
                <div class="space-y-3">
                    <div v-for="(player, idx) in rest" :key="player.id" class="flex items-center justify-between p-3 bg-panel-card rounded-2xl border-2 border-white shadow-sm">
                        <div class="flex items-center gap-3">
                            <span class="text-ink-muted font-black text-xs uppercase bg-white px-2 py-0.5 rounded-md border border-white/50 shadow-inner">#{{ idx + 4 }}</span>
                            <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-panel-card shadow-sm text-xl overflow-hidden">{{ player.avatar || '👤' }}</div>
                            <span class="text-ink-main font-black uppercase tracking-wider text-sm md:text-base">{{ player.name }}</span>
                        </div>
                        <span class="text-action-blue font-black bg-white px-3 py-1 rounded-full border border-blue-200 shadow-inner">{{ player.score }} pts</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- FOOTER (Fixed Actions) -->
        <div class="flex-none px-6 py-4 z-20 pb-8">
            <div class="flex flex-col sm:flex-row gap-4 justify-center max-w-xl mx-auto">
                 <button 
                    v-if="amIHost"
                    @click="resetGame"
                    class="flex-1 bg-action-primary hover:bg-action-hover text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-game-btn border-4 border-green-400 transition-all transform active:scale-95"
                >
                    🔄 Nueva Partida
                </button>
                <div v-else-if="!amIHost" class="flex-1 text-center py-4 text-ink-soft bg-white/60 font-black uppercase tracking-widest rounded-2xl border-4 border-white shadow-sm">
                    Esperando al anfitrión...
                </div>
                
                <button 
                    @click="exitGame"
                    class="flex-1 bg-panel-card border-4 border-white text-ink-main font-black uppercase tracking-widest py-4 rounded-2xl shadow-sm transition-all hover:bg-white active:scale-95"
                >
                    🚪 Salir
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
@keyframes slideUp {
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}
</style>
