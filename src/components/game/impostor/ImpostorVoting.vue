<script setup lang="ts">
import { computed } from 'vue';
import type { ImpostorData, Player } from '../../../../shared/types';
import { useGame } from '../../../composables/useGame';
import { localImpostorRole } from '../../../composables/useGameState';
import { useSound } from '../../../composables/useSound';
import ReactionMenu from '../ReactionMenu.vue';
import ReactionBar from '../ReactionBar.vue';
import { useReactions } from '../../../composables/useReactions';
import { useSocket } from '../../../composables/useSocket';
import { EVENTS } from '../../../../shared/consts';

const props = defineProps<{
    impostorData: ImpostorData;
    players: Player[];
    myUserId: string;
    timeRemaining: number;
    timerColor: string;
}>();

const { toggleVote } = useGame();
const { playClick } = useSound();
const { getCountsForTarget, getBurstsForTarget } = useReactions();
const { socket } = useSocket();

const sendReaction = (targetPlayerId: string, categoryId: string, emoji: string) => {
    // NO predicción optimista: el servidor brodcastea de vuelta al emisor,
    // y useGameSync llama a registerReaction una única vez.
    socket.value?.send(JSON.stringify({
        type: EVENTS.WORD_REACT,
        payload: { targetPlayerId, categoryId, emoji }
    }));
    playClick();
};

const myVote = computed(() => props.impostorData.votes?.[props.myUserId] || null);
const isDead = computed(() => !props.impostorData.alivePlayers.includes(props.myUserId));
const isImpostor = computed(() => localImpostorRole.value?.role === 'impostor');
const secretWord = computed(() => localImpostorRole.value?.word ?? null);

const handleVote = (targetId: string) => {
    if (targetId === props.myUserId || isDead.value) return;
    toggleVote(targetId, "0");
    playClick();
};

const suspects = computed(() => {
    return props.players.filter(p => p.isConnected).map(player => {
        const hasVoted = props.impostorData.votes && props.impostorData.votes[player.id] !== undefined;
        const isSelectedByMe = myVote.value === player.id;
        const isMe = player.id === props.myUserId;
        const word = props.impostorData.words?.[player.id] || null;
        const isPlayerDead = !props.impostorData.alivePlayers.includes(player.id);
        const currentVotes = props.impostorData.voteCounts?.[player.id] || 0;
        return { ...player, hasVoted, isSelectedByMe, isMe, word, isPlayerDead, currentVotes };
    });
});

// Phase 1: Adaptive grid strategy by player count
const gridClass = computed(() => {
    const n = suspects.value.length;
    if (n <= 2) return 'grid-cols-2 max-w-lg mx-auto';
    if (n <= 4) return 'grid-cols-2 max-w-2xl mx-auto';
    if (n <= 6) return 'grid-cols-3 max-w-4xl mx-auto sm:grid-cols-3';
    return 'grid-cols-2 sm:grid-cols-4 max-w-5xl mx-auto'; // ≥7: compact mode
});

// Compact mode for ≥7 players
const isCompact = computed(() => suspects.value.length >= 7);

// Phase 6: Global voting progress
const votesCast = computed(() => Object.keys(props.impostorData.votes || {}).length);
const totalVoters = computed(() => suspects.value.filter(s => !s.isPlayerDead).length);
const votingProgress = computed(() =>
    totalVoters.value > 0 ? Math.round((votesCast.value / totalVoters.value) * 100) : 0
);
</script>

