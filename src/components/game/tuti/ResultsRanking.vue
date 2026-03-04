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
    <!-- ARQUITECTURA DE 2 COLUMNAS (Responsive: 1 col en mobile, 2 cols asimétricas en desktop) -->
    <!-- Elimina 'min-h-full justify-center', usa el flow natural. Centrado dinámico mediante 'class="my-auto"' inyectada desde el padre -->
    <div class="w-full max-w-5xl mx-auto py-6 pb-32 xl:pb-6 px-2 lg:px-4">
        
        <div class="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_400px] gap-6 lg:gap-8 items-start">
            
            <!-- ══════════════════════════════════════════ -->
            <!-- COLUMNA IZQUIERDA: RANKING (Scroll Nativo) -->
            <!-- ══════════════════════════════════════════ -->
            <div class="space-y-3">
                <h3 class="text-xs font-black text-ink-soft uppercase tracking-widest px-1">🏆 Posiciones Finales</h3>

                <div class="space-y-2">
                    <div
                        v-for="(player, idx) in players"
                        :key="player.id"
                        class="relative overflow-hidden rounded-2xl flex items-center justify-between border transition-all duration-300"
                        :class="{
                            'p-4 border-amber-500/60 bg-gradient-to-r from-amber-900/30 via-amber-800/10 to-panel-card shadow-[0_0_25px_-5px_rgba(245,158,11,0.3)] scale-[1.02] transform-gpu z-10': idx === 0,
                            'p-3 border-sky-500/30 bg-gradient-to-r from-sky-900/20 to-panel-card/80 shadow-sm': idx === 1,
                            'p-3 border-orange-700/30 bg-gradient-to-r from-orange-900/20 to-panel-card/80 shadow-sm': idx === 2,
                            'p-2.5 border-white/5 bg-panel-card/60': idx > 2,
                        }"
                    >
                        <!-- Barra Progreso animada -->
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

                        <!-- BADGE & AVATAR -->
                        <div class="relative z-10 flex items-center gap-3">
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

                            <div class="flex items-center gap-2">
                                <span :class="idx === 0 ? 'text-3xl' : 'text-xl'" class="leading-none drop-shadow-sm">{{ player.avatar }}</span>
                                <span
                                    class="font-black truncate"
                                    :class="{
                                        'text-xl text-ink-main max-w-[150px] sm:max-w-[250px]': idx === 0,
                                        'text-base text-ink-main max-w-[120px] sm:max-w-[200px]': idx === 1 || idx === 2,
                                        'text-sm text-ink-soft max-w-[100px] sm:max-w-[180px]': idx > 2,
                                    }"
                                >{{ player.name }}</span>
                            </div>
                        </div>

                        <!-- SCORE -->
                        <div
                            class="relative z-10 font-black tabular-nums tracking-tighter drop-shadow-sm pl-2"
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
            </div>

            <!-- ══════════════════════════════════════════ -->
            <!-- COLUMNA DERECHA: SIDEBAR PEGAJOSO          -->
            <!-- ══════════════════════════════════════════ -->
            <div class="lg:sticky lg:top-4 space-y-3">
                <h3 class="text-xs font-black text-ink-soft uppercase tracking-widest px-1 flex items-center gap-2">
                    🎯 Tu Desempeño
                    <span class="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-ink-muted hidden lg:inline-block">Esta ronda</span>
                </h3>

                <div class="bg-panel-card/50 border border-white/8 rounded-2xl p-3 shadow-sm">
                    <!-- En desktop/tablet siempre muestra 1 o 2 columnas según el espacio lateral, en mobile adapta -->
                    <div class="grid grid-cols-2 lg:grid-cols-1 gap-2">
                        <div
                            v-for="category in categories"
                            :key="category"
                            class="rounded-xl p-2.5 flex items-center gap-2 border transition-colors bg-panel-base/40"
                            :class="{
                                'bg-green-900/10 border-green-500/20': myAnswers[category] && getPlayerStatus(myUserId, category).state === 'VALID',
                                'bg-red-900/10 border-red-500/20': getPlayerStatus(myUserId, category).state === 'REJECTED',
                                'border-transparent': !myAnswers[category] || getPlayerStatus(myUserId, category).state === 'EMPTY' || (myAnswers[category] && getPlayerStatus(myUserId, category).state !== 'VALID' && getPlayerStatus(myUserId, category).state !== 'REJECTED'),
                            }"
                        >
                            <span class="text-base leading-none flex-none w-5 text-center">{{ statusIcon(category) }}</span>
                            <div class="flex-1 min-w-0">
                                <div class="text-[9px] sm:text-[10px] uppercase font-black text-ink-muted mb-0.5 truncate tracking-widest" :title="category">
                                    {{ category }}
                                </div>
                                <div
                                    class="text-xs sm:text-sm font-black truncate leading-tight"
                                    :class="{
                                        'text-green-400': myAnswers[category] && getPlayerStatus(myUserId, category).state === 'VALID',
                                        'text-red-400 line-through opacity-70': getPlayerStatus(myUserId, category).state === 'REJECTED',
                                        'text-ink-muted': !myAnswers[category] || getPlayerStatus(myUserId, category).state === 'EMPTY',
                                        'text-ink-main': myAnswers[category] && getPlayerStatus(myUserId, category).state !== 'VALID' && getPlayerStatus(myUserId, category).state !== 'REJECTED' && getPlayerStatus(myUserId, category).state !== 'EMPTY',
                                    }"
                                >
                                    {{ myAnswers[category] || '—' }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>
