<script setup lang="ts">
import { ref, computed } from 'vue';
import VotingCard from './VotingCard.vue';
import TButton from '../../ui/TButton.vue';
import type { Player, CategoryRef } from '../../../../shared/types';

const props = defineProps<{
    categories: CategoryRef[];
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

// ─── Wizard Navigation ────────────────────────────────────────────────────────
const currentCategoryIndex = ref(0);
const activeCategory  = computed(() => props.categories[currentCategoryIndex.value]);
const isFirstCategory = computed(() => currentCategoryIndex.value === 0);
const isLastCategory  = computed(() => currentCategoryIndex.value === props.categories.length - 1);
const nextCategory = () => { if (!isLastCategory.value)  currentCategoryIndex.value++; };
const prevCategory = () => { if (!isFirstCategory.value) currentCategoryIndex.value--; };

// ─── Phase 1+2: Smart Grid — sin auto-rows-fr, escalable por conteo ───────────
const gridLayoutClass = computed(() => {
    const n = props.players.length;
    // Phase 7: ningún layout produce un jugador solo en su fila
    if (n <= 2)  return 'grid-cols-2 justify-items-center'; // 2 cols centradas y acotadas
    if (n === 3) return 'grid-cols-3';
    if (n === 4) return 'grid-cols-2 md:grid-cols-4';
    if (n <= 6)  return 'grid-cols-2 md:grid-cols-3';
    // 7-8 jugadores: 4 cols en PC (4+3 ó 4+4), 2 cols en móvil
    return 'grid-cols-2 md:grid-cols-4';
});

const gridMaxWidthClass = computed(() => {
    const n = props.players.length;
    if (n <= 2) return 'max-w-lg mx-auto';            // evitar tarjetas gigantes en duelo
    if (n === 3) return 'max-w-3xl mx-auto';
    return 'max-w-full';
});

// ─── Compact mode for 7-8 players ─────────────────────────────────────────────
const isCompact = computed(() => props.players.length >= 7);

// ─── Vote helpers ─────────────────────────────────────────────────────────────
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
    <div class="h-full flex flex-col w-full mx-auto px-2 md:px-6">

        <!-- Stop Alert -->
        <div v-if="showStopAlert && stopperPlayer"
             class="flex-none bg-red-500 border-4 border-red-300 rounded-3xl shadow-[0_4px_20px_rgba(239,68,68,0.4)] p-4 flex items-center justify-center gap-4 mb-4 mx-2">
            <div class="text-5xl animate-bounce drop-shadow-md">{{ stopperPlayer.avatar || '🛑' }}</div>
            <div class="flex flex-col items-center md:items-start text-center md:text-left gap-1">
                <h3 class="font-black text-white text-3xl md:text-4xl uppercase tracking-tighter drop-shadow-sm leading-none">¡BASTA PARA MÍ!</h3>
                <p class="text-red-100 text-xs font-black uppercase tracking-widest bg-red-900/40 px-3 py-1 rounded-full">Detenido por {{ stopperPlayer.name }}</p>
            </div>
        </div>

        <!-- Phase 6: CONTROL BAR — grid 3 cols para centrado limpio -->
        <div class="flex-none grid grid-cols-3 items-center bg-panel-card/40 border border-white/5 rounded-2xl px-4 md:px-6 py-2 my-2 backdrop-blur-sm">
            <div class="text-[10px] md:text-sm font-bold text-ink-muted uppercase tracking-widest">
                Fase {{ currentCategoryIndex + 1 }} / {{ categories.length }}
            </div>
            <h2 class="text-base md:text-2xl font-black text-action-primary uppercase tracking-[0.15em] drop-shadow-md text-center">
                {{ activeCategory?.name }}
            </h2>
            <div></div>
        </div>

        <!-- Phase 1+2: ARENA — Smart Grid sin auto-rows-fr -->
        <div class="flex-1 min-h-0 w-full overflow-y-auto" :class="gridMaxWidthClass">
            <div class="grid gap-2 md:gap-3 w-full px-1 transition-all duration-500 ease-in-out content-start"
                 :class="gridLayoutClass">
                <VotingCard
                    v-for="player in players" :key="player.id"
                    :player-name="player.name"
                    :player-avatar="player.avatar || ''"
                    :word="getReviewItem(player.id, activeCategory.name).answer"
                    :is-duplicate="getReviewItem(player.id, activeCategory.name).state === 'DUPLICATE'"
                    :is-auto-validated="isAutoValidated(player.id, activeCategory.name)"
                    :is-rejected="isRejected(player.id, activeCategory.name)"
                    :is-approved="isApproved(player.id, activeCategory.name)"
                    :vote-count="getVoteCount(player.id, activeCategory.name)"
                    :is-me="player.id === myUserId"
                    :self-status-icon="selfStatusIcon(player.id, activeCategory.name)"
                    :model-value="isApproved(player.id, activeCategory.name)"
                    :is-compact="isCompact"
                    @update:model-value="emit('vote', player.id, activeCategory.name)"
                />
            </div>
        </div>

        <!-- Phase 5: ACTION BAR — safe area + z-index -->
        <div class="flex-none pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0.5rem))] md:pb-3 flex justify-between items-center gap-3 z-30 relative">

            <!-- Atrás -->
            <TButton variant="secondary" size="md" :disabled="isFirstCategory" @click="prevCategory">
                ← Anterior
            </TButton>

            <!-- Phase 5: Dots — tamaño aumentado para mejor target -->
            <div class="flex gap-1.5 items-center">
                <div
                    v-for="(_, i) in categories" :key="i"
                    class="h-2.5 rounded-full transition-all duration-300 cursor-pointer"
                    :class="i === currentCategoryIndex ? 'bg-action-primary w-5' : 'bg-panel-input w-2.5'"
                    @click="currentCategoryIndex = i"
                />
            </div>

            <!-- Siguiente ó Enviar Votos -->
            <TButton v-if="!isLastCategory" variant="primary" size="md" @click="nextCategory">
                Siguiente →
            </TButton>
            <TButton v-else variant="primary" size="md" :disabled="hasConfirmed" @click="emit('submit-votes')">
                {{ hasConfirmed ? '¡Enviado! ✅' : '¡Completado!' }}
            </TButton>
        </div>
    </div>
</template>
