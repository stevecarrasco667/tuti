<script setup lang="ts">
// [Sprint 2 - P2] GameOverView — Shell Delgado (orquestador)
// Ha sido descompuesto en sub-componentes atómicos bajo src/components/results/.
// Este archivo no debe superar ~100 líneas. Toda la lógica de display vive en los hijos.
import { computed, onMounted, nextTick, ref } from 'vue';
import { toPng } from 'html-to-image';
import { useGame } from '../composables/useGame';
import { useSound } from '../composables/useSound';
import { useTitles } from '../composables/useTitles';
import { usePlayerHistory } from '../composables/usePlayerHistory';
import { computeMatchHighlights } from '../composables/useMatchHighlights';
import type { MatchHighlights } from '../composables/useMatchHighlights';
import { useToast } from '../composables/useToast';
import { useI18n } from 'vue-i18n';

import ResultsHeader from './results/ResultsHeader.vue';
import RankingBoard from './results/RankingBoard.vue';
import ImpostorResultsView from './results/ImpostorResultsView.vue';
import MatchHighlightsPanel from './results/MatchHighlightsPanel.vue';
import PostGameActions from './results/PostGameActions.vue';
import MatchSummaryCard from './ui/MatchSummaryCard.vue';
import InstallPrompt from './InstallPrompt.vue';

const { gameState, myUserId, resetGame, leaveGame } = useGame();
const { playWin, playStop } = useSound();
const { assignTitles } = useTitles();
const { saveEntry } = usePlayerHistory();
const { addToast } = useToast();
const { t } = useI18n();

const amIHost = computed(() => gameState.value.players.find(p => p.id === myUserId.value)?.isHost || false);
const sortedPlayers = computed(() => [...gameState.value.players].sort((a, b) => b.score - a.score));
const top3 = computed(() => sortedPlayers.value.slice(0, 3));
const rest = computed(() => sortedPlayers.value.slice(3));
const iWon = computed(() => sortedPlayers.value[0]?.id === myUserId.value);

const titles = computed(() => assignTitles(gameState.value));
const titleMap = computed(() => {
    const m: Record<string, { emoji: string; title: string; description: string }> = {};
    for (const t of titles.value) m[t.playerId] = t;
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

onMounted(() => {
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
    <div class="h-full w-full flex flex-col overflow-hidden relative bg-panel-base">
        <!-- Fondos radiales de ambiente: absolute al contenedor raíz (fuera del scroll) -->
        <div class="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
        <div class="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-action-primary/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

        <!-- Install PWA Prompt (Sprint 4 P3) -->
        <InstallPrompt />

        <!-- BODY scrollable: TODO el contenido fluye aquí, nada lo tapa desde arriba -->
        <div class="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 lg:p-10 scrollbar-thin scrollbar-thumb-white/20 relative z-10">

            <!-- Título (VICTORIA / GAME OVER) — en flujo normal dentro del scroll -->
            <div class="mb-16 lg:mb-20">
                <ResultsHeader :i-won="iWon" :am-i-host="amIHost" />
            </div>

            <!-- Contenido principal: podio + sidebar -->
            <div class="w-full max-w-[1200px] mx-auto flex flex-col lg:grid lg:grid-cols-12 gap-10 lg:gap-16 items-start pb-8">

                <!-- COLUMNA IZQUIERDA -->
                <div class="w-full lg:col-span-7 xl:col-span-8 flex flex-col gap-10">
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

                <!-- COLUMNA DERECHA (sidebar desktop) -->
                <div class="w-full lg:col-span-5 xl:col-span-4 flex flex-col gap-6 sm:gap-8 mt-12 lg:mt-0">
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
        <div class="lg:hidden flex-none bg-panel-base border-t border-white/10 z-40">
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
