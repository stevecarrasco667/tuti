<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import type { ImpostorData, Player } from '../../../../shared/types';
import { useGame } from '../../../composables/useGame';
import { useSound } from '../../../composables/useSound';
import ReactionMenu from '../ReactionMenu.vue';
import ReactionBar from '../ReactionBar.vue';
import { useReactions } from '../../../composables/useReactions';
import { useSocket } from '../../../composables/useSocket';
import { EVENTS } from '../../../../shared/consts';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
    impostorData: ImpostorData;
    players: Player[];
    myUserId: string;
    timeRemaining: number;
    timerColor: string;
    isSpectator?: boolean;
}>();

const { toggleVote, localImpostorRole } = useGame();
const { playClick } = useSound();
const { getCountsForTarget, getBurstsForTarget } = useReactions();
const { socket } = useSocket();
const { t } = useI18n();

// Detección reactiva de pantalla móvil (sm breakpoint = 640px) optimizada por hardware
const isMobile = ref(false);
let mediaQuery: MediaQueryList | null = null;

const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
    isMobile.value = e.matches;
};

onMounted(() => {
    mediaQuery = window.matchMedia('(max-width: 639px)');
    handleMediaChange(mediaQuery);
    if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleMediaChange);
    } else {
        mediaQuery.addListener(handleMediaChange);
    }
});

onUnmounted(() => {
    if (mediaQuery) {
        if (mediaQuery.removeEventListener) {
            mediaQuery.removeEventListener('change', handleMediaChange);
        } else {
            mediaQuery.removeListener(handleMediaChange);
        }
    }
});

const sendReaction = (targetPlayerId: string, categoryId: string, emoji: string) => {
    // NO predicción optimista: el servidor brodcastea de vuelta al emisor,
    // y useGameSync llama a registerReaction una única vez.
    socket.value?.send(JSON.stringify({
        type: EVENTS.WORD_REACT,
        payload: { targetPlayerId, categoryId, emoji }
    }));
};

const myVote = computed(() => props.impostorData.votes?.[props.myUserId] || null);
const isDead = computed(() => !props.impostorData.alivePlayers.includes(props.myUserId));
const isImpostor = computed(() => localImpostorRole.value?.role === 'impostor');
const secretWord = computed(() => localImpostorRole.value?.word ?? null);

const handleVote = (targetId: string) => {
    if (targetId === props.myUserId || isDead.value) return;
    if (navigator.vibrate) navigator.vibrate(20);
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
    if (n <= 2) return 'grid-cols-2 max-w-2xl mx-auto gap-4 md:gap-6';
    if (n === 3) return 'grid-cols-2 sm:grid-cols-3 max-w-4xl mx-auto gap-3 md:gap-6';
    if (n === 4) return 'grid-cols-2 max-w-2xl mx-auto gap-3 md:gap-6';
    if (n <= 6) return 'grid-cols-2 sm:grid-cols-3 max-w-5xl mx-auto gap-3 md:gap-4';
    return 'grid-cols-2 sm:grid-cols-4 max-w-5xl mx-auto gap-3'; // ≥7: compact mode
});

// Card sizing calculation based on suspects count
const cardSize = computed(() => {
    if (isMobile.value) {
        // En móviles evitamos 'lg' porque es muy grande y se desborda en 2 columnas
        const n = suspects.value.length;
        return n <= 3 ? 'md' : 'sm';
    }
    const n = suspects.value.length;
    if (n <= 3) return 'lg';
    return 'sm';
});

