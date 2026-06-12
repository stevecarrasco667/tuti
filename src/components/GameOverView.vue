<script setup lang="ts">
// [Sprint 2 - P2] GameOverView — Shell Delgado (orquestador)
// Ha sido descompuesto en sub-componentes atómicos bajo src/components/results/.
// Este archivo no debe superar ~100 líneas. Toda la lógica de display vive en los hijos.
import { computed, onMounted, nextTick, ref } from 'vue';

import { useGame } from '../composables/useGame';
import { useSound } from '../composables/useSound';
import { useTitles } from '../composables/useTitles';
import { usePlayerHistory } from '../composables/usePlayerHistory';
import { computeMatchHighlights } from '../composables/useMatchHighlights';
import type { MatchHighlights } from '../composables/useMatchHighlights';
import { useToast } from '../composables/useToast';
import { useI18n } from 'vue-i18n';
import { useAnalytics } from '../composables/useAnalytics';
import { useAds } from '../composables/useAds';

import ResultsHeader from './results/ResultsHeader.vue';
import RankingBoard from './results/RankingBoard.vue';
import ImpostorResultsView from './results/ImpostorResultsView.vue';
import MatchHighlightsPanel from './results/MatchHighlightsPanel.vue';
import PostGameActions from './results/PostGameActions.vue';
import MatchSummaryCard from './ui/MatchSummaryCard.vue';
import InstallPrompt from './InstallPrompt.vue';
import CoinIcon from './ui/CoinIcon.vue';


const { gameState, myUserId, resetGame, leaveGame, matchRewards } = useGame();
const { playWin, playStop } = useSound();
const { assignTitles } = useTitles();
const { saveEntry } = usePlayerHistory();
const { addToast } = useToast();
const { t } = useI18n();
const { trackShareInitiated } = useAnalytics();

const amIHost = computed(() => gameState.value.players.find(p => p.id === myUserId.value)?.isHost || false);
const sortedPlayers = computed(() => [...gameState.value.players].sort((a, b) => b.score - a.score));
const top3 = computed(() => sortedPlayers.value.slice(0, 3));
const rest = computed(() => sortedPlayers.value.slice(3));
const iWon = computed(() => sortedPlayers.value[0]?.id === myUserId.value);

const titles = computed(() => assignTitles(gameState.value));
const titleMap = computed(() => {
    const m: Record<string, { emoji: string; titleId: string }> = {};
    for (const t of titles.value) m[t.playerId] = { emoji: t.emoji, titleId: t.titleId };
    return m;
});
// Map plano para MatchHighlightsPanel (evita exponer toda la lista de jugadores)
const playerMap = computed(() => {
    const m: Record<string, { name: string; avatar: string }> = {};
    for (const p of gameState.value.players) m[p.id] = { name: p.name, avatar: p.avatar || '👤' };
    return m;
});

// ── Impostor Reveal animation ────────────────────────────────────────────────
const showImpostorReveal = ref(false);

// ── Ads Integration State ───────────────────────────────────────────────────
const { triggerInterstitial, preloadInterstitial } = useAds();
const showResultsBoard = ref(false);

// ── Viral Share: Match Summary Card ─────────────────────────────────────────
const showSummaryCard = ref(false);
const isCapturing = ref(false);
const summaryCardRef = ref<HTMLElement | null>(null);
const highlights = computed<MatchHighlights>(() => computeMatchHighlights(gameState.value));

const doubleRAF = () =>
    new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame((_t: number) => resolve())));

// ── Smart Share: Detección determinista de entorno ──────────────────────────
// Usamos userAgent porque necesitamos saber si el SO puede invocar el menú
// nativo de compartir (iOS/Android) vs. si debemos copiar al portapapeles (PC).
const isMobileDevice = () =>
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Convierte un dataUrl Base64 a File para que el WebShare de iOS/Android lo acepte
const dataUrlToFile = (dataUrl: string, filename: string): File => {
    const [header, data] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)![1];
    const bytes = atob(data);
    const buffer = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
    return new File([buffer], filename, { type: mime });
};

