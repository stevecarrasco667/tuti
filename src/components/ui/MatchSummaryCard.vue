<script lang="ts">
// MatchSummaryCard.vue — Fase 2: Tarjeta viral 1080×1920
// Diseño Solid Pop: sin backdrop-filter para captura confiable con html-to-image.
// El componente vive off-screen hasta que se captura la imagen.
export default { name: 'MatchSummaryCard' };
</script>

<script setup lang="ts">
import type { MatchHighlights, ClassicHighlights, ImpostorHighlights } from '../../composables/useMatchHighlights';

const props = defineProps<{ highlights: MatchHighlights }>();

const isClassic = (h: MatchHighlights): h is ClassicHighlights => h.mode === 'CLASSIC';
const isImpostor = (h: MatchHighlights): h is ImpostorHighlights => h.mode === 'IMPOSTOR';

const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

const rankEmoji = (i: number) => ['🥇', '🥈', '🥉'][i] ?? `#${i + 1}`;

const winnerLabel = (h: ImpostorHighlights) => {
    if (h.winner === 'IMPOSTOR') return { text: '¡EL IMPOSTOR GANÓ!', color: '#f43f5e' };
    if (h.winner === 'CREW') return { text: '¡LOS CIUDADANOS GANARON!', color: '#22c55e' };
    return { text: 'EMPATE', color: '#fbbf24' };
};
</script>

