<script setup lang="ts">
import { computed, onMounted, nextTick, ref } from 'vue';
import { toPng } from 'html-to-image';
import { useGame } from '../composables/useGame';
import { useSound } from '../composables/useSound';
import { useTitles } from '../composables/useTitles';
import { usePlayerHistory } from '../composables/usePlayerHistory';
import { computeMatchHighlights } from '../composables/useMatchHighlights';
import type { MatchHighlights } from '../composables/useMatchHighlights';
import ConfettiCanvas from './ui/ConfettiCanvas.vue';
import MatchSummaryCard from './ui/MatchSummaryCard.vue';

const { gameState, myUserId, resetGame, leaveGame } = useGame();
const { playWin, playStop } = useSound();
const { assignTitles } = useTitles();
const { saveEntry } = usePlayerHistory();

const amIHost = computed(() => {
    const me = gameState.value.players.find(p => p.id === myUserId.value);
    return me?.isHost || false;
});

const sortedPlayers = computed(() => {
    return [...gameState.value.players].sort((a, b) => b.score - a.score);
});

const top3 = computed(() => sortedPlayers.value.slice(0, 3));
const rest = computed(() => sortedPlayers.value.slice(3));

// [Fase 4.1] Títulos cómicos
const titles = computed(() => assignTitles(gameState.value));
const titleMap = computed(() => {
    const m: Record<string, { emoji: string; title: string; description: string }> = {};
    for (const t of titles.value) m[t.playerId] = t;
    return m;
});

const iWon = computed(() => sortedPlayers.value[0]?.id === myUserId.value);

const exitGame = () => leaveGame();

// ── Viral Share: Match Summary Card ──────────────────────────────────────────
const showSummaryCard = ref(false);
const isCapturing = ref(false);
const summaryCardRef = ref<HTMLElement | null>(null);
const highlights = computed<MatchHighlights>(() => computeMatchHighlights(gameState.value));

const shareMatchSummary = async () => {
    if (isCapturing.value) return;
    isCapturing.value = true;
    showSummaryCard.value = true;

    try {
        await nextTick();
        // Extra frame so fonts + layout fully resolve before capture
        await new Promise(r => setTimeout(r, 250));

        const dataUrl = await toPng(summaryCardRef.value!, {
            width: 1080,
            height: 1920,
            pixelRatio: 1,
            cacheBust: true,
        });

        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'tuti-resumen.png', { type: 'image/png' });

        if (navigator.canShare?.({ files: [file] })) {
            // Mobile: native share sheet
            await navigator.share({
                title: '¡Mira el resumen de nuestra partida!',
                text: '¿Jugamos otra? 🎯 tutigames.io',
                files: [file],
            });
        } else {
            // Desktop fallback: direct PNG download
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `tuti-resumen-${Date.now()}.png`;
            a.click();
        }
    } catch (err) {
        console.error('[MatchSummary] Error al exportar:', err);
    } finally {
        showSummaryCard.value = false;
        isCapturing.value = false;
    }
};

onMounted(() => {
    // [Fase 4.2] Sonido de victoria o derrota
    if (iWon.value) {
        playWin();
    } else {
        playStop();
    }

    // [Fase 4.3] Guardar en historial local
    const me = gameState.value.players.find(p => p.id === myUserId.value);
    if (me) {
        const rank = sortedPlayers.value.findIndex(p => p.id === myUserId.value) + 1;
        saveEntry({
            date: new Date().toISOString(),
            mode: gameState.value.config.mode as 'CLASSIC' | 'IMPOSTOR',
            myScore: me.score,
            myRank: rank,
            totalPlayers: gameState.value.players.length,
            won: rank === 1
        });
    }
});
</script>