<template>
    <div class="h-full w-full flex flex-col overflow-hidden">

        <!-- HEADER -->
        <div class="flex-none px-4 pt-3 pb-2">
            <!-- Row: Timer + Title + (mobile: nothing) -->
            <div class="flex items-center justify-center relative mb-2">
                <!-- Timer (absolute left) -->
                <div class="absolute left-0 flex items-center justify-center min-w-[3rem] px-2 h-10 rounded-2xl border-2 border-white/10 bg-panel-card shadow-sm">
                    <span class="text-lg font-black font-mono transition-colors duration-300" :class="timerColor">
                        {{ Math.max(0, timeRemaining) }}
                    </span>
                </div>

                <!-- Title -->
                <div class="text-center">
                    <h2 class="text-xl md:text-2xl font-black text-ink-main tracking-widest uppercase drop-shadow-sm">
                        🔎 El Tribunal
                    </h2>
                    <!-- Only visible on desktop -->
                    <p class="hidden md:block text-ink-muted text-[11px] font-black uppercase tracking-widest bg-white/40 border border-white/50 px-3 py-0.5 rounded-full w-fit mx-auto mt-1">
                        Analiza las evidencias y acusa al impostor.
                    </p>
                </div>
            </div>

            <!-- Identity Banner — compact on mobile -->
            <div class="w-full transition-opacity duration-500" :class="{ 'opacity-50 grayscale pointer-events-none': isDead }">
                <div v-if="isImpostor"
                     class="bg-action-error/10 border-[2px] border-action-error/30 rounded-2xl px-4 py-2 backdrop-blur-md flex items-center gap-2 shadow-sm">
                    <span class="text-xl flex-none">⚠️</span>
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-action-error font-black text-xs uppercase tracking-widest">Impostor</span>
                        <span v-if="!isDead" class="text-ink-muted text-xs font-bold">·
                            Categoría: <strong class="text-action-error font-black">{{ impostorData.currentCategoryName }}</strong>
                        </span>
                    </div>
                </div>
                <div v-else
                     class="bg-tuti-teal/10 border-[2px] border-tuti-teal/30 rounded-2xl px-4 py-2 backdrop-blur-md flex items-center gap-2 shadow-sm">
                    <span class="text-xl flex-none">💡</span>
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-tuti-teal font-black text-xs uppercase tracking-widest">Tripulante</span>
                        <span v-if="!isDead" class="text-ink-muted text-xs font-bold">·
                            La palabra es: <strong class="text-tuti-teal font-black">{{ secretWord }}</strong>
                        </span>
                    </div>
                </div>
            </div>

            <!-- Phase 6: Voting Progress Bar -->
            <div class="mt-2 flex items-center gap-3">
                <div class="flex-1 h-1.5 bg-panel-input rounded-full overflow-hidden">
                    <div class="h-full bg-action-primary rounded-full transition-all duration-500"
                         :style="{ width: votingProgress + '%' }"></div>
                </div>
                <span class="text-[10px] font-black text-ink-muted uppercase tracking-widest whitespace-nowrap flex-none">
                    {{ votesCast }}/{{ totalVoters }} votaron
                </span>
            </div>

            <!-- Ghost banner -->
            <div v-if="isDead" class="mt-2 bg-panel-input/60 border-2 border-white/10 rounded-2xl px-4 py-2 flex items-center gap-2 shadow-inner">
                <span class="text-2xl">💀</span>
                <span class="text-ink-muted font-black text-xs uppercase tracking-widest">Eres un fantasma — observa en silencio.</span>
            </div>
        </div>

        <!-- SUSPECT CARDS GRID -->
        <div class="flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
            <div class="grid gap-3 w-full" :class="gridClass">

                <div v-for="s in suspects" :key="s.id"
                     class="relative bg-panel-card backdrop-blur-md border-[3px] rounded-2xl flex flex-col transition-all duration-300 shadow-sm"
                     :class="[
                         s.isSelectedByMe
                             ? 'border-action-primary bg-action-primary/5 shadow-[0_0_16px_rgba(46,204,113,0.25)]'
                             : 'border-white/10 hover:border-white/20',
                         s.isPlayerDead ? 'opacity-50 grayscale pointer-events-none' : ''
                     ]"
                >
                    <!-- Card body -->
                    <div class="p-3 flex flex-col gap-2 flex-1">

                        <!-- Row: Avatar + Name -->
                        <div class="flex items-center gap-2">
                            <!-- Avatar -->
                            <div class="flex-none rounded-full bg-panel-input flex items-center justify-center border-2 border-white/10 shadow-sm overflow-hidden"
                                 :class="isCompact ? 'w-8 h-8' : 'w-10 h-10 md:w-11 md:h-11'">
                                <img v-if="s.avatar && (s.avatar.startsWith('/') || s.avatar.startsWith('http'))"
                                     :src="s.avatar" class="w-full h-full object-cover rounded-full" />
                                <span v-else :class="isCompact ? 'text-lg' : 'text-xl md:text-2xl'">{{ s.avatar || '👤' }}</span>
                            </div>

                            <!-- Name -->
                            <div class="min-w-0 flex-1">
                                <span class="block font-black text-ink-main uppercase tracking-wide leading-tight truncate"
                                      :class="isCompact ? 'text-[10px]' : 'text-xs md:text-sm'"
                                      :title="s.name">
                                    {{ s.name }}
                                </span>
                                <!-- "YO" badge for self -->
                                <span v-if="s.isMe" class="text-[9px] font-black bg-white/20 text-ink-muted px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                                    YO
                                </span>
                            </div>

                            <!-- Status indicator: voted / thinking -->
                            <div class="flex-none ml-auto">
                                <svg v-if="!s.hasVoted && !s.isMe && !s.isPlayerDead"
                                     class="animate-spin h-3.5 w-3.5 text-ink-muted/50" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span v-else-if="s.hasVoted && !s.isMe && !s.isPlayerDead"
                                      class="text-action-primary font-black text-sm">✓</span>
                            </div>
                        </div>

                        <!-- Phase 2: WORD — Visual protagonist -->
                        <div class="relative w-full rounded-xl px-3 py-2 text-center transition-colors duration-300"
                             :class="s.word
                                 ? 'bg-tuti-teal/10 border border-tuti-teal/30'
                                 : 'bg-panel-input/60 border border-white/10 border-dashed'"
                        >
                            <span v-if="s.word"
                                  class="font-black text-tuti-teal break-all leading-tight"
                                  :class="isCompact ? 'text-sm' : 'text-base md:text-lg'">
                                {{ s.word }}
                            </span>
                            <span v-else class="text-ink-muted/60 font-bold italic"
                                  :class="isCompact ? 'text-[10px]' : 'text-xs'">
                                ⏳ Pensando...
                            </span>

                            <!-- Burst de animación de reacciones (posición fija en datos) -->
                            <div class="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                                <TransitionGroup name="burst">
                                    <span
                                        v-for="b in getBurstsForTarget(s.id, impostorData.currentCategoryName)"
                                        :key="b.id"
                                        class="absolute bottom-0 font-emoji"
                                        :class="isCompact ? 'text-2xl' : 'text-4xl'"
                                        :style="{ left: `${b.offsetX}%` }"
                                    >{{ b.emoji }}</span>
                                </TransitionGroup>
                            </div>
                        </div>

                        <!-- ReactionBar + Trigger inline bajo la palabra -->
                        <div class="flex items-center gap-1" v-if="!s.isMe && s.word && !s.isPlayerDead">
                            <ReactionBar
                                :counts="getCountsForTarget(s.id, impostorData.currentCategoryName)"
                                :is-compact="isCompact"
                                class="flex-1 min-w-0"
                            />
                            <ReactionMenu
                                :target-player-id="s.id"
                                :category-id="impostorData.currentCategoryName"
                                :is-compact="isCompact"
                                @react="(emoji, tid, cid) => sendReaction(tid, cid, emoji)"
                            />
                        </div>

                        <!-- Phase 3: ACUSAR button — guaranteed min size -->
                        <button @click="handleVote(s.id)"
                                :disabled="s.isMe || s.isPlayerDead || isDead"
                                class="flex items-center justify-between w-full min-h-[40px] rounded-full px-3 py-1.5 transition-all duration-300 border-2 active:scale-95"
                                :class="[
                                    s.isSelectedByMe
                                        ? 'bg-action-primary/20 border-action-primary shadow-[0_0_8px_rgba(46,204,113,0.3)]'
                                        : 'bg-panel-input border-white/10',
                                    (!s.isMe && !s.isPlayerDead && !isDead)
                                        ? 'cursor-pointer hover:border-white/30'
                                        : 'cursor-not-allowed opacity-60'
                                ]"
                        >
                            <span class="font-black tracking-widest uppercase text-left flex-shrink-0 mr-2"
                                  :class="[
                                      s.isSelectedByMe ? 'text-action-primary' : 'text-ink-soft',
                                      isCompact ? 'text-[9px]' : 'text-[11px] md:text-xs'
                                  ]">
                                Acusar
                            </span>

                            <!-- Toggle visual — flex-shrink-0 so it never compresses -->
                            <div class="relative flex-shrink-0 rounded-full border-2 transition-colors duration-300"
                                 :class="[
                                     isCompact ? 'w-8 h-4' : 'w-10 h-5 md:w-11 md:h-6',
                                     s.isSelectedByMe ? 'bg-action-primary border-transparent' : 'bg-panel-input border-panel-card shadow-inner',
                                     s.isMe ? 'opacity-40' : ''
                                 ]">
                                <div v-if="!s.isMe"
                                     class="absolute top-0.5 left-0.5 rounded-full bg-white shadow-sm transition-transform duration-300 border border-black/5"
                                     :class="[
                                         isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3 md:w-4 md:h-4',
                                         s.isSelectedByMe
                                             ? (isCompact ? 'translate-x-[14px]' : 'translate-x-[1.1rem] md:translate-x-5')
                                             : 'translate-x-0'
                                     ]">
                                </div>
                            </div>
                        </button>
                    </div>

                    <!-- Footer: vote count -->
                    <div class="bg-panel-input/60 flex justify-center items-center border-t-2 border-white/10"
                         :class="isCompact ? 'py-1 px-2' : 'py-1.5 px-3'">
                        <span class="text-action-warning mr-1 drop-shadow-sm" :class="isCompact ? 'text-xs' : 'text-sm'">🔥</span>
                        <span class="font-black text-ink-soft uppercase tracking-widest"
                              :class="isCompact ? 'text-[9px]' : 'text-[10px] md:text-xs'">
                            {{ s.currentVotes }} {{ s.currentVotes === 1 ? 'voto' : 'votos' }}
                        </span>
                    </div>

                    <!-- Dead overlay -->
                    <div v-if="s.isPlayerDead"
                         class="absolute inset-0 flex items-center justify-center pointer-events-none z-10 bg-panel-base/80 backdrop-blur-[1px] rounded-xl overflow-hidden">
                        <span class="text-5xl drop-shadow-md">💀</span>
                    </div>
                </div>

            </div>
        </div>
    </div>
</template>

<style scoped>
.font-emoji { font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif; }
.float-up-enter-active { transition: all 1.2s cubic-bezier(0.2, 0.8, 0.2, 1); }
.float-up-enter-from { opacity: 0; transform: translateY(20px) scale(0.5); }
.float-up-enter-to { opacity: 1; transform: translateY(-40px) scale(1.5); }
.float-up-leave-active { transition: all 0.5s ease-in; }
.float-up-leave-to { opacity: 0; transform: translateY(-60px) scale(0.8); }

@keyframes float-up {
    0% { transform: translateY(0) scale(0.8); opacity: 0; }
    20% { opacity: 1; transform: translateY(-20px) scale(1.2); }
    100% { transform: translateY(-80px) scale(1.5); opacity: 0; }
}
.animate-float-up {
    animation: float-up 2s ease-out forwards;
}
</style>
