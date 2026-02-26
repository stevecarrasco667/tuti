<script setup lang="ts">
import VotingCard from './VotingCard.vue';
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


</script>

<template>
    <div class="w-full max-w-4xl pb-28 relative mx-auto">

        <!-- Stop Alert -->
        <div v-if="showStopAlert && stopperPlayer" class="bg-red-500 border-4 border-red-300 rounded-3xl shadow-[0_4px_20px_rgba(239,68,68,0.4)] p-4 flex items-center justify-center gap-4 mb-8 animate-in fade-in slide-in-from-top duration-300 mx-2">
            <div class="text-5xl animate-bounce drop-shadow-md">{{ stopperPlayer.avatar || '🛑' }}</div>
            <div class="flex flex-col items-center md:items-start text-center md:text-left gap-1">
                <h3 class="font-black text-white text-3xl md:text-4xl uppercase tracking-tighter drop-shadow-sm leading-none">¡BASTA PARA MÍ!</h3>
                <p class="text-red-100 text-xs font-black uppercase tracking-widest bg-red-900/40 px-3 py-1 rounded-full">Detenido por {{ stopperPlayer.name }}</p>
            </div>
        </div>

        <!-- VERTICAL FEED: LOOP POR CATEGORÍA -->
        <div v-for="category in categories" :key="category" class="mb-8">

            <!-- Sticky Category Header -->
            <div class="sticky top-0 z-10 px-2 py-2">
                <h2 class="bg-panel-base/90 backdrop-blur-xl py-3 px-5 rounded-2xl
                            text-sm md:text-base font-black uppercase tracking-widest text-ink-main
                            border-[3px] border-white shadow-game-panel mx-auto w-fit">
                    {{ category }}
                </h2>
            </div>

            <!-- Grid de Tarjetas Fluido por Jugador -->
            <div class="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6 w-full px-2 py-4 mb-8">
                <VotingCard 
                    v-for="player in players" :key="player.id"
                    :player-name="player.name"
                    :player-avatar="player.avatar || ''"
                    :word="getReviewItem(player.id, category).answer"
                    :is-duplicate="getReviewItem(player.id, category).state === 'DUPLICATE'"
                    :is-auto-validated="isAutoValidated(player.id, category)"
                    :is-rejected="isRejected(player.id, category)"
                    :is-approved="isApproved(player.id, category)"
                    :vote-count="getVoteCount(player.id, category)"
                    :is-me="player.id === myUserId"
                    :self-status-icon="selfStatusIcon(player.id, category)"
                    :model-value="isApproved(player.id, category)"
                    @update:model-value="emit('vote', player.id, category)"
                />
            </div>
        </div>

        <!-- STICKY FOOTER: ¡Terminé de Revisar! -->
        <div class="fixed bottom-0 left-0 w-full p-4 pb-safe z-40
                    bg-gradient-to-t from-panel-base via-panel-base/95 to-transparent
                    pointer-events-none">
            <button
                @click="emit('submit-votes')"
                :disabled="hasConfirmed"
                class="pointer-events-auto w-full max-w-[95%] sm:max-w-lg mx-auto block py-5 rounded-3xl font-black text-lg md:text-xl uppercase tracking-widest
                       transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]
                       border-[4px] shadow-game-btn"
                :class="hasConfirmed
                    ? 'bg-panel-input text-ink-muted border-white cursor-not-allowed shadow-none translate-y-1'
                    : 'bg-action-primary border-green-300 text-white'"
            >
                {{ hasConfirmed ? '¡ENVIADO! ✅' : '¡COMPLETADO!' }}
            </button>
        </div>
    </div>
</template>
