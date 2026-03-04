<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Player } from '../../../../shared/types';
import { useSound } from '../../../composables/useSound';

const props = defineProps<{
    players: Player[];
    myAnswers: Record<string, string>;
    categories: string[];
    myUserId: string;
    getPlayerStatus: (playerId: string, category: string) => { state: string };
}>();

const { playWin, playTally } = useSound();

// Animation States
const displayScores = ref<Record<string, number>>({});
const barWidths = ref<Record<string, number>>({});

const maxScore = computed(() => Math.max(1, ...props.players.map(p => p.score)));

// Emoji de estado para "Tu Desempeño"
const statusIcon = (category: string) => {
    const status = props.getPlayerStatus(props.myUserId, category).state;
    if (!props.myAnswers[category] || status === 'EMPTY') return '—';
    if (status === 'VALID') return '✅';
    if (status === 'REJECTED') return '❌';
    return '⏳';
};

onMounted(() => {
    props.players.forEach(p => {
        displayScores.value[p.id] = 0;
        barWidths.value[p.id] = 0;
    });

    setTimeout(() => {
        props.players.forEach(p => {
            const pct = (p.score / maxScore.value) * 100;
            barWidths.value[p.id] = Math.max(3, pct);
        });

        const frames = 30;
        const interval = setInterval(() => {
            let finishedCount = 0;
            let soundPlayedInFrame = false;
            props.players.forEach(p => {
                const target = p.score;
                const current = displayScores.value[p.id] || 0;
                if (current < target) {
                    displayScores.value[p.id] = Math.min(target, current + Math.ceil(target / frames));
                    if (!soundPlayedInFrame) { playTally(); soundPlayedInFrame = true; }
                } else { finishedCount++; }
            });
            if (finishedCount === props.players.length) {
                clearInterval(interval);
                setTimeout(() => playWin(), 200);
            }
        }, 1500 / frames);
    }, 300);
});
</script>