const shareMatchSummary = async () => {
    if (isCapturing.value) return;
    isCapturing.value = true;
    showSummaryCard.value = true;

    try {
        // Carga dinámica de la biblioteca html-to-image únicamente cuando se solicita compartir
        const { toPng } = await import('html-to-image');

        // ── PASO 1: Captura de imagen ────────────────────────────────────────
        await nextTick();
        await document.fonts.ready;
        await doubleRAF();
        const opts = { width: 1080, height: 1920, pixelRatio: 1, cacheBust: true };
        await toPng(summaryCardRef.value!, opts); // Warmup render (evita artefactos en iOS)
        const dataUrl = await toPng(summaryCardRef.value!, opts);
        const filename = `tuti-resumen-${Date.now()}.png`;

        // ── PASO 2: Descarga forzada (SIEMPRE, independiente del dispositivo) ──
        // Este es el "Punto de Retorno Seguro": el usuario siempre se queda
        // con la imagen en su almacenamiento local, caiga lo que caiga después.
        const anchor = document.createElement('a');
        anchor.href = dataUrl;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);

        // ── PASO 3: Bifurcación de dispositivo ───────────────────────────────
        const roomUrl = window.location.href;
        const shareText = t('results.shareText');

        if (isMobileDevice()) {
            // ── FLUJO MÓVIL: Web Share API nativa (WhatsApp, Instagram, etc.) ──
            const file = dataUrlToFile(dataUrl, filename);
            const canShareFiles = navigator.canShare && navigator.canShare({ files: [file] });

            if (canShareFiles) {
                try {
                    await navigator.share({
                        title: t('results.shareTitle'),
                        text: shareText,
                        url: roomUrl,
                        files: [file],
                    });
                    // [PostHog] Share nativo exitoso
                    trackShareInitiated({ method: 'native', screen: 'game_over' });
                    // Si el usuario cerró el menú sin compartir (AbortError), lo ignoramos
                } catch (shareErr: any) {
                    if (shareErr?.name !== 'AbortError') {
                        // Error real (ej. API no soportada en este browser móvil) → fallback silencioso
                        console.warn('[SmartShare] navigator.share falló:', shareErr);
                    }
                }
            } else {
                // El navegador móvil no soporta file-sharing → solo notificamos la descarga
                addToast(t('results.shareSuccess'), 'success');
            }
        } else {
            // ── FLUJO DESKTOP: Copiar URL al portapapeles ────────────────────
            // No invocamos navigator.share en PC: su UX nativa es terrible en Windows/Mac.
            // Copiamos solo la URL (texto limpio, listo para pegar en Discord/WhatsApp Web).
            try {
                await navigator.clipboard.writeText(roomUrl);
                // [PostHog] Share por clipboard en desktop
                trackShareInitiated({ method: 'clipboard', screen: 'game_over' });
                addToast(t('results.shareCopied'), 'success');
            } catch {
                // Clipboard API no disponible o bloqueada por política del navegador.
                // No usamos execCommand (rechazado por directriz arquitectónica).
                // La descarga ya se completó arriba, así que la experiencia no se rompe.
                addToast(t('results.shareDownloaded'), 'info');
            }
        }

    } catch (err) {
        console.error('[SmartShare] Error en la captura de imagen:', err);
        addToast(t('results.shareError'), 'error');
    } finally {
        showSummaryCard.value = false;
        isCapturing.value = false;
    }
};

onMounted(async () => {
    // 1. Asegurar precarga silenciosa y disparar anuncio intersticial nativo con Grace Timeout
    try {
        await preloadInterstitial();
        await triggerInterstitial();
    } catch (err) {
        console.warn('[Ads] Error en trigger de GameOver intersticial:', err);
    }

    // 2. Activar la revelación visual del podio de resultados
    showResultsBoard.value = true;

    // 3. Iniciar pistas de sonido y animaciones ahora que el podio es visible
    if (gameState.value.config.mode === 'IMPOSTOR') {
        const factionWin = gameState.value.impostorData?.cycleResult?.winner === 'IMPOSTOR';
        const impostorIds = gameState.value.impostorData?.cycleResult?.revealedImpostorIds || [];
        const amIImpostor = impostorIds.includes(myUserId.value);
        ((factionWin && amIImpostor) || (!factionWin && !amIImpostor)) ? playWin() : playStop();
        setTimeout(() => showImpostorReveal.value = true, 800);
    } else {
        iWon.value ? playWin() : playStop();
    }

    const me = gameState.value.players.find(p => p.id === myUserId.value);
    if (me) {
        saveEntry({
            date: new Date().toISOString(),
            mode: gameState.value.config.mode as 'CLASSIC' | 'IMPOSTOR',
            myScore: me.score,
            myRank: sortedPlayers.value.findIndex(p => p.id === myUserId.value) + 1,
            totalPlayers: gameState.value.players.length,
            won: sortedPlayers.value[0]?.id === myUserId.value,
        });
    }
});
</script>

