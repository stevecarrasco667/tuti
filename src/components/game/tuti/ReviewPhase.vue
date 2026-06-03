<script setup lang="ts">
import { ref, computed } from 'vue';
import VotingCard from './VotingCard.vue';
import TButton from '../../ui/TButton.vue';
import { useGame } from '../../../composables/useGame';
import { useReactions } from '../../../composables/useReactions';
import type { Player, CategoryRef } from '../../../../shared/types';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
    categories: CategoryRef[];
    players: Player[];
    votes: Record<string, Record<string, string[]>>;
    myUserId: string;
    getReviewItem: (playerId: string, category: string) => { answer: string; state: string };
    showStopAlert: boolean;
    stopperPlayer: Player | undefined;
    hasConfirmed: boolean;
    isSpectator?: boolean;
    readyCount?: number;
    totalCount?: number;
}>();

const emit = defineEmits<{
    (e: 'vote', playerId: string, category: string): void;
    (e: 'submit-votes'): void;
}>();

const { sendReaction } = useGame();
const { getCountsForTarget, getBurstsForTarget } = useReactions();

// ─── Wizard Navigation ────────────────────────────────────────────────────────
const currentCategoryIndex = ref(0);
const activeCategory  = computed(() => props.categories[currentCategoryIndex.value]);
const isFirstCategory = computed(() => currentCategoryIndex.value === 0);
const isLastCategory  = computed(() => currentCategoryIndex.value === props.categories.length - 1);
const nextCategory = () => { if (!isLastCategory.value)  currentCategoryIndex.value++; };
const prevCategory = () => { if (!isFirstCategory.value) currentCategoryIndex.value--; };

// ─── Layout adaptativo por número de jugadores ────────────────────────────────
type CardSize = 'xl' | 'lg' | 'md' | 'sm';

const layoutConfig = computed(() => {
    const n = props.players.length;
    
    // Siempre en MODO FILA HORIZONTAL, variando tamaño por cantidad de jugadores
    return {
        gridClass:    'grid-cols-1 gap-2 md:gap-2.5',
        maxWidthClass: n <= 3 ? 'max-w-2xl mx-auto' : n <= 5 ? 'max-w-3xl mx-auto' : 'max-w-4xl mx-auto',
        cardSize:     (n <= 3 ? 'xl' : n <= 5 ? 'lg' : n <= 6 ? 'md' : 'sm') as CardSize,
        centerVertically: n <= 3,
        isHorizontal: true,
    };
});

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
    <div class="h-full flex flex-col w-full mx-auto px-2 md:px-6 relative group">

        <!-- Stop Alert -->
        <div v-if="showStopAlert && stopperPlayer"
             class="flex-none bg-action-error/20 backdrop-blur-xl border border-action-error shadow-glow-panic rounded-3xl p-3 flex items-center justify-center gap-4 mb-3 mx-2">
            <div class="text-4xl animate-bounce drop-shadow-md">{{ stopperPlayer.avatar || '🛑' }}</div>
            <div class="flex flex-col items-center md:items-start text-center md:text-left gap-0.5">
                <h3 class="font-black text-action-error text-2xl md:text-3xl uppercase tracking-tighter drop-shadow-glow leading-none">{{ t('review.stopAlert') }}</h3>
                <p class="text-white text-[10px] font-black uppercase tracking-widest bg-action-error/40 border border-action-error/50 px-2.5 py-0.5 rounded-full shadow-inner">{{ t('review.stoppedBy', { name: stopperPlayer.name }) }}</p>
            </div>
        </div>

        <!-- Barra de Categoría Ultra Compacta y Estilizada (Sin caja azul gigante) -->
        <div class="flex-none flex items-center justify-between py-1 my-1 px-2 select-none">
            <div class="text-[9px] md:text-xs font-bold text-ink-muted uppercase tracking-widest">
                {{ t('review.phase') }} {{ currentCategoryIndex + 1 }} / {{ categories.length }}
            </div>
            <h2 class="text-base md:text-xl font-black text-action-primary uppercase tracking-[0.18em] drop-shadow-glow text-center">
                {{ activeCategory?.name }}
            </h2>
            <!-- Spacer para centrado simétrico -->
            <div class="text-[9px] md:text-xs font-bold text-ink-muted uppercase tracking-widest invisible">
                {{ t('review.phase') }} {{ currentCategoryIndex + 1 }} / {{ categories.length }}
            </div>
        </div>

        <!-- ARENA — Adaptive Row List por número de jugadores (Siempre Fila) -->
        <div class="flex-1 min-h-0 w-full overflow-y-auto flex flex-col px-1 pb-2" :class="layoutConfig.maxWidthClass">
            <div class="grid w-full transition-all duration-500 ease-in-out"
                 :class="[layoutConfig.gridClass, layoutConfig.centerVertically ? 'my-auto pb-4' : 'content-start']">
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
                    :card-size="layoutConfig.cardSize"
                    :player-id="player.id"
                    :category-id="activeCategory.name"
                    :reaction-counts="getCountsForTarget(player.id, activeCategory.name)"
                    :reaction-bursts="getBurstsForTarget(player.id, activeCategory.name)"
                    :is-spectator="isSpectator"
                    @update:model-value="emit('vote', player.id, activeCategory.name)"
                    @react="(emoji: string, targetId: string, catId: string) => sendReaction(targetId, catId, emoji)"
                />
            </div>
        </div>

        <!-- Phase 5: ACTION BAR — safe area + z-index compactado visible siempre -->
        <div class="flex-none pt-1.5 pb-[max(0.35rem,env(safe-area-inset-bottom,0.35rem))] md:pb-2.5 flex justify-between items-center gap-3 z-30 relative">

            <!-- Atrás -->
            <TButton variant="secondary" size="sm" :disabled="isFirstCategory" @click="prevCategory" class="shrink-0">
                {{ t('review.prev') }}
            </TButton>

            <!-- Dots compactos -->
            <div class="flex gap-1 items-center">
                <div
                    v-for="(_, i) in categories" :key="i"
                    class="h-1.5 rounded-full transition-all duration-300 cursor-pointer"
                    :class="i === currentCategoryIndex ? 'bg-game-yellow w-4.5' : 'bg-panel-input w-1.5'"
                    @click="currentCategoryIndex = i"
                />
            </div>

            <!-- Siguiente ó Enviar Votos -->
            <TButton v-if="!isLastCategory" variant="primary" size="sm" @click="nextCategory" class="shrink-0">
                {{ t('review.next') }}
            </TButton>
            <TButton v-else variant="primary" size="sm" :disabled="hasConfirmed || isSpectator" @click="!isSpectator && emit('submit-votes')" class="shrink-0">
                {{ isSpectator ? t('review.viewing') : (hasConfirmed ? t('review.sentCount', { ready: readyCount || 0, total: totalCount || 0 }) : t('review.completed')) }}
            </TButton>
        </div>
    </div>
</template>
