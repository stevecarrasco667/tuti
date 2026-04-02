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

const showImpostorReveal = ref(false);

onMounted(() => {
    // [Fase 4.2] Sonido de victoria o derrota
    if (gameState.value.config.mode === 'IMPOSTOR') {
        const factionWin = gameState.value.impostorData?.cycleResult?.winner === 'IMPOSTOR';
        const impostorIds = gameState.value.impostorData?.cycleResult?.revealedImpostorIds || [];
        const amIImpostor = impostorIds.includes(myUserId.value);
        
        if ((factionWin && amIImpostor) || (!factionWin && !amIImpostor)) {
            playWin();
        } else {
            playStop();
        }
        
        setTimeout(() => showImpostorReveal.value = true, 800);
    } else {
        if (iWon.value) {
            playWin();
        } else {
            playStop();
        }
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
    <!-- Contenedor Maestro: Toma 100% de la altura, y distribuye hijos verticalmente con flex -->
    <div class="h-full w-full flex flex-col overflow-hidden relative bg-panel-base">

        <!-- Fondo radial para dar ambiente de epicentro / celebración -->
        <div class="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
        <div class="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-action-primary/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

        <!-- [Fase 4.2] Confeti para el ganador -->
        <ConfettiCanvas v-if="iWon" class="z-10" />

        <!-- 1. BODY (Scrollable flex-1 min-h-0) -->
        <div class="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 lg:p-10 scrollbar-thin scrollbar-thumb-white/20 z-10 relative">

            <!-- Wrappper principal del Dashboard (Grid en Escritorio) -->
            <div class="w-full max-w-[1200px] mx-auto flex flex-col lg:grid lg:grid-cols-12 gap-10 lg:gap-16 items-start pb-8">

                <!-- COLUMNA IZQUIERDA: Escenario Principal (Podio) -->
                <div class="w-full lg:col-span-7 xl:col-span-8 flex flex-col gap-10">
                    
                    <!-- HEADER -->
                    <div class="text-center relative z-20">
                        <template v-if="gameState.gameOverReason === 'ABANDONED'">
                            <h2 class="text-5xl sm:text-6xl md:text-7xl lg:text-[5rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-action-primary to-purple-500 drop-shadow-[0_5px_15px_rgba(168,85,247,0.5)] uppercase tracking-tighter mix-blend-screen animate-pulse">¡VICTORIA!</h2>
                            <div class="mt-6 bg-panel-card/80 backdrop-blur-md px-6 py-3 rounded-2xl inline-block border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                                <p class="text-purple-400 text-xl font-black uppercase tracking-widest">🏆 Por Abandono</p>
                                <p class="text-white/70 font-bold text-sm mt-1">Tus rivales huyeron despavoridos.</p>
                            </div>
                        </template>
                        <template v-else-if="gameState.config.mode === 'IMPOSTOR'">
                            <h2 class="text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black animate-pulse"
                                style="line-height: 1.1;"
                                :class="gameState.impostorData?.cycleResult?.winner === 'IMPOSTOR' ? 'text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-600 drop-shadow-[0_4px_20px_rgba(239,68,68,0.4)]' : 'text-transparent bg-clip-text bg-gradient-to-b from-tuti-teal to-blue-500 drop-shadow-[0_4px_20px_rgba(106,215,229,0.4)]'">
                                {{ gameState.impostorData?.cycleResult?.winner === 'IMPOSTOR' ? '¡IMPOSTORES GANAN!' : '¡TRIPULACIÓN GANA!' }}
                            </h2>
                        </template>
                        <template v-else>
                            <h2 class="text-6xl sm:text-7xl md:text-[5rem] lg:text-[6.5rem] font-black drop-shadow-[0_4px_20px_rgba(250,204,21,0.3)] animate-pulse"
                                style="line-height: 1.1;"
                                :class="iWon ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600' : 'text-action-error drop-shadow-[0_4px_20px_rgba(244,63,94,0.3)]'">
                                {{ iWon ? '¡VICTORIA!' : 'GAME OVER' }}
                            </h2>
                        </template>
                        <div class="inline-block mt-4 bg-panel-base/60 backdrop-blur-xl border border-white/10 px-6 py-2.5 rounded-full shadow-lg">
                            <p class="text-yellow-400 font-bold text-sm lg:text-base tracking-[0.4em] uppercase">Podio Final</p>
                        </div>
                    </div>

                    <!-- GRAN REVEAL (Solo Impostor) -->
                    <Transition enter-active-class="transition duration-1000 ease-out" enter-from-class="opacity-0 translate-y-8 scale-95" enter-to-class="opacity-100 translate-y-0 scale-100">
                        <div v-if="gameState.config.mode === 'IMPOSTOR' && showImpostorReveal" class="flex flex-col items-center gap-4 mt-2">
                            <div class="bg-panel-card/80 backdrop-blur-md border-[3px] border-white/10 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden" 
                                 :class="gameState.impostorData?.cycleResult?.winner === 'IMPOSTOR' ? 'border-action-error/50 bg-action-error/10' : 'border-tuti-teal/50 bg-tuti-teal/10'">
                                
                                <h3 class="text-xl md:text-2xl font-black text-center uppercase tracking-widest mb-6 drop-shadow-md"
                                    :class="gameState.impostorData?.cycleResult?.winner === 'IMPOSTOR' ? 'text-action-error' : 'text-tuti-teal'">
                                    {{ gameState.impostorData?.cycleResult?.winner === 'IMPOSTOR' ? '🦇 Los Impostores eran:' : 'La Purificación descubrió a:' }}
                                </h3>
                                
                                <div class="flex flex-wrap items-center justify-center gap-4">
                                    <div v-for="impId in gameState.impostorData?.cycleResult?.revealedImpostorIds || []" :key="impId"
                                         class="flex items-center gap-3 bg-panel-base border border-white/20 px-4 py-3 rounded-2xl shadow-xl">
                                        <span class="text-3xl md:text-4xl">{{ gameState.players.find(p => p.id === impId)?.avatar || '👤' }}</span>
                                        <span class="text-ink-main font-black text-sm md:text-lg uppercase tracking-wider">{{ gameState.players.find(p => p.id === impId)?.name }}</span>
                                        <span class="text-xl ml-2 drop-shadow-sm">☠️</span>
                                    </div>
                                </div>
                                
                                <!-- Palabra Secreta Reveal -->
                                <div class="mt-8 pt-6 border-t border-white/10 text-center">
                                    <p class="text-ink-muted text-xs uppercase font-black tracking-[0.2em] mb-2">La palabra secreta era:</p>
                                    <div class="inline-block bg-panel-base/80 px-6 py-2 rounded-xl border border-white/5">
                                        <span class="text-action-primary font-black text-2xl uppercase tracking-widest">{{ gameState.impostorData?.cycleResult?.revealedSecretWord || '???' }}</span>
                                    </div>
                                    <div v-if="gameState.impostorData?.cycleResult?.lastWishSuccess" class="mt-4 inline-block bg-action-error text-white font-bold text-xs uppercase tracking-wider px-4 py-1.5 rounded-full animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                                        🃏 ¡Adivinada en el último aliento!
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Transition>

                    <!-- PODIUM (Glassmorphism) -->
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
                            <div class="mt-2 text-ink-main font-black text-sm sm:text-base lg:text-lg z-10 bg-white/5 px-3 py-1 lg:py-1.5 rounded-full border border-white/10 shadow-inner">
                                {{ top3[1].score }} pts
                            </div>
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
                            <div class="mt-2 text-panel-base font-black text-lg sm:text-2xl lg:text-3xl z-10 bg-gradient-to-r from-yellow-300 to-yellow-500 px-4 py-1.5 lg:py-2 rounded-full border border-yellow-200 shadow-[0_4px_10px_rgba(250,204,21,0.3)]">
                                {{ top3[0].score }} pts
                            </div>
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
                            <div class="mt-1 text-ink-muted font-bold text-xs sm:text-sm lg:text-base z-10 bg-white/5 px-2 lg:px-3 py-0.5 lg:py-1 rounded-full border border-white/5">
                                {{ top3[2].score }} pts
                            </div>
                            <span v-if="titleMap[top3[2].id]" class="mt-auto mb-3 lg:mb-4 text-[8px] sm:text-[9px] lg:text-xs font-bold px-2 py-0.5 lg:py-1 bg-panel-card/80 backdrop-blur-md rounded-full text-white/60 border border-white/5 text-center mx-1 z-10">{{ titleMap[top3[2].id].emoji }} {{ titleMap[top3[2].id].title }}</span>
                        </div>
                    </div>

                </div>

                <!-- COLUMNA DERECHA: Dashboard Data (Sidebar) -->
                <div class="w-full lg:col-span-5 xl:col-span-4 flex flex-col gap-6 sm:gap-8 mt-12 lg:mt-0 relative z-20">
                    
                    <!-- [Fase 4.1] PREMIOS / HIGHLIGHTS -->
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
                                    <span class="text-sm sm:text-lg">{{ gameState.players.find(p => p.id === t.playerId)?.avatar || '👤' }}</span>
                                    <span class="text-white/80 font-bold text-[9px] sm:text-xs truncate w-full text-left">{{ gameState.players.find(p => p.id === t.playerId)?.name }}</span>
                                </div>
                                
                                <span class="text-white/40 font-medium text-[9px] sm:text-[10px] mt-2 sm:mt-3 italic line-clamp-2 px-1">{{ t.description }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- TABLA GENERAL (RESTO DE JUGADORES) -->
                    <div v-if="rest.length > 0" class="w-full">
                        <div class="bg-panel-base/60 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl">
                            <h3 class="text-white/50 font-black text-center mb-5 sm:mb-6 uppercase tracking-[0.2em] text-xs">Tabla General</h3>
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

                    <!-- ACCIONES (Desktop: viven en el sidebar) -->
                    <div class="hidden lg:flex flex-col gap-2 pt-2">
                        <!-- Nueva Partida -->
                        <button
                            v-if="amIHost"
                            @click="resetGame"
                            class="w-full bg-gradient-to-tr from-yellow-500 to-yellow-300 hover:from-yellow-400 hover:to-yellow-200 text-panel-base font-black text-sm uppercase tracking-[0.12em] py-3 rounded-xl shadow-[0_0_18px_rgba(250,204,21,0.4)] border-2 border-yellow-200 transition-all hover:-translate-y-0.5 active:scale-95"
                        >
                            🔥 Nueva Partida
                        </button>
                        <div v-else class="w-full flex items-center justify-center py-3 text-yellow-500/70 bg-panel-card/50 font-bold uppercase tracking-widest rounded-xl border border-yellow-500/20 text-xs">
                            ⏳ Esperando anfitrión...
                        </div>
                        <div class="flex gap-2">
                            <button
                                id="btn-share-summary"
                                @click="shareMatchSummary"
                                :disabled="isCapturing"
                                class="flex-[2] bg-white/5 hover:bg-white/10 border border-white/15 hover:border-yellow-400/40 text-white font-bold uppercase tracking-wider py-2 rounded-lg transition-all active:scale-95 disabled:opacity-50 text-[10px] flex items-center justify-center gap-1.5"
                            >
                                <span class="text-sm leading-none">{{ isCapturing ? '⏳' : '📸' }}</span>
                                <span>{{ isCapturing ? 'Generando...' : 'Guardar Recuerdo' }}</span>
                            </button>
                            <button
                                @click="exitGame"
                                class="flex-[1] bg-transparent hover:bg-red-500/10 border border-transparent hover:border-red-500/25 text-white/40 hover:text-red-400 font-bold uppercase tracking-wider py-2 rounded-lg transition-colors text-[10px] flex items-center justify-center gap-1"
                            >
                                <span>🚪</span>
                                <span>Salir</span>
                            </button>
                        </div>
                    </div>

                </div>
            </div> <!-- Fin de Grid -->
        </div>

        <!-- FOOTER MÓVIL: solo visible en pantallas < lg -->
        <div class="lg:hidden flex-none bg-panel-base border-t border-white/10 z-40">
            <div class="max-w-sm mx-auto px-4 py-3 flex flex-col gap-2">
                <!-- Nueva Partida -->
                <button
                    v-if="amIHost"
                    @click="resetGame"
                    class="w-full bg-gradient-to-tr from-yellow-500 to-yellow-300 hover:from-yellow-400 hover:to-yellow-200 text-panel-base font-black text-sm uppercase tracking-[0.12em] py-3 rounded-xl shadow-[0_0_18px_rgba(250,204,21,0.35)] border-2 border-yellow-200 transition-all active:scale-95"
                >
                    🔥 Nueva Partida
                </button>
                <div v-else class="w-full flex items-center justify-center py-3 text-yellow-500/70 bg-panel-card/50 font-bold uppercase tracking-widest rounded-xl border border-yellow-500/20 text-xs">
                    ⏳ Esperando anfitrión...
                </div>
                <div class="flex gap-2">
                    <button
                        id="btn-share-summary"
                        @click="shareMatchSummary"
                        :disabled="isCapturing"
                        class="flex-[2] bg-white/5 hover:bg-white/10 border border-white/15 hover:border-yellow-400/40 text-white font-bold uppercase tracking-wider py-2 rounded-lg transition-all active:scale-95 disabled:opacity-50 text-[10px] flex items-center justify-center gap-1.5"
                    >
                        <span class="text-sm leading-none">{{ isCapturing ? '⏳' : '📸' }}</span>
                        <span>{{ isCapturing ? 'Generando...' : 'Guardar Recuerdo' }}</span>
                    </button>
                    <button
                        @click="exitGame"
                        class="flex-[1] bg-transparent hover:bg-red-500/10 border border-transparent hover:border-red-500/25 text-white/40 hover:text-red-400 font-bold uppercase tracking-wider py-2 rounded-lg transition-colors text-[10px] flex items-center justify-center gap-1"
                    >
                        <span>🚪</span>
                        <span>Salir</span>
                    </button>
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
            <div ref="summaryCardRef" style="width: 1080px; height: 1920px; overflow: hidden; background-color: #1a0533;">
                <MatchSummaryCard :highlights="highlights" />
            </div>
        </div>

    </div>
</template>

<style scoped>
</style>
