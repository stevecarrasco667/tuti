<script setup lang="ts">
import { computed } from 'vue';
import type { MatchHighlights, ClassicHighlights, ImpostorHighlights } from '../../composables/useMatchHighlights';

const props = defineProps<{ highlights: MatchHighlights }>();

const isClassic = computed(() => props.highlights.mode === 'CLASSIC');
const ch = computed(() => props.highlights as ClassicHighlights);
const ih = computed(() => props.highlights as ImpostorHighlights);

// Winner colors for impostor result
const resultColor = computed(() =>
    ih.value.winner === 'IMPOSTOR' ? '#f43f5e' : '#22c55e'
);
const resultBg = computed(() =>
    ih.value.winner === 'IMPOSTOR' ? '#3b0018' : '#052e16'
);
</script>

<template>
    <!-- Root: exactly 1080×1920 for html-to-image capture -->
    <div class="card-root">

        <!-- Decorative blobs (solid, no backdrop-filter) -->
        <div class="blob blob-top" />
        <div class="blob blob-bottom" />

        <!-- ═══════════ HEADER ═══════════ -->
        <div class="card-header">
            <div>
                <div class="header-logo">🎮 TUTI GAMES</div>
                <div class="header-sub">✦ Resumen de Partida ✦</div>
            </div>
            <div class="mode-badge">
                {{ isClassic ? '🎯 TUTI CLÁSICO' : '🕵️ IMPOSTOR' }}
            </div>
        </div>

        <!-- ═══════════════════════════════════════════ -->
        <!-- CLASSIC MODE                                -->
        <!-- ═══════════════════════════════════════════ -->
        <template v-if="isClassic">

            <!-- Champion spotlight -->
            <div class="champion-section">
                <div class="crown">👑</div>
                <div class="champion-avatar">{{ ch.podium[0]?.avatar }}</div>
                <div class="champion-name">{{ ch.podium[0]?.name }}</div>
                <div class="champion-score">{{ ch.podium[0]?.score }} pts</div>
            </div>

            <!-- 2nd & 3rd place -->
            <div class="podium-row">
                <div v-if="ch.podium[1]" class="podium-item">
                    <span class="podium-pos">🥈</span>
                    <span class="podium-av">{{ ch.podium[1].avatar }}</span>
                    <span class="podium-name">{{ ch.podium[1].name }}</span>
                    <span class="podium-pts">{{ ch.podium[1].score }} pts</span>
                </div>
                <div v-if="ch.podium[2]" class="podium-item">
                    <span class="podium-pos">🥉</span>
                    <span class="podium-av">{{ ch.podium[2].avatar }}</span>
                    <span class="podium-name">{{ ch.podium[2].name }}</span>
                    <span class="podium-pts">{{ ch.podium[2].score }} pts</span>
                </div>
            </div>

            <!-- Stats ribbon -->
            <div class="stats-ribbon">
                <span>{{ ch.roundsPlayed }} rondas</span>
                <span class="dot">·</span>
                <span>{{ ch.totalPlayers }} jugadores</span>
            </div>

            <!-- Highlights -->
            <div class="highlights">
                <div class="hl-label">✨ HIGHLIGHTS</div>

                <!-- La Polémica -->
                <div v-if="ch.mostControversial" class="hl-card hl-card--red">
                    <div class="hl-tag">🔥 La Polémica del Cierre</div>
                    <div class="hl-answer">"{{ ch.mostControversial.answer }}"</div>
                    <div class="hl-detail">
                        {{ ch.mostControversial.playerAvatar }} {{ ch.mostControversial.playerName }}
                        en "{{ ch.mostControversial.category }}"
                        — {{ ch.mostControversial.voteCount }} voto{{ ch.mostControversial.voteCount !== 1 ? 's' : '' }} en contra
                    </div>
                </div>

                <!-- El Velocista -->
                <div v-if="ch.velocista" class="hl-card hl-card--purple">
                    <div class="hl-tag">⚡ El Velocista (última ronda)</div>
                    <div class="hl-answer">{{ ch.velocista.avatar }} {{ ch.velocista.name }}</div>
                    <div class="hl-detail">
                        Rellenó {{ ch.velocista.filledCount }} categorías primero
                    </div>
                </div>
            </div>

        </template>

        <!-- ═══════════════════════════════════════════ -->
        <!-- IMPOSTOR MODE                               -->
        <!-- ═══════════════════════════════════════════ -->
        <template v-else>

            <!-- Result banner -->
            <div class="result-section" :style="{ background: resultBg }">
                <div class="result-emoji">{{ ih.winner === 'IMPOSTOR' ? '🎭' : '✅' }}</div>
                <div class="result-title" :style="{ color: resultColor }">
                    {{ ih.winner === 'IMPOSTOR' ? '¡EL IMPOSTOR GANÓ!' : '¡CIUDADANOS TRIUNFARON!' }}
                </div>
                <div class="result-sub">
                    {{ ih.winner === 'IMPOSTOR' ? 'Nadie lo descubrió...' : 'El engaño fue expuesto.' }}
                </div>
            </div>

            <!-- Impostor cards -->
            <div class="imp-cards">

                <!-- Impostor identity -->
                <div class="imp-card">
                    <div class="imp-card-label">🎭 El Impostor era...</div>
                    <div class="imp-identity">
                        <span class="imp-avatar">{{ ih.impostorAvatar }}</span>
                        <span class="imp-name">{{ ih.impostorName ?? '???' }}</span>
                    </div>
                </div>

                <!-- Secret word -->
                <div v-if="ih.secretWord" class="imp-card imp-card--amber">
                    <div class="imp-card-label">🔐 La Palabra Secreta era...</div>
                    <div class="secret-word">{{ ih.secretWord }}</div>
                </div>

                <!-- Most suspected -->
                <div v-if="ih.mostSuspected" class="imp-card imp-card--soft">
                    <div class="imp-card-label">🎯 El Inocente más Sospechoso</div>
                    <div class="imp-identity">
                        <span class="imp-avatar-sm">{{ ih.mostSuspected.avatar }}</span>
                        <span class="imp-name-sm">{{ ih.mostSuspected.name }}</span>
                    </div>
                    <div class="imp-acc">
                        Recibió {{ ih.mostSuspected.accusationCount }} acusación{{ ih.mostSuspected.accusationCount !== 1 ? 'es' : '' }}
                    </div>
                </div>

                <!-- Player count -->
                <div class="players-badge">
                    👥 {{ ih.totalPlayers }} jugadores
                </div>
            </div>

        </template>

        <!-- ═══════════ FOOTER ═══════════ -->
        <div class="card-footer">
            <span class="footer-url">tutigames.io</span>
            <span class="footer-date">{{ highlights.date }}</span>
        </div>

    </div>