// Dynamic configuration for padding, sizing, font and transitions
const cardConfig = computed(() => {
    const size = cardSize.value;
    if (size === 'lg') {
        return {
            bodyPadding: 'p-5 md:p-6 gap-3',
            footerPadding: 'py-2.5 px-4',
            avatarContainer: 'w-12 h-12 text-2xl',
            avatarText: 'text-xl md:text-2xl',
            nameClass: 'text-xs md:text-sm',
            wordContainer: 'py-3 md:py-6',
            wordClass: 'text-2xl md:text-[2rem]',
            thinkingClass: 'text-sm md:text-base',
            buttonClass: 'py-2.5 md:py-3 border-[3px] rounded-[1rem] md:rounded-full',
            buttonText: 'text-base md:text-lg',
            footerText: 'text-[10px] md:text-xs',
            reactionsCompact: false
        };
    } else if (size === 'md') {
        return {
            bodyPadding: 'p-4 gap-2.5',
            footerPadding: 'py-2 px-3',
            avatarContainer: 'w-10 h-10 text-xl',
            avatarText: 'text-base md:text-xl',
            nameClass: 'text-[11px] md:text-xs',
            wordContainer: 'py-2 md:py-4',
            wordClass: 'text-lg md:text-2xl',
            thinkingClass: 'text-xs md:text-sm',
            buttonClass: 'py-2 md:py-2.5 border-[2.5px] rounded-[0.8rem] md:rounded-full',
            buttonText: 'text-sm md:text-base',
            footerText: 'text-[9px] md:text-[10px]',
            reactionsCompact: true
        };
    } else { // 'sm'
        return {
            bodyPadding: 'p-2.5 md:p-3 gap-1.5',
            footerPadding: 'py-1.5 px-2',
            avatarContainer: 'w-8 h-8 text-lg',
            avatarText: 'text-sm md:text-lg',
            nameClass: 'text-[9px] md:text-[10px]',
            wordContainer: 'py-1.5 md:py-3',
            wordClass: 'text-base md:text-xl',
            thinkingClass: 'text-[10px] md:text-xs',
            buttonClass: 'py-1.5 md:py-2 border-[2px] rounded-[0.6rem] md:rounded-full',
            buttonText: 'text-xs md:text-sm',
            footerText: 'text-[8px] md:text-[9px]',
            reactionsCompact: true
        };
    }
});

// Phase 6: Global voting progress
const votesCast = computed(() => Object.keys(props.impostorData.votes || {}).length);
const totalVoters = computed(() => suspects.value.filter(s => !s.isPlayerDead).length);
</script>

