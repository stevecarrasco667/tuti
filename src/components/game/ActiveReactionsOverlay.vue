<script setup lang="ts">
import { useActiveReactions } from '../../composables/useActiveReactions';
import { useGameState } from '../../composables/useGameState';

const { activeReactions } = useActiveReactions();
const { gameState } = useGameState();

const getPlayerName = (userId: string) => {
    const p = gameState.value.players.find(pl => pl.id === userId);
    return p ? p.name : 'Jugador';
};

const getPlayerAvatar = (userId: string) => {
    const p = gameState.value.players.find(pl => pl.id === userId);
    return p ? p.avatar : '👤';
};

const getEmojiCharacter = (emojiId: string) => {
    if (emojiId.length <= 4) return emojiId; // Raw emoji character
    if (emojiId === 'emoji_brain_explode') return '🤯';
    return '🤯';
};

function getRandomStyle(reaction: any) {
    // Create deterministic random properties based on reaction ID string hash
    const hash = reaction.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const leftPercent = 15 + (hash % 70); // 15% to 85% width
    const scale = 0.95 + ((hash % 20) / 100); // 0.95 to 1.15 scale
    const driftX = (hash % 30) - 15; // horizontal swing range: -15px to 15px
    const duration = 2.8 + (hash % 12) / 10; // 2.8s to 4.0s duration

    return {
        left: `${leftPercent}%`,
        transform: `scale(${scale})`,
        animationDuration: `${duration}s`,
        '--drift-x': `${driftX}px`
    };
}
</script>

<template>
    <div class="fixed inset-0 pointer-events-none z-overlay overflow-hidden select-none">
        <TransitionGroup name="float-bubble">
            <div 
                v-for="reaction in activeReactions" 
                :key="reaction.id"
                class="absolute floating-reaction-bubble"
                :style="getRandomStyle(reaction)"
            >
                <div class="flex items-center gap-2 bg-[#0f0e2d]/80 backdrop-blur-md border border-white/10 px-3.5 py-2 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
                    <!-- Player Avatar badge -->
                    <div class="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm">
                        {{ getPlayerAvatar(reaction.userId) }}
                    </div>
                    <!-- Player Name -->
                    <span class="text-[9px] font-black uppercase text-white/90 tracking-wider truncate max-w-[80px] leading-none">
                        {{ getPlayerName(reaction.userId) }}
                    </span>
                    <!-- Separator -->
                    <div class="w-[1px] h-3 bg-white/15"></div>
                    <!-- Emoji badge -->
                    <div class="w-8 h-8 flex items-center justify-center text-2xl flex-shrink-0 animate-reaction-bounce">
                        <img v-if="reaction.customUrl" :src="reaction.customUrl" class="w-7 h-7 object-contain" alt="premium emoji" />
                        <span v-else>{{ getEmojiCharacter(reaction.emojiId) }}</span>
                    </div>
                </div>
            </div>
        </TransitionGroup>
    </div>
</template>

<style scoped>
.floating-reaction-bubble {
    position: absolute;
    bottom: -80px;
    animation-name: floatUpFade;
    animation-timing-function: cubic-bezier(0.1, 0.8, 0.25, 1);
    animation-fill-mode: forwards;
}

@keyframes floatUpFade {
    0% {
        transform: translateY(0) scale(0.7) translateX(0);
        opacity: 0;
    }
    10% {
        transform: translateY(-80px) scale(1.05) translateX(calc(var(--drift-x) * 0.2));
        opacity: 1;
    }
    90% {
        opacity: 1;
    }
    100% {
        transform: translateY(-90vh) scale(0.95) translateX(var(--drift-x));
        opacity: 0;
    }
}

.animate-reaction-bounce {
    animation: popBounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite alternate;
}

@keyframes popBounce {
    0% {
        transform: scale(0.9) translateY(0);
    }
    100% {
        transform: scale(1.1) translateY(-3px);
    }
}
</style>