<template>
    <!-- Centrado vertical: min-h-full flex-col justify-center (Fase 3) -->
    <div class="w-full max-w-xl mx-auto flex flex-col justify-center min-h-full pb-4 gap-5">

        <!-- ══════════════════════════════════════════ -->
        <!-- RANKING — PODIO HERO (Fase 1)             -->
        <!-- ══════════════════════════════════════════ -->
        <div class="space-y-2">
            <h3 class="text-xs font-black text-ink-soft uppercase tracking-widest mb-3 px-1 text-center">🏆 Posiciones</h3>

            <div
                v-for="(player, idx) in players"
                :key="player.id"
                class="relative overflow-hidden rounded-2xl flex items-center justify-between border transition-all duration-300"
                :class="{
                    // 1er lugar — tarjeta GRANDE con borde dorado
                    'p-4 border-amber-500/60 bg-gradient-to-r from-amber-900/30 via-amber-800/10 to-panel-card shadow-[0_0_25px_-5px_rgba(245,158,11,0.3)] scale-[1.02]': idx === 0,
                    // 2do lugar
                    'p-3 border-sky-500/30 bg-gradient-to-r from-sky-900/20 to-panel-card/80 shadow-sm': idx === 1,
                    // 3er lugar
                    'p-3 border-orange-700/30 bg-gradient-to-r from-orange-900/20 to-panel-card/80 shadow-sm': idx === 2,
                    // Resto — compactos
                    'p-2.5 border-white/5 bg-panel-card/60': idx > 2,
                }"
            >
                <!-- Barra de progreso de fondo VISIBLE (Fase 1 — fix C3) -->
                <div
                    class="absolute inset-0 left-0 transition-all duration-1000 ease-out pointer-events-none"
                    :class="{
                        'bg-gradient-to-r from-amber-500/25 to-transparent': idx === 0,
                        'bg-gradient-to-r from-sky-500/15 to-transparent': idx === 1,
                        'bg-gradient-to-r from-orange-600/12 to-transparent': idx === 2,
                        'bg-gradient-to-r from-white/5 to-transparent': idx > 2,
                    }"
                    :style="{ width: (barWidths[player.id] || 0) + '%' }"
                ></div>

                <!-- RANK BADGE + NOMBRE -->
                <div class="relative z-10 flex items-center gap-3">
                    <!-- Badge de posición -->
                    <div
                        class="flex-none flex items-center justify-center font-black rounded-full border-2 shadow-sm"
                        :class="{
                            'w-11 h-11 text-2xl bg-amber-900/40 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]': idx === 0,
                            'w-9  h-9  text-sm  bg-sky-900/30  border-sky-500/50  text-sky-300': idx === 1,
                            'w-9  h-9  text-sm  bg-orange-900/30 border-orange-500/50 text-orange-400': idx === 2,
                            'w-7  h-7  text-xs  bg-panel-input  border-white/10  text-ink-muted': idx > 2,
                        }"
                    >
                        <span v-if="idx === 0">👑</span>
                        <span v-else>{{ idx + 1 }}</span>
                    </div>

                    <!-- Avatar + Nombre -->
                    <div class="flex items-center gap-2">
                        <span :class="idx === 0 ? 'text-3xl' : 'text-xl'" class="leading-none drop-shadow-sm">{{ player.avatar }}</span>
                        <span
                            class="font-black truncate"
                            :class="{
                                'text-xl text-ink-main max-w-[180px]': idx === 0,
                                'text-base text-ink-main max-w-[150px]': idx === 1 || idx === 2,
                                'text-sm text-ink-soft max-w-[120px]': idx > 2,
                            }"
                        >{{ player.name }}</span>
                    </div>
                </div>

                <!-- SCORE -->
                <div
                    class="relative z-10 font-black tabular-nums tracking-tighter drop-shadow-sm"
                    :class="{
                        'text-5xl text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]': idx === 0,
                        'text-3xl text-sky-300': idx === 1,
                        'text-3xl text-orange-400': idx === 2,
                        'text-2xl text-ink-muted': idx > 2,
                    }"
                >
                    {{ displayScores[player.id] || 0 }}
                </div>
            </div>
        </div>

        <!-- ══════════════════════════════════════════ -->
        <!-- TU DESEMPEÑO — Limpieza Visual (Fase 2)   -->
        <!-- ══════════════════════════════════════════ -->
        <div class="bg-panel-card/50 border border-white/8 rounded-2xl p-3 md:p-4">
            <h3 class="text-xs font-black text-ink-soft uppercase tracking-widest mb-3 text-center">🎯 Tu Desempeño</h3>
            <div class="grid gap-2"
                 :class="categories.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' : categories.length <= 6 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'"
            >
                <div
                    v-for="category in categories"
                    :key="category"
                    class="rounded-xl p-2.5 flex items-center gap-2 border transition-colors"
                    :class="{
                        'bg-green-900/20 border-green-500/25': myAnswers[category] && getPlayerStatus(myUserId, category).state === 'VALID',
                        'bg-red-900/20 border-red-500/25': getPlayerStatus(myUserId, category).state === 'REJECTED',
                        'bg-panel-input/50 border-white/5': !myAnswers[category] || getPlayerStatus(myUserId, category).state === 'EMPTY' || (myAnswers[category] && getPlayerStatus(myUserId, category).state !== 'VALID' && getPlayerStatus(myUserId, category).state !== 'REJECTED'),
                    }"
                >
                    <span class="text-base leading-none flex-none">{{ statusIcon(category) }}</span>
                    <div class="flex-1 min-w-0">
                        <div class="text-[9px] uppercase font-black text-ink-muted mb-0.5 truncate tracking-widest" :title="category">{{ category }}</div>
                        <div
                            class="text-sm font-black truncate leading-tight"
                            :class="{
                                'text-green-400': myAnswers[category] && getPlayerStatus(myUserId, category).state === 'VALID',
                                'text-red-400 line-through opacity-70': getPlayerStatus(myUserId, category).state === 'REJECTED',
                                'text-ink-muted': !myAnswers[category] || getPlayerStatus(myUserId, category).state === 'EMPTY',
                                'text-ink-main': myAnswers[category] && getPlayerStatus(myUserId, category).state !== 'VALID' && getPlayerStatus(myUserId, category).state !== 'REJECTED' && getPlayerStatus(myUserId, category).state !== 'EMPTY',
                            }"
                        >{{ myAnswers[category] || '—' }}</div>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>