<template>
    <!-- Root: exactly 1080×1920 solid background — no blur classes to ensure capture fidelity -->
    <div
        style="
            width: 1080px;
            height: 1920px;
            background: #1a0533;
            font-family: 'Outfit', 'Inter', system-ui, sans-serif;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative;
        "
    >
        <!-- ░░ BACKGROUND DECORATION ░░ -->
        <div style="
            position: absolute; inset: 0; pointer-events: none; overflow: hidden;
        ">
            <!-- Blob top-right -->
            <div style="
                position: absolute; top: -120px; right: -120px;
                width: 560px; height: 560px; border-radius: 50%;
                background: #49107A; opacity: 0.6;
            "></div>
            <!-- Blob bottom-left -->
            <div style="
                position: absolute; bottom: -80px; left: -80px;
                width: 420px; height: 420px; border-radius: 50%;
                background: #3b0764; opacity: 0.5;
            "></div>
            <!-- Accent stripe -->
            <div style="
                position: absolute; top: 0; left: 0; right: 0;
                height: 8px; background: #fbbf24;
            "></div>
        </div>

        <!-- ░░ HEADER ░░ -->
        <div style="
            padding: 72px 80px 0;
            display: flex; flex-direction: column; align-items: center; text-align: center;
            position: relative; z-index: 2;
        ">
            <!-- Logo wordmark -->
            <div style="
                font-size: 52px; font-weight: 900; letter-spacing: -2px;
                color: #fbbf24; text-transform: uppercase; line-height: 1;
            ">TUTI GAMES</div>

            <!-- Mode badge -->
            <div style="
                margin-top: 24px;
                display: inline-block;
                background: #49107A; border: 3px solid #fbbf24;
                border-radius: 100px; padding: 12px 40px;
            ">
                <span style="
                    font-size: 28px; font-weight: 800; letter-spacing: 6px;
                    text-transform: uppercase; color: #fbbf24;
                ">
                    {{ highlights.mode === 'CLASSIC' ? 'Tuti Fruti' : 'El Impostor' }}
                </span>
            </div>

            <!-- Title -->
            <div style="
                margin-top: 48px;
                font-size: 88px; font-weight: 900; line-height: 1.05;
                color: #ffffff; letter-spacing: -3px; text-transform: uppercase;
            ">RESUMEN<br>DE LA PARTIDA</div>

            <!-- Divider -->
            <div style="
                margin-top: 40px;
                width: 160px; height: 6px; border-radius: 3px; background: #fbbf24;
            "></div>
        </div>

        <!-- ░░ BODY ░░ -->
        <div style="
            flex: 1; padding: 48px 80px;
            display: flex; flex-direction: column; gap: 40px;
            position: relative; z-index: 2;
            overflow: hidden;
        ">

            <!-- ══ CLASSIC MODE ══ -->
            <template v-if="isClassic(highlights)">

                <!-- Podium -->
                <div style="
                    background: #2e1060; border-radius: 32px;
                    border: 3px solid #49107A;
                    padding: 40px 48px;
                ">
                    <div style="
                        font-size: 26px; font-weight: 800; letter-spacing: 5px;
                        text-transform: uppercase; color: #fbbf24; margin-bottom: 32px;
                    ">🏆 Podio Final</div>

                    <div v-for="(p, i) in highlights.podium" :key="p.id" style="
                        display: flex; align-items: center; gap: 24px;
                        margin-bottom: 28px;
                    ">
                        <!-- Rank badge -->
                        <div style="
                            width: 64px; height: 64px; border-radius: 20px;
                            display: flex; align-items: center; justify-content: center;
                            font-size: 36px;
                            background: #49107A; border: 3px solid #fbbf2440;
                            flex-shrink: 0;
                        ">{{ rankEmoji(i) }}</div>

                        <!-- Avatar -->
                        <div style="
                            width: 80px; height: 80px; border-radius: 50%;
                            background: #49107A; border: 4px solid #fbbf2440;
                            display: flex; align-items: center; justify-content: center;
                            font-size: 44px; flex-shrink: 0;
                        ">{{ p.avatar }}</div>

                        <!-- Name -->
                        <div style="font-size: 40px; font-weight: 800; color: #fff; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            {{ p.name }}
                        </div>

                        <!-- Score -->
                        <div style="
                            font-size: 40px; font-weight: 900; color: #fbbf24;
                            background: #49107A; border-radius: 16px;
                            padding: 8px 28px; border: 2px solid #fbbf2440;
                            flex-shrink: 0;
                        ">{{ p.score }} pts</div>
                    </div>

                    <!-- Empty podio -->
                    <div v-if="highlights.podium.length === 0" style="color: #ffffff60; font-size: 32px; text-align: center;">
                        Sin jugadores registrados
                    </div>
                </div>

                <!-- Stats row -->
                <div style="display: flex; gap: 32px;">
                    <!-- Rondas jugadas -->
                    <div style="
                        flex: 1; background: #2e1060; border-radius: 28px;
                        border: 3px solid #49107A; padding: 36px;
                        display: flex; flex-direction: column; align-items: center; text-align: center;
                    ">
                        <div style="font-size: 64px; margin-bottom: 8px;">🎲</div>
                        <div style="font-size: 72px; font-weight: 900; color: #fbbf24; line-height: 1;">{{ highlights.roundsPlayed }}</div>
                        <div style="font-size: 26px; font-weight: 700; color: #ffffff90; letter-spacing: 3px; text-transform: uppercase; margin-top: 8px;">Rondas</div>
                    </div>

                    <!-- Flash player -->
                    <div v-if="highlights.flashPlayer" style="
                        flex: 2; background: #2e1060; border-radius: 28px;
                        border: 3px solid #fbbf24; padding: 36px;
                        display: flex; flex-direction: column; align-items: center; text-align: center;
                    ">
                        <div style="font-size: 26px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase; color: #fbbf24; margin-bottom: 16px;">⚡ Jugador Flash</div>
                        <div style="font-size: 64px; margin-bottom: 8px;">{{ highlights.flashPlayer.avatar }}</div>
                        <div style="font-size: 44px; font-weight: 900; color: #fff;">{{ highlights.flashPlayer.name }}</div>
                        <div style="font-size: 28px; font-weight: 700; color: #fbbf24; margin-top: 8px;">{{ highlights.flashPlayer.score }} pts</div>
                    </div>
                </div>

                <!-- Most rejected word -->
                <div v-if="highlights.mostRejectedWord" style="
                    background: #49107A; border-radius: 28px;
                    border: 3px solid #f43f5e60;
                    padding: 36px 48px;
                    display: flex; align-items: center; gap: 32px;
                ">
                    <div style="font-size: 64px;">💀</div>
                    <div style="flex: 1;">
                        <div style="font-size: 24px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; color: #f43f5e; margin-bottom: 8px;">Palabra más rechazada</div>
                        <div style="font-size: 52px; font-weight: 900; color: #fff; line-height: 1.1;">
                            "{{ highlights.mostRejectedWord.word }}"
                        </div>
                        <div style="font-size: 30px; color: #ffffff80; margin-top: 8px;">
                            de {{ highlights.mostRejectedWord.player.avatar }} {{ highlights.mostRejectedWord.player.name }}
                        </div>
                    </div>
                </div>

            </template>

            <!-- ══ IMPOSTOR MODE ══ -->
            <template v-else-if="isImpostor(highlights)">

                <!-- Winner banner -->
                <div style="
                    border-radius: 32px; padding: 48px;
                    text-align: center;
                    border: 4px solid;
                " :style="{
                    background: highlights.winner === 'IMPOSTOR' ? '#4c0519' : '#052e16',
                    borderColor: highlights.winner === 'IMPOSTOR' ? '#f43f5e' : '#22c55e',
                }">
                    <div style="font-size: 100px; margin-bottom: 16px;">
                        {{ highlights.winner === 'IMPOSTOR' ? '🎭' : '🕵️' }}
                    </div>
                    <div style="font-size: 64px; font-weight: 900; line-height: 1.1; color: #fff;">
                        {{ winnerLabel(highlights).text }}
                    </div>
                </div>

                <!-- Impostors revealed -->
                <div style="
                    background: #2e1060; border-radius: 32px;
                    border: 3px solid #f43f5e60; padding: 40px 48px;
                ">
                    <div style="font-size: 26px; font-weight: 800; letter-spacing: 5px; text-transform: uppercase; color: #f43f5e; margin-bottom: 28px;">🎭 El Impostor era...</div>
                    <div v-for="imp in highlights.impostors" :key="imp.id" style="display: flex; align-items: center; gap: 24px; margin-bottom: 20px;">
                        <div style="font-size: 56px;">{{ imp.avatar }}</div>
                        <div style="font-size: 48px; font-weight: 900; color: #fff;">{{ imp.name }}</div>
                    </div>
                    <div v-if="highlights.impostors.length === 0" style="font-size: 36px; color: #ffffff50;">Desconocido</div>
                </div>

                <!-- Secret word + category -->
                <div v-if="highlights.secretWord" style="
                    background: #2e1060; border-radius: 28px;
                    border: 3px solid #fbbf2460; padding: 40px 48px;
                ">
                    <div style="font-size: 26px; font-weight: 800; letter-spacing: 5px; text-transform: uppercase; color: #fbbf24; margin-bottom: 16px;">
                        🔑 La Palabra Secreta
                        <span v-if="highlights.categoryName" style="font-size: 22px; font-weight: 600; color: #fbbf2480; margin-left: 12px;">({{ highlights.categoryName }})</span>
                    </div>
                    <div style="font-size: 72px; font-weight: 900; color: #fff; letter-spacing: -2px;">
                        {{ highlights.secretWord }}
                    </div>
                </div>

                <!-- Most suspect innocente -->
                <div v-if="highlights.mostSuspectPlayer" style="
                    background: #49107A; border-radius: 28px;
                    border: 3px solid #fbbf2440; padding: 36px 48px;
                    display: flex; align-items: center; gap: 32px;
                ">
                    <div style="font-size: 64px;">🧐</div>
                    <div>
                        <div style="font-size: 24px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; color: #fbbf24; margin-bottom: 8px;">Ciudadano más sospechoso</div>
                        <div style="font-size: 52px; font-weight: 900; color: #fff;">
                            {{ highlights.mostSuspectPlayer.avatar }} {{ highlights.mostSuspectPlayer.name }}
                        </div>
                        <div style="font-size: 26px; color: #ffffff70; margin-top: 4px;">Se llevó más votos siendo inocente 😅</div>
                    </div>
                </div>

            </template>

        </div>

        <!-- ░░ FOOTER ░░ -->
        <div style="
            padding: 40px 80px 64px;
            display: flex; justify-content: space-between; align-items: center;
            border-top: 3px solid #ffffff15;
            position: relative; z-index: 2;
        ">
            <div style="font-size: 30px; font-weight: 800; color: #fbbf24; letter-spacing: 2px;">tutigames.io</div>
            <div style="font-size: 26px; font-weight: 600; color: #ffffff50;">{{ today }}</div>
            <div style="font-size: 30px; font-weight: 800; color: #fbbf24; letter-spacing: 1px;">¿Jugamos otra? 🎯</div>
        </div>
    </div>
</template>
