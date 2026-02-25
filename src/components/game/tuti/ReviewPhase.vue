<script setup lang="ts">
import VoteSwitch from './VoteSwitch.vue';
import type { Player } from '../../../../shared/types';

const props = defineProps<{
    categories: string[];
    players: Player[];
    votes: Record<string, Record<string, string[]>>;
    myUserId: string;
    getReviewItem: (playerId: string, category: string) => { answer: string; state: string };
    showStopAlert: boolean;
    stopperPlayer: Player | undefined;
    hasConfirmed: boolean;
}>();

const emit = defineEmits<{
    (e: 'vote', playerId: string, category: string): void;
    (e: 'submit-votes'): void;
}>();

// "Innocent until proven guilty" — switch is ON (valid) by default
// Toggling OFF = casting a negative vote
const isApproved = (playerId: string, category: string) => {
    return !props.votes[playerId]?.[category]?.includes(props.myUserId);
};

const isAutoValidated = (playerId: string, category: string) => {
    return props.getReviewItem(playerId, category).state === 'VALID_AUTO';
};

const getVoteCount = (playerId: string, category: string) => {
    return props.votes[playerId]?.[category]?.length || 0;
};

const isRejected = (playerId: string, category: string) => {
    const review = props.getReviewItem(playerId, category);
    return review.state === 'REJECTED' || getVoteCount(playerId, category) >= (props.players.length / 2);
};

const selfStatusIcon = (playerId: string, category: string) => {
    const review = props.getReviewItem(playerId, category);
    if (review.state === 'VALID_AUTO') return '🛡️';
    if (review.state === 'VALID') return '✅';
    if (review.state === 'REJECTED') return '❌';
    if (review.state === 'DUPLICATE') return '⚠️';
    return '—';
};

const cardClasses = (playerId: string, category: string) => {
    if (isAutoValidated(playerId, category)) return 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]';
    if (isRejected(playerId, category)) return 'bg-red-500/5 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]';
    if (!isApproved(playerId, category)) return 'bg-red-500/5 border-red-500/30';
    return 'bg-white/5 border-white/10 hover:bg-white/10';
};
</script>

<template>
    <div class="w-full max-w-4xl pb-28 relative">

        <!-- Stop Alert -->
        <div v-if="showStopAlert && stopperPlayer" class="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-4 mb-6 animate-in fade-in slide-in-from-top duration-300">
            <div class="text-4xl animate-bounce">{{ stopperPlayer.avatar || '🛑' }}</div>
            <div>
                <h3 class="font-black text-red-100 text-xl uppercase italic">¡BASTA!</h3>
                <p class="text-red-200/60 text-xs font-bold uppercase tracking-wider">Detenido por {{ stopperPlayer.name }}</p>
            </div>
        </div>

        <!-- VERTICAL FEED: LOOP POR CATEGORÍA -->
        <div v-for="category in categories" :key="category" class="mb-6">

            <!-- Sticky Category Header -->
            <h2 class="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-md py-3 px-4 -mx-2 rounded-lg
                        text-lg font-black uppercase tracking-widest text-indigo-300
                        border-b border-indigo-500/20 shadow-lg shadow-black/30">
                {{ category }}
            </h2>

            <!-- Grid de Tarjetas por Jugador -->
            <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mt-4 px-1">
                <div v-for="player in players" :key="player.id"
                    class="rounded-xl border p-3 flex flex-col gap-2 transition-all duration-200"
                    :class="cardClasses(player.id, category)"
                >
                    <!-- Avatar + Nombre (pequeño, arriba) -->
                    <div class="flex items-center gap-2">
                        <span class="text-xl shrink-0">{{ player.avatar || '👤' }}</span>
                        <div class="flex items-center gap-1.5 min-w-0 overflow-hidden">
                            <span class="text-[10px] font-bold uppercase tracking-wider truncate"
                                :class="isAutoValidated(player.id, category) ? 'text-amber-400/80' : 'text-white/40'">
                                {{ player.name }}
                            </span>
                            <span v-if="isAutoValidated(player.id, category)"
                                class="inline-flex items-center gap-0.5 bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded-full text-[8px] font-bold shrink-0">
                                🛡️
                            </span>
                        </div>
                    </div>

                    <!-- Palabra Escrita (grande, centro) -->
                    <p class="text-base font-black text-center py-1 min-h-[28px] transition-all duration-200"
                        :class="[
                            isAutoValidated(player.id, category)
                                ? 'text-amber-300'
                                : isRejected(player.id, category) || !isApproved(player.id, category)
                                    ? 'line-through opacity-50 text-red-400'
                                    : getReviewItem(player.id, category).state === 'DUPLICATE'
                                        ? 'text-yellow-400'
                                        : 'text-white'
                        ]">
                        {{ getReviewItem(player.id, category).answer || '—' }}
                    </p>

                    <!-- Vote Counter Badge + VoteSwitch / Self Indicator -->
                    <div class="flex items-center justify-between mt-auto pt-1 border-t border-white/5">
                        <!-- Vote Counter -->
                        <span v-if="getVoteCount(player.id, category) > 0 && !isAutoValidated(player.id, category)"
                            class="bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            {{ getVoteCount(player.id, category) }}👎
                        </span>
                        <span v-else></span>

                        <!-- VoteSwitch for OTHER players -->
                        <VoteSwitch
                            v-if="player.id !== myUserId"
                            :model-value="isApproved(player.id, category)"
                            :is-auto-validated="isAutoValidated(player.id, category)"
                            :label="`Voto ${player.name}`"
                            @update:model-value="emit('vote', player.id, category)"
                        />

                        <!-- Self indicator -->
                        <span v-else class="text-xl">{{ selfStatusIcon(player.id, category) }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- STICKY FOOTER: ¡Terminé de Revisar! -->
        <div class="fixed bottom-0 left-0 w-full p-4 pb-6 z-20
                    bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent
                    pointer-events-none">
            <button
                @click="emit('submit-votes')"
                :disabled="hasConfirmed"
                class="pointer-events-auto w-full max-w-lg mx-auto block py-4 rounded-2xl font-black text-lg uppercase tracking-widest
                       transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]
                       border border-white/20"
                :class="hasConfirmed
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-emerald-500 to-green-400 text-white shadow-[0_0_30px_rgba(52,211,153,0.4)]'"
            >
                {{ hasConfirmed ? 'Enviado ✅' : '¡Terminé de Revisar!' }}
            </button>
        </div>
    </div>
</template>