<template>
    <div class="h-full flex flex-col w-full max-w-4xl mx-auto overflow-hidden relative">

        <!-- [Fase 4.2] Confeti para el ganador -->
        <ConfettiCanvas v-if="iWon" />

        <!-- BODY (Scrollable) -->
        <div class="flex-1 overflow-y-auto min-h-0 p-4 scrollbar-thin scrollbar-thumb-white/20">

            <!-- ABANDONMENT HEADER -->
            <div v-if="gameState.gameOverReason === 'ABANDONED'" class="text-center mb-12 animate-bounce mt-8">
                <h2 class="text-6xl font-black text-action-primary drop-shadow-sm uppercase tracking-tighter">¡VICTORIA!</h2>
                <div class="mt-4 bg-panel-card backdrop-blur-md px-6 py-3 rounded-2xl inline-block border-[3px] border-white/10 shadow-glow-primary">
                    <p class="text-action-primary text-xl font-black uppercase tracking-widest">🏆 Por Abandono</p>
                    <p class="text-ink-soft font-bold text-sm mt-1">Tus rivales se han rendido.</p>
                </div>
            </div>

            <!-- NORMAL HEADER -->
            <div v-else class="text-center mb-8 mt-4">
                <h2 class="text-6xl font-black drop-shadow-sm animate-bounce"
                    :class="iWon ? 'text-action-primary' : 'text-action-error'">
                    {{ iWon ? '¡VICTORIA!' : 'GAME OVER' }}
                </h2>
                <p class="text-ink-main font-black text-lg mt-2 tracking-widest uppercase bg-panel-card/60 border border-white/10 px-4 py-1 rounded-full w-fit mx-auto">Podio Final</p>
            </div>

            <!-- PODIUM -->
            <div class="flex items-end justify-center gap-2 mb-10 w-full max-w-2xl mx-auto h-64 sm:h-80">
                <!-- 2nd -->
                <div v-if="top3[1]" class="flex flex-col items-center w-1/3 animate-bounce" style="animation-duration:2s;animation-delay:500ms;animation-fill-mode:both">
                    <div class="relative mb-2">
                        <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-white/10 bg-panel-input flex items-center justify-center shadow-glow-primary">
                            <span class="text-4xl sm:text-5xl drop-shadow-md">{{ top3[1].avatar || '👤' }}</span>
                        </div>
                        <div class="absolute -top-3 -right-3 bg-panel-input border-2 border-white/10 text-ink-muted font-black rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center shadow-lg">2</div>
                    </div>
                    <div class="w-full bg-panel-input border-x-4 border-t-4 border-white/10 rounded-t-3xl h-32 sm:h-48 flex flex-col items-center justify-start pt-4 shadow-inner relative">
                        <div class="absolute inset-0 bg-white/20 rounded-t-xl pointer-events-none"></div>
                        <span class="text-ink-main font-black text-xs sm:text-base uppercase tracking-wider truncate w-full text-center px-1 drop-shadow-sm z-10">{{ top3[1].name }}</span>
                        <span class="text-ink-muted font-black text-sm sm:text-lg mt-1 z-10">{{ top3[1].score }} pts</span>
                        <span v-if="titleMap[top3[1].id]" class="text-[9px] font-black mt-2 px-2 py-0.5 bg-panel-base/70 rounded-full text-ink-soft z-10 truncate max-w-full">{{ titleMap[top3[1].id].emoji }} {{ titleMap[top3[1].id].title }}</span>
                    </div>
                </div>

                <!-- 1st -->
                <div v-if="top3[0]" class="flex flex-col items-center w-1/3 z-10 animate-bounce" style="animation-duration:2s;animation-delay:1000ms;animation-fill-mode:both">
                    <div class="relative mb-4">
                        <div class="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-[6px] border-action-primary bg-panel-card flex items-center justify-center shadow-glow-primary">
                            <span class="text-5xl sm:text-7xl drop-shadow-md">{{ top3[0].avatar || '👤' }}</span>
                        </div>
                        <div class="absolute -top-6 left-1/2 transform -translate-x-1/2 text-4xl sm:text-5xl z-20">👑</div>
                        <div class="absolute -bottom-2 -right-2 bg-action-primary border-2 border-white/20 text-panel-base font-black rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shadow-lg z-20">1</div>
                    </div>
                    <div class="w-full bg-action-primary border-x-4 border-t-4 border-action-primary rounded-t-3xl h-48 sm:h-64 flex flex-col items-center justify-start pt-6 shadow-inner relative">
                        <div class="absolute inset-0 bg-white/20 rounded-t-2xl pointer-events-none"></div>
                        <span class="text-panel-base font-black text-sm sm:text-xl uppercase tracking-widest truncate w-full text-center px-1 drop-shadow-md z-10">{{ top3[0].name }}</span>
                        <span class="text-panel-base font-black text-xl sm:text-2xl mt-2 z-10 bg-white/40 px-2 py-0.5 rounded-full border border-white/30 shadow-sm">{{ top3[0].score }} pts</span>
                        <span v-if="titleMap[top3[0].id]" class="text-[9px] font-black mt-2 px-2 py-0.5 bg-panel-base/50 rounded-full text-panel-base z-10">{{ titleMap[top3[0].id].emoji }} {{ titleMap[top3[0].id].title }}</span>
                    </div>
                </div>

                <!-- 3rd -->
                <div v-if="top3[2]" class="flex flex-col items-center w-1/3 animate-bounce" style="animation-duration:2s;animation-delay:0ms;animation-fill-mode:both">
                    <div class="relative mb-2">
                        <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-white/5 bg-panel-card flex items-center justify-center shadow-md">
                            <span class="text-3xl sm:text-4xl drop-shadow-md">{{ top3[2].avatar || '👤' }}</span>
                        </div>
                        <div class="absolute -top-3 -right-3 bg-panel-card border-2 border-white/5 text-ink-muted font-black rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center shadow-sm">3</div>
                    </div>
                    <div class="w-full bg-panel-card border-x-4 border-t-4 border-white/5 rounded-t-3xl h-24 sm:h-36 flex flex-col items-center justify-start pt-4 shadow-inner relative">
                        <div class="absolute inset-0 bg-white/10 rounded-t-2xl pointer-events-none"></div>
                        <span class="text-ink-main font-black text-xs sm:text-sm uppercase tracking-wider truncate w-full text-center px-1 drop-shadow-sm z-10">{{ top3[2].name }}</span>
                        <span class="text-ink-muted font-black text-sm sm:text-[15px] mt-1 z-10">{{ top3[2].score }} pts</span>
                        <span v-if="titleMap[top3[2].id]" class="text-[9px] font-black mt-2 px-2 py-0.5 bg-panel-base/70 rounded-full text-ink-soft z-10 truncate max-w-full">{{ titleMap[top3[2].id].emoji }} {{ titleMap[top3[2].id].title }}</span>
                    </div>
                </div>
            </div>

            <!-- [Fase 4.1] TARJETAS DE TÍTULOS -->
            <div v-if="titles.length > 0" class="w-full max-w-xl mx-auto mb-8">
                <h3 class="text-ink-main font-black text-center mb-4 uppercase tracking-[0.2em] text-sm">🏅 Premios de la Partida</h3>
                <div class="grid grid-cols-2 gap-3">
                    <div
                        v-for="t in titles"
                        :key="t.playerId"
                        class="bg-panel-card border-[3px] border-white/10 rounded-2xl p-3 flex flex-col items-center text-center shadow-sm hover:border-white/20 transition-all"
                    >
                        <span class="text-3xl mb-1">{{ t.emoji }}</span>
                        <span class="text-ink-main font-black text-xs uppercase tracking-wide">{{ t.title }}</span>
                        <span class="text-ink-muted font-bold text-[9px] mt-1">
                            {{ gameState.players.find(p => p.id === t.playerId)?.avatar || '👤' }}
                            {{ gameState.players.find(p => p.id === t.playerId)?.name }}
                        </span>
                        <span class="text-ink-soft font-bold text-[8px] mt-1 italic">{{ t.description }}</span>
                    </div>
                </div>
            </div>

            <!-- REST OF PLAYERS -->
            <div v-if="rest.length > 0" class="w-full max-w-xl mx-auto bg-panel-base border-[4px] border-white/10 backdrop-blur-md rounded-3xl p-6 shadow-xl mb-8">
                <h3 class="text-ink-main font-black text-center mb-4 uppercase tracking-[0.2em] text-sm">Tabla General</h3>
                <div class="space-y-3">
                    <div v-for="(player, idx) in rest" :key="player.id" class="flex items-center justify-between p-3 bg-panel-card rounded-2xl border-2 border-white/10 shadow-sm">
                        <div class="flex items-center gap-3">
                            <span class="text-ink-muted font-black text-xs uppercase bg-panel-input px-2 py-0.5 rounded-md border border-white/10 shadow-inner">#{{ idx + 4 }}</span>
                            <div class="w-8 h-8 rounded-full bg-panel-input flex items-center justify-center border border-white/10 shadow-sm text-xl">{{ player.avatar || '👤' }}</div>
                            <span class="text-ink-main font-black uppercase tracking-wider text-sm md:text-base">{{ player.name }}</span>
                        </div>
                        <span class="text-action-primary font-black bg-panel-input px-3 py-1 rounded-full border border-action-primary/30 shadow-inner">{{ player.score }} pts</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- FOOTER ACTIONS -->
        <div class="flex-none px-6 py-4 z-20 pb-8">
            <div class="flex flex-col gap-3 justify-center max-w-xl mx-auto">

                <!-- Share button: available to ALL players -->
                <button
                    id="btn-share-summary"
                    @click="shareMatchSummary"
                    :disabled="isCapturing"
                    class="w-full bg-panel-input border-4 border-action-primary/60 text-action-primary font-black uppercase tracking-widest py-4 rounded-2xl shadow-glow-primary transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-action-primary hover:text-panel-base"
                >
                    {{ isCapturing ? '⏳ Generando imagen...' : '📸 Compartir Resumen' }}
                </button>

                <!-- Host / guest row -->
                <div class="flex flex-col sm:flex-row gap-3">
                    <button
                        v-if="amIHost"
                        @click="resetGame"
                        class="flex-1 bg-action-primary hover:bg-action-hover text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-game-btn border-4 border-green-400 transition-all transform active:scale-95"
                    >
                        🔄 Nueva Partida
                    </button>
                    <div v-else class="flex-1 text-center py-4 text-ink-soft bg-panel-card/60 font-black uppercase tracking-widest rounded-2xl border-4 border-white/10 shadow-sm">
                        Esperando al anfitrión...
                    </div>
                    <button
                        @click="exitGame"
                        class="flex-1 bg-panel-card border-4 border-white/10 text-ink-main font-black uppercase tracking-widest py-4 rounded-2xl shadow-sm transition-all hover:bg-panel-input active:scale-95"
                    >
                        🚪 Salir
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- ═══ OFF-SCREEN CARD (html-to-image capture target) ═══
         Mounted only during capture. Fixed at -1921px from top:
         fully rendered by the browser but invisible to the user.
         pointer-events:none prevents any accidental interaction. -->
    <div
        v-if="showSummaryCard"
        ref="summaryCardRef"
        style="position: fixed; top: -1921px; left: 0; width: 1080px; height: 1920px; z-index: -9999; pointer-events: none; overflow: hidden;"
        aria-hidden="true"
    >
        <MatchSummaryCard :highlights="highlights" />
    </div>

</template>

<style scoped>
</style>
