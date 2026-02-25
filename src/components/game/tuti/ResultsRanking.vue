<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Player } from '../../../../shared/types';
import { useSound } from '../../../composables/useSound';

const props = defineProps<{
    players: Player[]; // Assuming caller sorts this
    myAnswers: Record<string, string>;
    categories: string[];
    myUserId: string;
    getPlayerStatus: (playerId: string, category: string) => { state: string };
}>();

const { playWin, playTally } = useSound();

// Animation States
const displayScores = ref<Record<string, number>>({});
const barWidths = ref<Record<string, number>>({});

const maxScore = computed(() => {
    // Avoid division by zero, min 100 for visual scale or just max player
    return Math.max(1, ...props.players.map(p => p.score)); 
});

onMounted(() => {
    // 1. Initialize 0
    props.players.forEach(p => {
        displayScores.value[p.id] = 0;
        barWidths.value[p.id] = 0;
    });

    // 2. Start Animation Sequence
    setTimeout(() => {
        // A. Expand Bars (CSS Transition will handle smoothness)
        props.players.forEach(p => {
             // Calculate percentage relative to max score in this round
            const pct = (p.score / maxScore.value) * 100;
            barWidths.value[p.id] = Math.max(2, pct); // Min 2% visibility
        });

        // B. Tween Numbers (Manual interval)
        const animationDuration = 1500; // ms
        const frames = 30;
        const intervalTime = animationDuration / frames;

        const interval = setInterval(() => {
            let finishedCount = 0;
            let soundPlayedInFrame = false;

            props.players.forEach(p => {
                const target = p.score;
                const current = displayScores.value[p.id] || 0;
                
                if (current < target) {
                    const increment = Math.ceil(target / frames);
                    displayScores.value[p.id] = Math.min(target, current + increment);
                    
                    if (!soundPlayedInFrame) {
                        playTally();
                        soundPlayedInFrame = true; // One sound per frame, not per player
                    }
                } else {
                    finishedCount++;
                }
            });

            if (finishedCount === props.players.length) {
                clearInterval(interval);
                // C. Finish - Play Win Sound
                setTimeout(() => playWin(), 200);
            }
        }, intervalTime);

    }, 300); // Small delay before starting
});

</script>

<template>
    <div class="w-full max-w-lg mx-auto pb-6">
        <!-- Ranking List -->
        <div class="mb-8">
            <h3 class="text-sm font-black text-ink-main uppercase tracking-widest mb-3 px-2 text-center md:text-left">🏆 Posiciones Finales</h3>
            <div class="space-y-3">
                <div v-for="(player, idx) in players" :key="player.id"
                     class="relative overflow-hidden rounded-3xl bg-panel-card border-[3px] border-white p-3 flex flex-col justify-center shadow-sm"
                >
                    <!-- PROGRESS BAR BACKGROUND -->
                    <div class="absolute inset-0 bg-panel-input z-0"></div>
                    
                    <!-- ANIMATED PROGRESS BAR -->
                    <div class="absolute top-0 bottom-0 left-0 bg-gradient-to-r transition-all duration-1000 ease-out z-0 opacity-80"
                         :class="idx === 0 ? 'from-yellow-400 to-amber-300' : 'from-action-blue to-tuti-teal'"
                         :style="{ width: (barWidths[player.id] || 0) + '%' }"
                    ></div>

                    <!-- CONTENT ON TOP -->
                    <div class="relative z-10 flex items-center justify-between pl-2 pr-2">
                        <div class="flex items-center gap-3">
                             <!-- Rank Badge -->
                            <div class="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 shadow-sm" 
                                 :class="idx === 0 ? 'bg-amber-100 border-amber-300 text-amber-700 scale-110 drop-shadow-md' : 'bg-white border-panel-card text-ink-main'">
                                 <span v-if="idx === 0" class="text-lg">👑</span>
                                 <span v-else>{{ idx + 1 }}</span>
                            </div>
                            
                            <!-- Avatar & Name -->
                            <div class="flex items-center gap-2 bg-white/40 px-2 py-1 rounded-full border border-white/50 backdrop-blur-sm">
                                <span class="text-2xl leading-none drop-shadow-sm">{{ player.avatar }}</span>
                                <span class="font-black text-lg text-ink-main truncate max-w-[120px]">{{ player.name }}</span>
                            </div>
                        </div>
                        
                        <!-- Animated Score -->
                        <div class="font-black text-4xl tabular-nums tracking-tighter drop-shadow-sm" 
                             :class="idx === 0 ? 'text-amber-500 scale-110 drop-shadow-md' : 'text-action-blue'">
                            {{ displayScores[player.id] || 0 }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- My Grid -->
        <div class="bg-panel-base border-[3px] border-white/50 rounded-3xl p-4 shadow-game-panel">
            <h3 class="text-sm font-black text-ink-main uppercase tracking-widest mb-3 text-center">🎯 Tu Desempeño</h3>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <div v-for="category in categories" :key="category" 
                        class="bg-panel-card border-b-[4px] rounded-xl p-3 shadow-inner bg-white/50"
                        :class="{
                            'border-action-primary': myAnswers[category] && getPlayerStatus(myUserId, category).state === 'VALID',
                            'border-action-error': getPlayerStatus(myUserId, category).state === 'REJECTED' || (!myAnswers[category] && getPlayerStatus(myUserId, category).state !== 'EMPTY'),
                            'border-white/50': !myAnswers[category] || getPlayerStatus(myUserId, category).state === 'EMPTY'
                        }"
                    >
                    <div class="text-[10px] uppercase font-black text-ink-soft mb-1 truncate tracking-wider">{{ category }}</div>
                    <div class="text-base font-black truncate leading-none" :class="{
                        'text-action-primary': myAnswers[category] && getPlayerStatus(myUserId, category).state === 'VALID',
                        'text-action-error line-through opacity-70': getPlayerStatus(myUserId, category).state === 'REJECTED',
                        'text-ink-main': (!myAnswers[category] || getPlayerStatus(myUserId, category).state === 'EMPTY') || (myAnswers[category] && getPlayerStatus(myUserId, category).state !== 'VALID' && getPlayerStatus(myUserId, category).state !== 'REJECTED')
                    }">{{ myAnswers[category] || '—' }}</div>
                    </div>
            </div>
        </div>
    </div>
</template>


