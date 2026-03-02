<script setup lang="ts">
import { ref, computed } from 'vue';
import VotingCard from './VotingCard.vue';
import TButton from '../../ui/TButton.vue';
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

// ─── Wizard Navigation ───────────────────────────────────────────────────────
const currentCategoryIndex = ref(0);

const activeCategory   = computed(() => props.categories[currentCategoryIndex.value]);
const isFirstCategory  = computed(() => currentCategoryIndex.value === 0);
const isLastCategory   = computed(() => currentCategoryIndex.value === props.categories.length - 1);

const nextCategory = () => { if (!isLastCategory.value)  currentCategoryIndex.value++; };
const prevCategory = () => { if (!isFirstCategory.value) currentCategoryIndex.value--; };

// ─── Vote helpers (sin cambios) ───────────────────────────────────────────────
const isApproved = (playerId: string, category: string) =>
    !props.votes[playerId]?.[category]?.includes(props.myUserId);

const isAutoValidated = (playerId: string, category: string) =>
    props.getReviewItem(playerId, category).state === 'VALID_AUTO';

const getVoteCount = (playerId: string, category: string) =>
    props.votes[playerId]?.[category]?.length || 0;

const isRejected = (playerId: string, category: string) => {
    const review = props.getReviewItem(playerId, category);
    return review.state === 'REJECTED' || getVoteCount(playerId, category) >= (props.players.length / 2);
};

const selfStatusIcon = (playerId: string, category: string) => {
    const review = props.getReviewItem(playerId, category);
    if (review.state === 'VALID_AUTO') return '🛡️';
    if (review.state === 'VALID')      return '✅';
    if (review.state === 'REJECTED')   return '❌';
    if (review.state === 'DUPLICATE')  return '⚠️';
    return '—';
};
</script>

<template>
    <div class="h-full flex flex-col w-full max-w-4xl mx-auto px-2 pt-4">

        <!-- Stop Alert -->
        <div v-if="showStopAlert && stopperPlayer"
             class="flex-none bg-red-500 border-4 border-red-300 rounded-3xl shadow-[0_4px_20px_rgba(239,68,68,0.4)] p-4 flex items-center justify-center gap-4 mb-4 mx-2">
            <div class="text-5xl animate-bounce drop-shadow-md">{{ stopperPlayer.avatar || '🛑' }}</div>
            <div class="flex flex-col items-center md:items-start text-center md:text-left gap-1">
                <h3 class="font-black text-white text-3xl md:text-4xl uppercase tracking-tighter drop-shadow-sm leading-none">¡BASTA PARA MÍ!</h3>
                <p class="text-red-100 text-xs font-black uppercase tracking-widest bg-red-900/40 px-3 py-1 rounded-full">Detenido por {{ stopperPlayer.name }}</p>
            </div>
        </div>

        <!-- HEADER DE PROGRESO + CATEGORÍA ACTIVA -->
        <div class="flex-none text-center mb-4">
            <p class="text-xs font-black uppercase tracking-widest text-ink-muted mb-2">
                Categoría {{ currentCategoryIndex + 1 }} de {{ categories.length }}
            </p>
            <h2 class="bg-panel-card/90 backdrop-blur-xl py-3 px-6 rounded-2xl
                        text-lg md:text-xl font-black uppercase tracking-widest text-ink-main
                        border-[3px] border-white shadow-game-panel w-fit mx-auto">
                {{ activeCategory }}
            </h2>
        </div>

        <!-- ARENA: CSS Grid Fluido (Sprint 2.3 preservado) -->
        <div class="flex-1 overflow-y-auto">
            <div class="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6 w-full px-2 py-4">
                <VotingCard
                    v-for="player in players" :key="player.id"
                    :player-name="player.name"
                    :player-avatar="player.avatar || ''"
                    :word="getReviewItem(player.id, activeCategory).answer"
                    :is-duplicate="getReviewItem(player.id, activeCategory).state === 'DUPLICATE'"
                    :is-auto-validated="isAutoValidated(player.id, activeCategory)"
                    :is-rejected="isRejected(player.id, activeCategory)"
                    :is-approved="isApproved(player.id, activeCategory)"
                    :vote-count="getVoteCount(player.id, activeCategory)"
                    :is-me="player.id === myUserId"
                    :self-status-icon="selfStatusIcon(player.id, activeCategory)"
                    :model-value="isApproved(player.id, activeCategory)"
                    @update:model-value="emit('vote', player.id, activeCategory)"
                />
            </div>
        </div>

        <!-- ACTION BAR: Anterior / Dots / Siguiente + Enviar -->
        <div class="flex-none pt-5 pb-4 border-t border-white/20 flex justify-between items-center gap-3">

            <!-- Atrás -->
            <TButton
                variant="secondary"
                size="md"
                :disabled="isFirstCategory"
                @click="prevCategory"
            >
                ← Anterior
            </TButton>

            <!-- Dots de progreso -->
            <div class="flex gap-1.5">
                <div
                    v-for="(_, i) in categories" :key="i"
                    class="w-2 h-2 rounded-full transition-all duration-300"
                    :class="i === currentCategoryIndex ? 'bg-action-primary w-5' : 'bg-panel-input'"
                />
            </div>

            <!-- Siguiente ó Enviar Votos -->
            <TButton
                v-if="!isLastCategory"
                variant="primary"
                size="md"
                @click="nextCategory"
            >
                Siguiente →
            </TButton>
            <TButton
                v-else
                variant="primary"
                size="md"
                :disabled="hasConfirmed"
                @click="emit('submit-votes')"
            >
                {{ hasConfirmed ? '¡Enviado! ✅' : '¡Completado!' }}
            </TButton>

        </div>
    </div>
</template>