<template>
    <div class="h-full w-full flex flex-col overflow-hidden relative game-bg-cosmic">
        <!-- Fondos radiales de ambiente: absolute al contenedor raíz (fuera del scroll) -->
        <div class="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
        <div class="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-action-primary/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

        <!-- [Sprint 8.3 - Proposal C] Subtle floating arcade background icons -->
        <div class="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
            <!-- Pencil -->
            <div class="absolute text-5xl sm:text-6xl opacity-[0.035] select-none animate-float-icon-1" style="top: 15%; left: 8%;">✍️</div>
            <!-- Magnifier -->
            <div class="absolute text-5xl sm:text-6xl opacity-[0.035] select-none animate-float-icon-2" style="top: 25%; right: 14%;">🔍</div>
            <!-- Question mark -->
            <div class="absolute text-5xl sm:text-6xl opacity-[0.035] select-none animate-float-icon-3" style="bottom: 22%; left: 16%;">❓</div>
            <!-- Arcade Monster -->
            <div class="absolute text-5xl sm:text-6xl opacity-[0.035] select-none animate-float-icon-4" style="bottom: 16%; right: 6%;">👾</div>
            <!-- Glowing Star -->
            <div class="absolute text-4xl sm:text-5xl opacity-[0.03] select-none animate-float-icon-5" style="top: 48%; left: 45%;">⭐</div>
        </div>

        <!-- Install PWA Prompt (Sprint 4 P3) -->
        <InstallPrompt />

        <!-- BODY scrollable: TODO el contenido fluye aquí, nada lo tapa desde arriba -->
        <div class="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5 lg:p-6 scrollbar-thin scrollbar-thumb-white/20 relative z-10">

            <!-- Título (VICTORIA / GAME OVER) — en flujo normal dentro del scroll -->
            <div class="mb-8 lg:mb-10">
                <ResultsHeader :i-won="iWon" :am-i-host="amIHost" />
            </div>

            <!-- Contenido principal: podio + sidebar -->
            <div class="w-full max-w-[1100px] mx-auto flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 items-start pb-6">

                <!-- COLUMNA IZQUIERDA -->
                <div class="w-full lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
                    <!-- Lógica secuencial: Mostrar podio solo tras completar el anuncio/timeout -->
                    <div v-if="showResultsBoard" class="w-full flex flex-col gap-6 animate-fade-in">
                        <!-- Modo Impostor: Gran Reveal -->
                        <ImpostorResultsView
                            v-if="gameState.config.mode === 'IMPOSTOR' && showImpostorReveal"
                        />
                        <!-- Modo Clásico: Podio + Tabla General -->
                        <RankingBoard
                            v-else-if="gameState.config.mode !== 'IMPOSTOR'"
                            :top3="top3"
                            :rest="rest"
                            :title-map="titleMap"
                        />
                    </div>
                    
                    <!-- Sutil esqueleto/loader arcade de suspenso mientras se procesa el anuncio -->
                    <div v-else class="w-full py-10 flex flex-col items-center justify-center gap-4 bg-panel-base/40 border-2 border-white/5 rounded-3xl p-6 min-h-[250px] shadow-inner">
                        <div class="text-5xl animate-bounce">🏆</div>
                        <span class="animate-pulse text-xs font-black uppercase tracking-widest text-ink-muted">Revelando el Podio...</span>
                    </div>
                </div>

                <!-- COLUMNA DERECHA (sidebar desktop) -->
                <div class="w-full lg:col-span-5 xl:col-span-4 flex flex-col gap-4 sm:gap-6 mt-6 lg:mt-0">
                    <!-- Monedas Ganadas (Coins Earned - Sprint 6) -->
                    <div v-if="matchRewards && matchRewards.breakdown?.[myUserId]" class="w-full bg-white/[0.03] backdrop-blur-md border border-yellow-500/20 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden flex flex-col gap-3">
                        <div class="absolute -top-12 -right-12 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none"></div>
                        <div class="flex items-center justify-between border-b border-white/10 pb-3">
                            <h3 class="text-yellow-400 font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs flex items-center gap-1.5">
                                <CoinIcon class="w-3.5 h-3.5 text-yellow-400" /> {{ t('results.coinsEarned', 'MONEDAS GANADAS') }}
                            </h3>
                            <span class="text-sm font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-3 py-1 rounded-full shadow-md animate-pulse">
                                +{{ matchRewards.breakdown[myUserId].details.total }}
                            </span>
                        </div>

                        <!-- If not eligible, show warnings -->
                        <div v-if="!matchRewards.breakdown[myUserId].isEligible" class="text-action-error bg-action-error/10 border border-action-error/20 p-3 rounded-xl text-center text-[10px] sm:text-xs font-black uppercase tracking-wider leading-relaxed">
                            ⚠️ {{ t('results.notEligibleCoins', 'Partida muy rápida o con baja participación. Juega completo para ganar monedas.') }}
                        </div>

                        <!-- Breakdown details if eligible -->
                        <div v-else class="flex flex-col gap-2 text-[11px] sm:text-xs">
                            <div class="flex justify-between items-center text-white/60">
                                <span>{{ t('results.baseReward', 'Recompensa Base') }}</span>
                                <span class="text-white font-bold font-mono">+{{ matchRewards.breakdown[myUserId].details.base }}</span>
                            </div>
                            <div v-if="matchRewards.breakdown[myUserId].details.rank > 0" class="flex justify-between items-center text-white/60">
                                <span>{{ t('results.rankBonus', 'Bonus de Posición') }}</span>
                                <span class="text-white font-bold font-mono">+{{ matchRewards.breakdown[myUserId].details.rank }}</span>
                            </div>
                            <div v-if="matchRewards.breakdown[myUserId].details.performance > 0" class="flex justify-between items-center text-white/60">
                                <span>{{ t('results.performanceBonus', 'Bonus por Habilidad') }}</span>
                                <span class="text-white font-bold font-mono">+{{ matchRewards.breakdown[myUserId].details.performance }}</span>
                            </div>
                            <div v-if="matchRewards.breakdown[myUserId].details.faction > 0" class="flex justify-between items-center text-white/60">
                                <span>{{ t('results.factionBonus', 'Bonus de Facción Ganadora') }}</span>
                                <span class="text-white font-bold font-mono">+{{ matchRewards.breakdown[myUserId].details.faction }}</span>
                            </div>

                            <!-- Total balance -->
                            <div v-if="matchRewards.breakdown[myUserId].totalCoins !== undefined" class="flex justify-between items-center border-t border-white/10 pt-3 mt-1 text-xs font-black text-yellow-400 uppercase tracking-widest">
                                <span>{{ t('results.totalBalance', 'Saldo Total') }}</span>
                                <span class="flex items-center gap-1"><CoinIcon class="w-3.5 h-3.5" /> {{ matchRewards.breakdown[myUserId].totalCoins || '???' }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Premios de la Partida -->
                    <MatchHighlightsPanel :titles="titles" :player-map="playerMap" />
                    <!-- Acciones (Desktop) -->
                    <div class="hidden lg:block">
                        <PostGameActions
                            :am-i-host="amIHost"
                            :is-capturing="isCapturing"
                            @restart="resetGame"
                            @share="shareMatchSummary"
                            @exit="leaveGame"
                        />
                    </div>
                </div>
            </div>
        </div>

        <!-- FOOTER MÓVIL (fuera del scroll — correcto, es una barra fija en la parte inferior) -->
        <div class="lg:hidden flex-none bg-[#130a2f] border-t border-white/10 z-40">
            <div class="max-w-sm mx-auto px-4 py-3">
                <PostGameActions
                    :am-i-host="amIHost"
                    :is-capturing="isCapturing"
                    @restart="resetGame"
                    @share="shareMatchSummary"
                    @exit="leaveGame"
                />
            </div>
        </div>

        <!-- Off-screen capture card -->
        <div v-if="showSummaryCard" style="position: fixed; top: 0; left: -3000px; z-index: 9999; pointer-events: none;" aria-hidden="true">
            <div ref="summaryCardRef" style="width: 1080px; height: 1920px; overflow: hidden; background-color: #1a0533;">
                <MatchSummaryCard :highlights="highlights" />
            </div>
        </div>
    </div>
</template>

<style scoped></style>