</template>

<style scoped>
/* ─── Root ─────────────────────────────────────────────────────────────────── */
.card-root {
    width: 1080px;
    height: 1920px;
    background: linear-gradient(155deg, #3b0764 0%, #2E0249 55%, #1a0130 100%);
    font-family: 'Nunito', sans-serif;
    color: #ede9fe;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
}

/* ─── Decorative blobs ─────────────────────────────────────────────────────── */
.blob {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
}
.blob-top {
    width: 700px;
    height: 700px;
    background: radial-gradient(circle, rgba(251,191,36,0.10) 0%, transparent 70%);
    top: -250px;
    right: -200px;
}
.blob-bottom {
    width: 900px;
    height: 900px;
    background: radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%);
    bottom: -350px;
    left: -350px;
}

/* ─── Header ──────────────────────────────────────────────────────────────── */
.card-header {
    background: #fbbf24;
    padding: 44px 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
}
.header-logo {
    font-size: 38px;
    font-weight: 900;
    color: #2E0249;
    letter-spacing: 0.15em;
    text-transform: uppercase;
}
.header-sub {
    font-size: 20px;
    font-weight: 700;
    color: #49107A;
    margin-top: 6px;
    letter-spacing: 0.1em;
}
.mode-badge {
    background: #2E0249;
    color: #fbbf24;
    font-size: 22px;
    font-weight: 900;
    padding: 14px 30px;
    border-radius: 100px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: nowrap;
}

/* ─── Classic: Champion ───────────────────────────────────────────────────── */
.champion-section {
    padding: 52px 64px 24px;
    text-align: center;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
}
.crown { font-size: 72px; line-height: 1; }
.champion-avatar { font-size: 108px; line-height: 1.1; margin-top: 4px; }
.champion-name {
    font-size: 76px;
    font-weight: 900;
    color: #fbbf24;
    text-transform: uppercase;
    letter-spacing: -0.02em;
    line-height: 1;
    margin-top: 12px;
}
.champion-score {
    font-size: 46px;
    font-weight: 800;
    color: #ede9fe;
    margin-top: 6px;
}

