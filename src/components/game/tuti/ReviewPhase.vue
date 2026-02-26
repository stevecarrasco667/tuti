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

            <!-- Grid de Tarjetas por Jugador -->
            <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 mt-4 px-2">
                <div v-for="player in players" :key="player.id"
                    class="rounded-3xl border-4 p-4 flex flex-col gap-3 transition-all duration-200"
                    :class="[
                        isAutoValidated(player.id, category) 
                            ? 'bg-amber-100 border-amber-300 shadow-[0_4px_12px_rgba(251,191,36,0.3)]' 
                            : isRejected(player.id, category) 
                                ? 'bg-red-50 border-red-200 shadow-sm opacity-80' 
                                : !isApproved(player.id, category)
                                    ? 'bg-red-50 border-red-300 shadow-sm'
                                    : 'bg-panel-card border-white shadow-sm hover:shadow-md'
                    ]"
                >
                    <!-- Avatar + Nombre (pequeño, arriba) -->
                    <div class="flex items-center gap-2 bg-white/60 p-1.5 pr-3 rounded-full border-2 border-white shadow-sm w-fit max-w-full">
                        <span class="text-xl shrink-0 leading-none">{{ player.avatar || '👤' }}</span>
                        <div class="flex items-center gap-1.5 min-w-0 overflow-hidden">
                            <span class="text-[10px] font-black uppercase tracking-widest truncate"
                                :class="isAutoValidated(player.id, category) ? 'text-amber-600' : 'text-ink-soft'">
                                {{ player.name }}
                            </span>
                            <span v-if="isAutoValidated(player.id, category)"
                                class="inline-flex items-center justify-center shrink-0">
                                🛡️
                            </span>
                        </div>
                    </div>

                    <!-- Palabra Escrita (grande, centro) -->
                    <p class="text-lg md:text-xl font-black text-center py-2 min-h-[40px] transition-all duration-200 break-words leading-tight"
                        :class="[
                            isAutoValidated(player.id, category)
                                ? 'text-amber-700'
                                : isRejected(player.id, category) || !isApproved(player.id, category)
                                    ? 'line-through opacity-40 text-red-600'
                                    : getReviewItem(player.id, category).state === 'DUPLICATE'
                                        ? 'text-action-warning'
                                        : 'text-action-blue'
                        ]">
                        {{ getReviewItem(player.id, category).answer || '—' }}
                    </p>

                    <!-- Vote Counter Badge + VoteSwitch / Self Indicator -->
                    <div class="flex items-center justify-between mt-auto pt-3 border-t-2 border-white/50 relative">
                        <!-- Vote Counter -->
                        <span v-if="getVoteCount(player.id, category) > 0 && !isAutoValidated(player.id, category)"
                            class="absolute -top-3 left-1/2 -translate-x-1/2 bg-action-warning text-ink-main border-2 border-white px-2 py-0.5 rounded-full text-[10px] font-black shadow-sm z-10 whitespace-nowrap">
                            {{ getVoteCount(player.id, category) }} 👎
                        </span>
                        
                        <div class="w-full flex justify-center h-10">
                            <!-- VoteSwitch for OTHER players -->
                            <VoteSwitch
                                v-if="player.id !== myUserId"
                                :model-value="isApproved(player.id, category)"
                                :is-auto-validated="isAutoValidated(player.id, category)"
                                :label="`Voto ${player.name}`"
                                @update:model-value="emit('vote', player.id, category)"
                            />
                            <!-- Self indicator -->
                            <span v-else class="text-2xl drop-shadow-sm flex items-center justify-center bg-white/80 w-11 h-11 rounded-full border-2 border-panel-card">{{ selfStatusIcon(player.id, category) }}</span>
                        </div>
                    </div>
                </div>
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