<template>
    <div class="h-full w-full flex flex-col overflow-hidden">

        <!-- HEADER UNIFICADO HORIZONTAL -->
        <div class="flex-none bg-panel-card/50 backdrop-blur-sm border-b border-white/5 px-3 py-2 md:py-2.5 mb-2 shadow-sm relative z-10 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
            
            <!-- Izquierda (Móvil Fila 1) / Izquierda (Desktop): Título + Reloj Móvil -->
            <div class="flex items-center justify-between w-full md:w-auto md:justify-start pl-10 md:pl-12">
                <div class="flex items-center gap-1.5 md:gap-2">
                    <h2 class="text-base md:text-xl font-black text-ink-main tracking-widest uppercase drop-shadow-sm whitespace-nowrap">
                        {{ t('impostorVoting.title') }}
                    </h2>
                </div>
                <!-- Reloj (Sólo Móvil) -->
                <div class="flex md:hidden items-center gap-2">
                    <span class="text-[9px] font-black text-ink-muted uppercase tracking-widest whitespace-nowrap">
                        {{ votesCast }}/{{ totalVoters }} {{ t('impostorVoting.votes').toUpperCase() }}
                    </span>
                    <div class="flex items-center justify-center min-w-[2.25rem] px-1.5 h-7 rounded-xl border-2 border-white/10 bg-panel-input shadow-sm">
                        <span class="text-sm font-black font-mono transition-colors duration-300 leading-none" :class="timerColor">
                            {{ Math.max(0, timeRemaining) }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Centro: Identity Banner (Móvil Fila 2) -->
            <div v-if="!isSpectator" class="flex-1 flex justify-center w-full min-w-0 transition-opacity duration-500" :class="{ 'opacity-60 grayscale': isDead }">
                <div v-if="isImpostor"
                     class="w-full md:w-fit md:max-w-full bg-action-error/10 border-[1.5px] border-action-error/30 rounded-full px-4 py-1.5 flex items-center justify-center gap-1.5 shadow-inner overflow-hidden">
                    <span class="text-sm md:text-base flex-none">{{ isDead ? '💀' : '⚠️' }}</span>
                    <span class="text-action-error font-black text-[9px] md:text-xs uppercase tracking-widest truncate">{{ t('impostorVoting.impostor') }}</span>
                    <span class="text-ink-muted text-[9px] md:text-xs font-bold truncate mx-1">· {{ t('impostorTyping.categoryLabel') }} <strong class="text-action-error font-black">{{ t(`categories.${impostorData.currentCategoryId}`, impostorData.currentCategoryName) }}</strong></span>
                </div>
                <div v-else
                     class="w-full md:w-fit md:max-w-full bg-tuti-teal/10 border-[1.5px] border-tuti-teal/30 rounded-full px-4 py-1.5 flex items-center justify-center gap-1.5 shadow-inner overflow-hidden">
                    <span class="text-sm md:text-base flex-none">{{ isDead ? '💀' : '💡' }}</span>
                    <span class="text-tuti-teal font-black text-[9px] md:text-xs uppercase tracking-widest truncate">{{ t('impostorVoting.crew') }}</span>
                    <span class="text-ink-muted text-[9px] md:text-xs font-bold truncate mx-1">· {{ t('impostorTyping.wordIs') }} <strong class="text-tuti-teal font-black break-all">{{ secretWord }}</strong></span>
                </div>
            </div>
            <!-- Espectador -->
            <div v-else class="flex-1 flex justify-center w-full min-w-0">
                <div class="w-full md:w-fit md:max-w-full bg-panel-input/60 border border-white/10 rounded-full px-4 py-1.5 flex items-center justify-center gap-1.5 shadow-inner">
                    <span class="text-sm animate-pulse">👀</span>
                    <span class="text-action-primary font-black text-[10px] md:text-xs uppercase tracking-widest truncate">{{ t('impostorVoting.spectating') }}</span>
                </div>
            </div>

            <!-- Derecha (Sólo Desktop): Votos + Reloj -->
            <div class="hidden md:flex items-center gap-3 w-auto justify-end">
                <span class="text-[10px] md:text-xs font-black text-ink-muted uppercase tracking-widest whitespace-nowrap">
                    {{ votesCast }}/{{ totalVoters }} {{ t('impostorVoting.votes').toUpperCase() }}
                </span>
                <div class="flex items-center justify-center min-w-[2.5rem] px-2 h-8 rounded-xl border-2 border-white/10 bg-panel-input shadow-sm">
                    <span class="text-base font-black font-mono transition-colors duration-300 leading-none" :class="timerColor">
                        {{ Math.max(0, timeRemaining) }}
                    </span>
                </div>
            </div>
        </div>

        <!-- SUSPECT CARDS GRID -->
        <div class="flex-1 overflow-y-auto px-3 pb-6 md:pb-12 scrollbar-thin">
            <div class="grid w-full" :class="gridClass">

                <div v-for="s in suspects" :key="s.id"
                     class="relative bg-panel-card backdrop-blur-md border-[2.5px] rounded-3xl flex flex-col transition-all duration-300 shadow-sm hover:scale-[1.01]"
                     :class="[
                         s.isPlayerDead ? 'opacity-50 grayscale pointer-events-none' : '',
                         s.isSelectedByMe
                             ? 'border-action-primary bg-action-primary/10 shadow-[0_0_20px_rgba(251,191,36,0.25)]'
                             : (s.currentVotes >= 3
                                 ? 'border-action-error/60 shadow-[0_0_20px_rgba(251,113,133,0.35)] animate-glow-panic'
                                 : (s.currentVotes > 0
                                     ? 'border-action-error/30 shadow-[0_0_12px_rgba(251,113,133,0.15)] bg-action-error/5'
                                     : 'border-white/10 hover:border-white/20'
                                 )
                             )
                     ]"
                >
                    <!-- Card body -->
                    <div class="flex flex-col flex-1" :class="cardConfig.bodyPadding">

                        <!-- Row: Avatar + Name -->
                        <div class="flex items-center gap-2">
                            <!-- Avatar -->
                            <div class="flex-none rounded-full bg-panel-input flex items-center justify-center border-2 border-white/10 shadow-sm overflow-hidden"
                                 :class="cardConfig.avatarContainer">
                                <img v-if="s.avatar && (s.avatar.startsWith('/') || s.avatar.startsWith('http'))"
                                     :src="s.avatar" class="w-full h-full object-cover rounded-full" />
                                <span v-else :class="cardConfig.avatarText">{{ s.avatar || '👤' }}</span>
                            </div>

                            <!-- Name -->
                            <div class="min-w-0 flex-1">
                                <span class="block font-black text-ink-main uppercase tracking-wide leading-tight truncate"
                                      :class="cardConfig.nameClass"
                                      :title="s.name">
                                    {{ s.name }}
                                </span>
                                <!-- "YO" badge for self -->
                                <span v-if="s.isMe" class="text-[9px] font-black bg-white/20 text-ink-muted px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                                    {{ t('impostorVoting.me') }}
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
                                      class="text-action-primary font-black text-sm drop-shadow-[0_0_4px_rgba(251,191,36,0.3)]">✓</span>
                            </div>
                        </div>

                        <!-- WORD — Visual protagonist -->
                        <div class="relative w-full flex-1 flex flex-col items-center justify-center text-center transition-all duration-300"
                             :class="[!s.word ? 'animate-pulse' : '', cardConfig.wordContainer]"
                        >
                            <span v-if="s.word"
                                  class="font-black text-tuti-teal break-words leading-none drop-shadow-md w-full"
                                  :class="cardConfig.wordClass">
                                {{ s.word }}
                            </span>
                            <div v-else class="flex flex-col items-center justify-center gap-2">
                                <span class="text-3xl md:text-4xl animate-spin-slow">⏳</span>
                                <span class="font-bold italic text-ink-soft/40"
                                      :class="cardConfig.thinkingClass">
                                    {{ t('impostorVoting.thinking') }}
                                </span>
                            </div>

                            <!-- Burst de animación de reacciones (posición fija en datos) -->
                            <div class="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                                <TransitionGroup name="burst">
                                    <span
                                        v-for="b in getBurstsForTarget(s.id, impostorData.currentCategoryId)"
                                        :key="b.id"
                                        class="absolute bottom-0 font-emoji"
                                        :class="cardConfig.reactionsCompact ? 'text-2xl' : 'text-4xl'"
                                        :style="{ left: `${b.offsetX}%` }"
                                    >{{ b.emoji }}</span>
                                </TransitionGroup>
                            </div>
                        </div>

                        <!-- Reacciones: bar visible para TODOS (incluso el propio jugador ve las reacciones en su carta) -->
                        <div class="flex items-center gap-1 mb-2" v-if="s.word && !s.isPlayerDead">
                            <ReactionBar
                                :counts="getCountsForTarget(s.id, impostorData.currentCategoryId)"
                                :is-compact="cardConfig.reactionsCompact"
                                class="flex-1 min-w-0"
                            />
                            <!-- Trigger solo para otros jugadores -->
                            <ReactionMenu
                                v-if="!s.isMe"
                                :target-player-id="s.id"
                                :category-id="impostorData.currentCategoryId"
                                :is-compact="cardConfig.reactionsCompact"
                                @react="(emoji, tid, cid) => sendReaction(tid, cid, emoji)"
                            />
                        </div>

                        <button @click="handleVote(s.id)"
                                :disabled="s.isMe || s.isPlayerDead || isDead || isSpectator"
                                class="w-full transition-all duration-300 active:scale-95 flex items-center justify-center relative overflow-hidden group"
                                :class="[
                                    cardConfig.buttonClass,
                                    s.isSelectedByMe
                                        ? 'bg-action-error border-action-error shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                                        : 'bg-panel-input/40 border-white/10 hover:border-action-error/50 hover:bg-action-error/10',
                                    (!s.isMe && !s.isPlayerDead && !isDead && !isSpectator)
                                        ? 'cursor-pointer'
                                        : 'cursor-not-allowed opacity-50 grayscale'
                                ]"
                        >
                            <span class="font-black tracking-widest uppercase text-center relative z-10 transition-colors"
                                  :class="[
                                      cardConfig.buttonText,
                                      s.isSelectedByMe ? 'text-white drop-shadow-md' : 'text-ink-soft group-hover:text-action-error'
                                  ]">
                                {{ s.isSelectedByMe ? '¡' + t('impostorVoting.accuse') + '!' : t('impostorVoting.accuse') }}
                            </span>
                        </button>
                    </div>

                    <!-- Footer: vote count -->
                    <div class="flex justify-center items-center pb-3 pt-1">
                        <span class="text-action-warning mr-1 drop-shadow-sm" :class="cardConfig.reactionsCompact ? 'text-[10px]' : 'text-xs'">🔥</span>
                        <span class="font-black text-ink-muted uppercase tracking-widest"
                              :class="cardConfig.footerText">
                            {{ s.currentVotes }} {{ s.currentVotes === 1 ? t('impostorVoting.vote') : t('impostorVoting.votes') }}
                        </span>
                    </div>

                    <!-- Dead overlay -->
                    <div v-if="s.isPlayerDead"
                         class="absolute inset-0 flex items-center justify-center pointer-events-none z-10 bg-panel-base/80 backdrop-blur-[1px] rounded-3xl overflow-hidden">
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

@keyframes glow-panic {
    0%, 100% {
        box-shadow: 0 0 12px rgba(251, 113, 133, 0.15);
        border-color: rgba(244, 63, 94, 0.3);
    }
    50% {
        box-shadow: 0 0 22px rgba(251, 113, 133, 0.4);
        border-color: rgba(244, 63, 94, 0.75);
    }
}
.animate-glow-panic {
    animation: glow-panic 2s infinite ease-in-out;
}

@keyframes spin-slow {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
.animate-spin-slow {
    animation: spin-slow 8s linear infinite;
}
</style>