/* ─── Classic: Podium ─────────────────────────────────────────────────────── */
.podium-row {
    display: flex;
    justify-content: center;
    gap: 40px;
    padding: 28px 80px;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
}
.podium-item {
    background: #49107A;
    border: 3px solid rgba(251,191,36,0.25);
    border-radius: 28px;
    padding: 28px 36px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    flex: 1;
}
.podium-pos { font-size: 40px; }
.podium-av  { font-size: 60px; }
.podium-name {
    font-size: 30px;
    font-weight: 900;
    color: #ede9fe;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-align: center;
}
.podium-pts {
    font-size: 26px;
    font-weight: 700;
    color: #fbbf24;
}

/* ─── Classic: Stats ribbon ───────────────────────────────────────────────── */
.stats-ribbon {
    text-align: center;
    padding: 16px;
    font-size: 26px;
    font-weight: 700;
    color: rgba(237,233,254,0.45);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
}
.dot { margin: 0 16px; }

/* ─── Classic: Highlights ─────────────────────────────────────────────────── */
.highlights {
    flex: 1;
    padding: 16px 60px 0;
    display: flex;
    flex-direction: column;
    gap: 24px;
    position: relative;
    z-index: 1;
}
.hl-label {
    font-size: 24px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.25em;
    color: rgba(237,233,254,0.55);
    margin-bottom: 4px;
}
.hl-card {
    border-radius: 28px;
    padding: 36px 44px;
}
.hl-card--red   { background: #49107A; border-left: 10px solid #f43f5e; }
.hl-card--purple{ background: #3b0764; border-left: 10px solid #a78bfa; }
.hl-tag {
    font-size: 22px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: rgba(237,233,254,0.6);
    margin-bottom: 12px;
}
.hl-answer {
    font-size: 50px;
    font-weight: 900;
    color: #ffffff;
    line-height: 1.1;
    word-break: break-word;
}
.hl-detail {
    font-size: 26px;
    font-weight: 600;
    color: rgba(237,233,254,0.75);
    margin-top: 10px;
}

/* ─── Impostor: Result banner ─────────────────────────────────────────────── */
.result-section {
    padding: 64px 64px 40px;
    text-align: center;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
}
.result-emoji { font-size: 96px; line-height: 1; }
.result-title {
    font-size: 64px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -0.02em;
    line-height: 1.1;
    margin-top: 16px;
}
.result-sub {
    font-size: 32px;
    font-weight: 600;
    color: rgba(237,233,254,0.65);
    margin-top: 14px;
}

/* ─── Impostor: Cards ─────────────────────────────────────────────────────── */
.imp-cards {
    flex: 1;
    padding: 20px 60px;
    display: flex;
    flex-direction: column;
    gap: 28px;
    position: relative;
    z-index: 1;
}
.imp-card {
    background: #49107A;
    border-radius: 28px;
    padding: 36px 44px;
    border: 3px solid rgba(251,191,36,0.20);
}
.imp-card--amber { border-color: rgba(251,191,36,0.6); }
.imp-card--soft  { border-color: rgba(167,139,250,0.4); }
.imp-card-label {
    font-size: 22px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: rgba(237,233,254,0.55);
    margin-bottom: 14px;
}
.imp-identity {
    display: flex;
    align-items: center;
    gap: 20px;
}
.imp-avatar    { font-size: 72px; }
.imp-avatar-sm { font-size: 56px; }
.imp-name {
    font-size: 62px;
    font-weight: 900;
    color: #fbbf24;
    line-height: 1;
}
.imp-name-sm {
    font-size: 48px;
    font-weight: 900;
    color: #ede9fe;
    line-height: 1;
}
.secret-word {
    font-size: 74px;
    font-weight: 900;
    color: #fbbf24;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-top: 8px;
}
.imp-acc {
    font-size: 28px;
    font-weight: 600;
    color: rgba(237,233,254,0.7);
    margin-top: 12px;
}
.players-badge {
    text-align: center;
    font-size: 28px;
    font-weight: 700;
    color: rgba(237,233,254,0.4);
    letter-spacing: 0.1em;
}

/* ─── Footer ──────────────────────────────────────────────────────────────── */
.card-footer {
    background: rgba(0,0,0,0.45);
    padding: 32px 64px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
}
.footer-url {
    font-size: 30px;
    font-weight: 900;
    color: #fbbf24;
    letter-spacing: 0.12em;
}
.footer-date {
    font-size: 22px;
    font-weight: 700;
    color: rgba(237,233,254,0.45);
}
</style>
