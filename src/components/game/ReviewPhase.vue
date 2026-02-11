<script setup lang="ts">
import VoteSwitch from './VoteSwitch.vue';
import type { Player } from '../../../shared/types';

const props = defineProps<{
    currentCategory: string;
    players: Player[];
    votes: Record<string, Record<string, string[]>>;
    myUserId: string;
    getReviewItem: (playerId: string) => { answer: string; state: string };
    navIndex: number;
    totalCategories: number;
    showStopAlert: boolean;
    stopperPlayer: Player | undefined;
}>();

const emit = defineEmits<{
    (e: 'vote', playerId: string): void;
    (e: 'next-cat'): void;
    (e: 'prev-cat'): void;
}>();

// "Innocent until proven guilty" — switch is ON (valid) by default
// Toggling OFF = casting a negative vote
const isApproved = (playerId: string) => {
    return !props.votes[playerId]?.[props.currentCategory]?.includes(props.myUserId);
};

const isAutoValidated = (playerId: string) => {
    return props.getReviewItem(playerId).state === 'VALID_AUTO';
};

const handleToggle = (playerId: string, _newValue: boolean) => {
    emit('vote', playerId);
    // Haptic on parent level too if needed
};

const getVoteCount = (playerId: string) => {
    return props.votes[playerId]?.[props.currentCategory]?.length || 0;
};

const isRejected = (playerId: string) => {
    const review = props.getReviewItem(playerId);
    return review.state === 'REJECTED' || getVoteCount(playerId) >= (props.players.length / 2);
};
</script>

<template>
    <div class="w-full max-w-2xl flex flex-col gap-6">
                            
        <!-- Stop Alert -->
        <div v-if="showStopAlert && stopperPlayer" class="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top duration-300">
            <div class="text-4xl animate-bounce">{{ stopperPlayer.avatar || '🛑' }}</div>
            <div>
                <h3 class="font-black text-red-100 text-xl uppercase italic">¡BASTA!</h3>
                <p class="text-red-200/60 text-xs font-bold uppercase tracking-wider">Detenido por {{ stopperPlayer.name }}</p>
            </div>
        </div>

        <!-- REVIEW -->
        <div class="text-center">
            <h3 class="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-4">Revisión en Progreso</h3>
            <div class="bg-indigo-900/40 backdrop-blur-xl rounded-3xl p-6 border border-white/5 shadow-2xl">
                <h2 class="text-3xl font-black text-white mb-6 drop-shadow-md">{{ currentCategory }}</h2>
                
                <!-- === PLAYER CARDS (Mobile + Desktop unified) === -->
                <div class="space-y-3">
                    <div v-for="player in players" :key="player.id" 
                        class="flex items-center justify-between p-3 rounded-xl transition-all duration-200"
                        :class="[
                            isAutoValidated(player.id)
                                ? 'bg-amber-500/10 border border-amber-500/20'
                                : isRejected(player.id)
                                    ? 'bg-red-500/5 border border-red-500/10'
                                    : 'bg-white/5 hover:bg-white/10 border border-transparent'
                        ]"
                    >
                        <!-- Left: Avatar + Name + Answer -->
                        <div class="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                            <span class="text-2xl shrink-0">{{ player.avatar || '👤' }}</span>
                            <div class="text-left overflow-hidden min-w-0">
                                <div class="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                                    :class="isAutoValidated(player.id) ? 'text-amber-400/60' : 'text-white/30'"
                                >
                                    {{ player.name }}
                                    <!-- Auto-validation badge -->
                                    <span v-if="isAutoValidated(player.id)" 
                                        class="inline-flex items-center gap-0.5 bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                                    >
                                        🛡️ Auto
                                    </span>
                                </div>
                                <div class="font-medium text-lg truncate transition-all duration-200"
                                    :class="[
                                        isAutoValidated(player.id)
                                            ? 'text-amber-300'
                                            : isRejected(player.id)
                                                ? 'line-through opacity-50 text-red-400'
                                                : getReviewItem(player.id).state === 'DUPLICATE'
                                                    ? 'text-yellow-400'
                                                    : 'text-white group-hover:text-yellow-300'
                                    ]"
                                >
                                    {{ getReviewItem(player.id).answer || '-' }}
                                </div>
                            </div>
                        </div>

                        <!-- Right: VoteSwitch or Self-status -->
                        <div class="shrink-0 ml-3 flex items-center gap-2">
                            <!-- Vote counter badge -->
                            <span v-if="getVoteCount(player.id) > 0 && !isAutoValidated(player.id)" 
                                class="bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded text-[10px] font-bold"
                            >
                                {{ getVoteCount(player.id) }}👎
                            </span>

                            <!-- VoteSwitch for OTHER players -->
                            <VoteSwitch 
                                v-if="player.id !== myUserId"
                                :model-value="isApproved(player.id)"
                                :is-auto-validated="isAutoValidated(player.id)"
                                :label="`Voto para ${player.name}`"
                                @update:model-value="handleToggle(player.id, $event)"
                            />

                            <!-- Self indicator -->
                            <div v-else class="text-xl w-14 text-center">
                                <span v-if="isAutoValidated(player.id)">🛡️</span>
                                <span v-else-if="getReviewItem(player.id).state === 'VALID'">✅</span>
                                <span v-else-if="getReviewItem(player.id).state === 'REJECTED'">❌</span>
                                <span v-else-if="getReviewItem(player.id).state === 'DUPLICATE'">⚠️</span>
                                <span v-else class="text-white/20">—</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Nav -->
                <div class="flex justify-center gap-6 mt-6 pt-4 border-t border-white/5">
                    <button @click="$emit('prev-cat')" :disabled="navIndex === 0" class="p-3 bg-white/5 rounded-full disabled:opacity-20 hover:bg-white/10 transition-colors">⬅️</button>
                    <span class="font-mono text-xl self-center text-yellow-400 font-bold">{{ navIndex + 1 }} / {{ totalCategories }}</span>
                    <button @click="$emit('next-cat')" :disabled="navIndex === totalCategories - 1" class="p-3 bg-white/5 rounded-full disabled:opacity-20 hover:bg-white/10 transition-colors">➡️</button>
                </div>
            </div>
        </div>
    </div>
</template>
