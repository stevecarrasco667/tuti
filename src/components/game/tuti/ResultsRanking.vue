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
    <div class="w-full max-w-lg">
        <!-- Ranking List -->
        <div class="mb-6">
            <h3 class="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2 px-1">Posiciones Finales</h3>
            <div class="space-y-3">
                <div v-for="(player, idx) in players" :key="player.id"
                     class="relative overflow-hidden rounded-2xl bg-black/40 border border-white/5 p-3 flex flex-col justify-center"
                >
                    <!-- PROGRESS BAR BACKGROUND -->
                    <div class="absolute inset-0 bg-gray-800/30 z-0"></div>
                    
                    <!-- ANIMATED PROGRESS BAR -->
                    <div class="absolute top-0 bottom-0 left-0 bg-gradient-to-r transition-all duration-1000 ease-out z-0"
                         :class="idx === 0 ? 'from-yellow-600/40 to-yellow-400/40' : 'from-indigo-600/40 to-indigo-400/40'"
                         :style="{ width: (barWidths[player.id] || 0) + '%' }"
                    ></div>

                    <!-- CONTENT ON TOP -->
                    <div class="relative z-10 flex items-center justify-between pl-2 pr-2">
                        <div class="flex items-center gap-3">
                             <!-- Rank Badge -->
                            <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md" 
                                 :class="idx === 0 ? 'bg-yellow-400 text-black scale-110' : 'bg-white/10 text-white/50'">
                                 <span v-if="idx === 0">👑</span>
                                 <span v-else>{{ idx + 1 }}</span>
                            </div>
                            
                            <!-- Avatar & Name -->
                            <span class="text-2xl drop-shadow-md">{{ player.avatar }}</span>
                            <span class="font-bold text-lg text-white drop-shadow-sm truncate max-w-[140px]">{{ player.name }}</span>
                        </div>
                        
                        <!-- Animated Score -->
                        <div class="font-black text-3xl font-mono tabular-nums tracking-tight drop-shadow-lg" 
                             :class="idx === 0 ? 'text-yellow-400 scale-110' : 'text-indigo-200'">
                            {{ displayScores[player.id] || 0 }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- My Grid -->
        <h3 class="text-xs font-bold text-white/30 uppercase tracking-widest mb-2 px-1">Tu Desempeño</h3>
        <div class="grid grid-cols-2 gap-2">
                <div v-for="category in categories" :key="category" 
                    class="bg-black/20 border-b-2 rounded-t-lg p-2"
                    :class="{
                        'border-green-500': myAnswers[category] && getPlayerStatus(myUserId, category).state === 'VALID',
                        'border-red-500': getPlayerStatus(myUserId, category).state === 'REJECTED',
                        'border-white/10': !myAnswers[category] || getPlayerStatus(myUserId, category).state === 'EMPTY'
                    }"
                >
                <div class="text-[9px] uppercase font-bold text-white/30 mb-0.5 truncate">{{ category }}</div>
                <div class="text-sm font-medium text-white truncate">{{ myAnswers[category] || '-' }}</div>
                </div>
        </div>
    </div>
</template>


