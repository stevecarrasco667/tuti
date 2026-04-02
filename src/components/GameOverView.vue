<script setup lang="ts">
import { computed, onMounted, nextTick, ref } from 'vue';
import { toPng } from 'html-to-image';
import { useGame } from '../composables/useGame';
import { useSound } from '../composables/useSound';
import { useTitles } from '../composables/useTitles';
import { usePlayerHistory } from '../composables/usePlayerHistory';
import { computeMatchHighlights } from '../composables/useMatchHighlights';
import type { MatchHighlights } from '../composables/useMatchHighlights';
import { useToast } from '../composables/useToast';
import ConfettiCanvas from './ui/ConfettiCanvas.vue';
import MatchSummaryCard from './ui/MatchSummaryCard.vue';

const { gameState, myUserId, resetGame, leaveGame } = useGame();
const { playWin, playStop } = useSound();
const { assignTitles } = useTitles();
const { saveEntry } = usePlayerHistory();
const { addToast } = useToast();

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

// Helper: espera dos frames de render para garantizar layout + paint completo
// La firma (_t: number) descarta el timestamp que requestAnimationFrame provee.
const doubleRAF = () =>
    new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame((_t: number) => resolve())));

const shareMatchSummary = async () => {
    if (isCapturing.value) return;
    isCapturing.value = true;
    showSummaryCard.value = true;

    try {
        // Paso 1: Vue ha actualizado el DOM
        await nextTick();

        // Paso 2: esperar que TODAS las fuentes del documento estén listas
        // (document.fonts.ready >> setTimeout arbitrario en iOS 3G)
        await document.fonts.ready;

        // Paso 3: doble RAF → garantiza layout + paint completo en el browser
        await doubleRAF();

        const captureOptions = {
            width: 1080,
            height: 1920,
            pixelRatio: 1,
            cacheBust: true,
        };

        // Paso 4: iOS Warmup call — primera llamada cachea fuentes en el serializador
        // SVG foreignObject de html-to-image falla en WebKit en la primera llamada.
        // La segunda llamada usa la caché y genera la imagen correcta.
        await toPng(summaryCardRef.value!, captureOptions);

        // Paso 5: captura real (fuentes ya cacheadas por el warmup)
        const dataUrl = await toPng(summaryCardRef.value!, captureOptions);

        // Paso 6: descarga universal — funciona en iOS, Android y Desktop
        // appendChild/removeChild requerido en algunos browsers móviles
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `tuti-resumen-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

    } catch (err) {
        console.error('[MatchSummary] Error al generar imagen:', err);
        addToast('Ups, no se pudo guardar el recuerdo 🙅', 'error');
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

        <!-- Fondo radial para dar ambiente de epicentro / celebración -->
        <div class="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>
        <div class="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-action-primary/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>

        <!-- [Fase 4.2] Confeti para el ganador -->
        <ConfettiCanvas v-if="iWon" />

        <!-- BODY (Scrollable con alto padding bottom para librar los botones flotantes) -->
        <div class="flex-1 overflow-y-auto min-h-0 p-4 scrollbar-thin scrollbar-thumb-white/20 pb-[240px]">

            <!-- ABANDONMENT HEADER -->
            <div v-if="gameState.gameOverReason === 'ABANDONED'" class="text-center mb-16 mt-8 relative z-10 animate-pulse">
                <h2 class="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-action-primary to-purple-500 drop-shadow-[0_5px_15px_rgba(168,85,247,0.5)] uppercase tracking-tighter mix-blend-screen">¡VICTORIA!</h2>
                <div class="mt-6 bg-panel-card/80 backdrop-blur-md px-6 py-3 rounded-2xl inline-block border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                    <p class="text-purple-400 text-xl font-black uppercase tracking-widest">🏆 Por Abandono</p>
                    <p class="text-white/70 font-bold text-sm mt-1">Tus rivales huyeron despavoridos.</p>
                </div>
            </div>

            <!-- NORMAL HEADER -->
            <div v-else class="text-center mb-16 mt-8 relative z-10">
                <h2 class="text-6xl sm:text-7xl font-black drop-shadow-[0_4px_20px_rgba(250,204,21,0.3)] animate-pulse"
                    style="line-height: 1.2;"
                    :class="iWon ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600' : 'text-action-error drop-shadow-[0_4px_20px_rgba(244,63,94,0.3)]'">
                    {{ iWon ? '¡VICTORIA!' : 'GAME OVER' }}
                </h2>
                <div class="inline-block mt-4 bg-panel-base/60 backdrop-blur-xl border border-white/10 px-6 py-2 rounded-full shadow-lg">
                    <p class="text-yellow-400 font-bold text-sm tracking-[0.4em] uppercase">Podio Final</p>
                </div>
            </div>

            <!-- PODIUM (Glassmorphism + 3D base floating cards) -->
            <div class="flex items-end justify-center gap-3 sm:gap-6 w-full max-w-3xl mx-auto mb-16 pt-16">
                <!-- 2nd -->
                <div v-if="top3[1]" class="relative w-1/3 max-w-[180px] bg-panel-card/40 backdrop-blur-xl border border-white/10 rounded-3xl h-44 sm:h-48 flex flex-col items-center justify-start pt-10 shadow-xl mt-10 transition-transform duration-500 hover:-translate-y-2">
                    <div class="absolute -top-12 left-1/2 -translate-x-1/2">
                        <div class="relative">
                            <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-panel-base bg-panel-input flex items-center justify-center shadow-xl relative z-10">
                                <span class="text-4xl sm:text-5xl drop-shadow-md">{{ top3[1].avatar || '👤' }}</span>
                            </div>
                            <div class="absolute -bottom-1 -right-1 bg-panel-base border border-white/20 text-ink-muted font-black rounded-full w-7 h-7 flex items-center justify-center shadow-md z-20 text-xs">2</div>
                        </div>
                    </div>
                    <span class="text-ink-main font-black text-sm sm:text-base uppercase tracking-wider truncate w-full text-center px-2 drop-shadow-sm z-10">{{ top3[1].name }}</span>
                    <div class="mt-2 text-ink-main font-black text-sm sm:text-base z-10 bg-white/5 px-3 py-1 rounded-full border border-white/10 shadow-inner">
                        {{ top3[1].score }} pts
                    </div>
                    <span v-if="titleMap[top3[1].id]" class="mt-auto mb-3 text-[9px] sm:text-[10px] font-bold px-2 py-1 bg-panel-card/80 backdrop-blur-md rounded-full text-white/70 border border-white/10 text-center mx-2 z-10">{{ titleMap[top3[1].id].emoji }} {{ titleMap[top3[1].id].title }}</span>
                </div>

                <!-- 1st -->
                <div v-if="top3[0]" class="relative w-1/3 max-w-[220px] bg-panel-card/60 backdrop-blur-xl border border-yellow-400/30 rounded-3xl h-56 sm:h-64 flex flex-col items-center justify-start pt-14 shadow-[0_0_40px_rgba(250,204,21,0.15)] z-10 transition-transform duration-500 hover:-translate-y-2">
                    <div class="absolute -top-16 left-1/2 -translate-x-1/2">
                        <div class="relative">
                            <div class="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-panel-base bg-panel-input flex items-center justify-center shadow-2xl relative z-10">
                                <span class="text-6xl sm:text-7xl drop-shadow-md">{{ top3[0].avatar || '👤' }}</span>
                            </div>
                            <div class="absolute -top-6 left-1/2 -translate-x-1/2 text-5xl z-20 drop-shadow-lg animate-bounce">👑</div>
                            <div class="absolute -bottom-1 -right-1 bg-gradient-to-br from-yellow-300 to-yellow-600 border border-yellow-200 text-panel-base font-black rounded-full w-9 h-9 flex items-center justify-center shadow-lg z-20 text-sm">1</div>
                        </div>
                    </div>
                    <span class="text-white font-black text-base sm:text-xl uppercase tracking-widest truncate w-full text-center px-2 drop-shadow-md z-10">{{ top3[0].name }}</span>
                    <div class="mt-2 text-panel-base font-black text-lg sm:text-2xl z-10 bg-gradient-to-r from-yellow-300 to-yellow-500 px-4 py-1.5 rounded-full border border-yellow-200 shadow-[0_4px_10px_rgba(250,204,21,0.3)]">
                        {{ top3[0].score }} pts
                    </div>
                    <span v-if="titleMap[top3[0].id]" class="mt-auto mb-4 text-[10px] sm:text-xs font-bold px-3 py-1 bg-panel-card/80 backdrop-blur-md rounded-full text-white/90 border border-white/10 text-center mx-2 z-10">{{ titleMap[top3[0].id].emoji }} {{ titleMap[top3[0].id].title }}</span>
                </div>

                <!-- 3rd -->
                <div v-if="top3[2]" class="relative w-1/3 max-w-[180px] bg-panel-card/30 backdrop-blur-xl border border-white/10 rounded-3xl h-36 sm:h-40 flex flex-col items-center justify-start pt-8 shadow-lg mt-14 transition-transform duration-500 hover:-translate-y-2">
                    <div class="absolute -top-10 left-1/2 -translate-x-1/2">
                        <div class="relative">
                            <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-panel-base bg-panel-input flex items-center justify-center shadow-lg relative z-10">
                                <span class="text-3xl sm:text-4xl drop-shadow-md">{{ top3[2].avatar || '👤' }}</span>
                            </div>
                            <div class="absolute -bottom-1 -right-1 bg-panel-base border border-white/20 text-ink-muted font-black rounded-full w-6 h-6 flex items-center justify-center shadow-sm z-20 text-[10px]">3</div>
                        </div>
                    </div>
                    <span class="text-ink-main font-black text-xs sm:text-sm uppercase tracking-wider truncate w-full text-center px-1 drop-shadow-sm z-10">{{ top3[2].name }}</span>
                    <div class="mt-1 text-ink-muted font-bold text-xs sm:text-sm z-10 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                        {{ top3[2].score }} pts
                    </div>
                    <span v-if="titleMap[top3[2].id]" class="mt-auto mb-3 text-[8px] sm:text-[9px] font-bold px-2 py-0.5 bg-panel-card/80 backdrop-blur-md rounded-full text-white/60 border border-white/5 text-center mx-1 z-10">{{ titleMap[top3[2].id].emoji }} {{ titleMap[top3[2].id].title }}</span>
                </div>
            </div>

            <!-- REST OF PLAYERS -->
            <div v-if="rest.length > 0" class="w-full max-w-xl mx-auto mt-12 mb-8 relative z-10">
                <div class="bg-panel-base/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                    <h3 class="text-white/50 font-black text-center mb-6 uppercase tracking-[0.2em] text-xs">Tabla General</h3>
                    <div class="space-y-3">
                        <div v-for="(player, idx) in rest" :key="player.id" class="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                            <div class="flex items-center gap-3">
                                <span class="text-white/30 font-black text-xs uppercase w-6 text-center">#{{ idx + 4 }}</span>
                                <div class="w-10 h-10 rounded-full bg-panel-input border border-white/10 shadow-sm text-2xl flex items-center justify-center">{{ player.avatar || '👤' }}</div>
                                <span class="text-white/90 font-black uppercase tracking-wider text-sm">{{ player.name }}</span>
                            </div>
                            <span class="text-white/70 font-black bg-panel-base/80 px-3 py-1 rounded-full border border-white/5 text-sm">{{ player.score }} pts</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- [Fase 4.1] TARJETAS DE TÍTULOS -->
            <div v-if="titles.length > 0" class="w-full max-w-xl mx-auto my-12 relative z-10">
                <div class="flex items-center justify-center gap-4 mb-8">
                    <div class="h-px bg-white/10 flex-1"></div>
                    <h3 class="text-white/50 font-black text-center uppercase tracking-[0.2em] text-xs">🏅 Premios de la Partida</h3>
                    <div class="h-px bg-white/10 flex-1"></div>
                </div>
                <div class="grid grid-cols-2 gap-3 sm:gap-4">
                    <div
                        v-for="t in titles"
                        :key="t.playerId"
                        class="relative overflow-hidden bg-panel-card/40 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col items-center text-center shadow-lg hover:border-white/20 transition-all group"
                    >
                        <div class="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <span class="text-5xl mb-3">{{ t.emoji }}</span>
                        <span class="text-white font-black text-xs sm:text-sm uppercase tracking-wide leading-tight">{{ t.title }}</span>
                        
                        <div class="mt-4 flex items-center gap-2 bg-panel-base/50 px-3 py-1.5 rounded-full border border-white/5">
                            <span class="text-lg">{{ gameState.players.find(p => p.id === t.playerId)?.avatar || '👤' }}</span>
                            <span class="text-white/80 font-bold text-[10px] sm:text-xs truncate max-w-[80px]">{{ gameState.players.find(p => p.id === t.playerId)?.name }}</span>
                        </div>
                        
                        <span class="text-white/40 font-medium text-[9px] sm:text-[10px] mt-3 italic line-clamp-2 px-2">{{ t.description }}</span>
                    </div>
                </div>
            </div>

        </div>

        <!-- GLASS FOOTER ACTIONS -->
        <div class="absolute bottom-0 left-0 right-0 pointer-events-none z-40">
            <div class="bg-gradient-to-t from-panel-base via-panel-base to-transparent pt-20 pb-6 px-6">
                <!-- Intercepción de eventos solo dentro del panel real de botones -->
                <div class="max-w-sm mx-auto flex flex-col gap-3 pointer-events-auto filter drop-shadow-[0_-10px_20px_rgba(0,0,0,0.4)]">
                    
                    <!-- Acción 1: NUEVA PARTIDA (Jefe de jerarquía) -->
                    <button
                        v-if="amIHost"
                        @click="resetGame"
                        class="w-full bg-gradient-to-tr from-yellow-500 to-yellow-300 hover:from-yellow-400 hover:to-yellow-200 text-panel-base font-black text-lg uppercase tracking-[0.15em] py-5 rounded-2xl shadow-[0_0_25px_rgba(250,204,21,0.5)] border-2 border-yellow-200 transition-all transform hover:-translate-y-1 active:scale-95 active:translate-y-0"
                    >
                        🔥 Nueva Partida
                    </button>
                    <div v-else class="w-full flex items-center justify-center py-5 text-yellow-500/80 bg-panel-card/60 backdrop-blur-xs font-black uppercase tracking-widest rounded-2xl border border-yellow-500/20 shadow-inner">
                        ⏳ Esperando anfitrión...
                    </div>
                    
                    <!-- Sub-grupo Acciones Menores -->
                    <div class="flex gap-3">
                        <!-- Acción 2: GUARDAR RECUERDO (Ghost/Glass Premium) -->
                        <button
                            id="btn-share-summary"
                            @click="shareMatchSummary"
                            :disabled="isCapturing"
                            class="flex-[2] bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/20 hover:border-yellow-400/50 text-white font-bold uppercase tracking-wider py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 text-[11px] sm:text-xs flex items-center justify-center gap-2 shadow-lg"
                        >
                            <span class="text-xl leading-none">{{ isCapturing ? '⏳' : '📸' }}</span>
                            <span class="mt-0.5">{{ isCapturing ? 'Generando...' : 'Guardar Recuerdo' }}</span>
                        </button>

                        <!-- Acción 3: SALIR (Residual) -->
                        <button
                            @click="exitGame"
                            class="flex-[1] bg-transparent hover:bg-red-500/10 border border-transparent hover:border-red-500/30 text-white/50 hover:text-red-400 font-bold uppercase tracking-wider py-4 rounded-xl transition-colors text-[10px] sm:text-[11px] flex items-center justify-center gap-1.5"
                        >
                            <span>🚪</span>
                            <span class="mt-0.5">Salir</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ═══ OFF-SCREEN WRAPPER ═══
             AQUÍ aplicamos la posición negativa, PERO NO usamos este div para capturar. -->
        <div
            v-if="showSummaryCard"
            style="position: fixed; top: 0; left: -3000px; z-index: 9999; pointer-events: none;"
            aria-hidden="true"
        >
            <!-- ELEMENTO A CAPTURAR (Target) -->
            <div ref="summaryCardRef" style="width: 1080px; height: 1920px; overflow: hidden; background-color: #1a0533;">
                <MatchSummaryCard :highlights="highlights" />
            </div>
        </div>

    </div>
</template>

<style scoped>
</style>
