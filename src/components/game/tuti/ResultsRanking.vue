<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Player, CategoryRef } from '../../../../shared/types';
import { useSound } from '../../../composables/useSound';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
    players: Player[];
    myAnswers: Record<string, string>;
    categories: CategoryRef[];
    myUserId: string;
    getPlayerStatus: (playerId: string, category: string) => { state: string };
}>();

const { playWin, playTally } = useSound();
const { t } = useI18n();

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
    <div class="w-full max-w-5xl mx-auto py-6 pb-32 xl:pb-6 px-2 lg:px-4">
        
        <div class="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_400px] gap-6 lg:gap-8 items-start">
            
            <!-- ══════════════════════════════════════════ -->
            <!-- COLUMNA IZQUIERDA: RANKING Soft-Pop        -->
            <!-- ══════════════════════════════════════════ -->
            <div class="space-y-4">
                <h3 class="text-xs font-black text-ink-soft uppercase tracking-widest px-1">{{ t('results.finalPositions') }}</h3>

                <div class="space-y-3">
                    <div
                        v-for="(player, idx) in players"
                        :key="player.id"
                        class="relative overflow-hidden flex items-center justify-between border-2 transition-all duration-300"
                        :class="{
                            'p-4 rounded-[2rem] bg-panel-card border-game-yellow shadow-3d-yellow scale-[1.02] transform-gpu z-10': idx === 0,
                            'p-3 rounded-2xl bg-panel-card/80 border-white/10 shadow-sm': idx === 1,
                            'p-3 rounded-2xl bg-panel-card/60 border-white/5 shadow-sm': idx === 2,
                            'p-2.5 rounded-xl bg-panel-input border-transparent': idx > 2,
                        }"
                    >
                        <!-- Barra Progreso animada elástica (Soft-Pop) -->
                        <div
                            class="absolute inset-0 left-0 pointer-events-none transition-all duration-[1500ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                            :class="{
                                'bg-game-yellow/20': idx === 0,
                                'bg-white/10': idx === 1,
                                'bg-white/5': idx >= 2,
                            }"
                            :style="{ width: (barWidths[player.id] || 0) + '%' }"
                        ></div>

                        <!-- BADGE & AVATAR -->
                        <div class="relative z-10 flex items-center gap-3">
                            <div
                                class="flex-none flex items-center justify-center font-heading font-black rounded-full shadow-sm"
                                :class="{
                                    'w-12 h-12 text-2xl bg-game-yellow text-panel-base shadow-3d-yellow': idx === 0,
                                    'w-10 h-10 text-base bg-panel-input border-2 border-white/20 text-ink-main': idx === 1,
                                    'w-10 h-10 text-base bg-panel-input border-2 border-white/10 text-ink-muted': idx === 2,
                                    'w-8  h-8  text-xs  bg-panel-input border-2 border-transparent text-ink-muted': idx > 2,
                                }"
                            >
                                <span v-if="idx === 0">👑</span>
                                <span v-else>{{ idx + 1 }}</span>
                            </div>

                            <div class="flex items-center gap-2">
                                <span :class="idx === 0 ? 'text-4xl' : 'text-2xl'" class="leading-none drop-shadow-sm">{{ player.avatar }}</span>
                                <span
                                    class="font-black truncate tracking-wide"
                                    :class="{
                                        'text-xl md:text-2xl text-game-yellow max-w-[150px] sm:max-w-[250px]': idx === 0,
                                        'text-lg text-ink-main max-w-[120px] sm:max-w-[200px]': idx === 1 || idx === 2,
                                        'text-base text-ink-soft max-w-[100px] sm:max-w-[180px]': idx > 2,
                                    }"
                                >{{ player.name }}</span>
                            </div>
                        </div>

                        <!-- SCORE -->
                        <div
                            class="relative z-10 font-heading font-black tabular-nums tracking-tighter drop-shadow-sm pl-2"
                            :class="{
                                'text-5xl text-game-yellow': idx === 0,
                                'text-3xl text-ink-main': idx === 1,
                                'text-3xl text-ink-muted': idx === 2,
                                'text-2xl text-ink-muted opacity-50': idx > 2,
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
                    {{ t('results.yourPerformance') }}
                    <span class="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-ink-muted hidden lg:inline-block">{{ t('results.thisRound') }}</span>
                </h3>

                <div class="bg-panel-card/50 border-2 border-white/5 rounded-3xl p-3 shadow-3d-panel">
                    <div class="grid grid-cols-2 lg:grid-cols-1 gap-2">
                        <div
                            v-for="category in categories"
                            :key="category.id"
                            class="rounded-2xl p-3 flex items-center gap-3 border-2 transition-colors bg-panel-base/40"
                            :class="{
                                'bg-game-green/10 border-game-green/30': myAnswers[category.name] && getPlayerStatus(myUserId, category.name).state === 'VALID',
                                'bg-game-red/10 border-game-red/30': getPlayerStatus(myUserId, category.name).state === 'REJECTED',
                                'border-transparent': !myAnswers[category.name] || getPlayerStatus(myUserId, category.name).state === 'EMPTY' || (myAnswers[category.name] && getPlayerStatus(myUserId, category.name).state !== 'VALID' && getPlayerStatus(myUserId, category.name).state !== 'REJECTED'),
                            }"
                        >
                            <span class="text-xl leading-none flex-none w-6 text-center drop-shadow-sm">{{ statusIcon(category.name) }}</span>
                            <div class="flex-1 min-w-0">
                                <div class="text-[9px] sm:text-[10px] uppercase font-black text-ink-muted mb-0.5 truncate tracking-widest" :title="t(`categories.${category.id}`, category.name)">
                                    {{ t(`categories.${category.id}`, category.name) }}
                                </div>
                                <div
                                    class="text-sm sm:text-base font-heading font-black truncate leading-tight"
                                    :class="{
                                        'text-game-green': myAnswers[category.name] && getPlayerStatus(myUserId, category.name).state === 'VALID',
                                        'text-game-red line-through opacity-70': getPlayerStatus(myUserId, category.name).state === 'REJECTED',
                                        'text-ink-muted': !myAnswers[category.name] || getPlayerStatus(myUserId, category.name).state === 'EMPTY',
                                        'text-ink-main': myAnswers[category.name] && getPlayerStatus(myUserId, category.name).state !== 'VALID' && getPlayerStatus(myUserId, category.name).state !== 'REJECTED' && getPlayerStatus(myUserId, category.name).state !== 'EMPTY',
                                    }"
                                >
                                    {{ myAnswers[category.name] || '—' }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>
