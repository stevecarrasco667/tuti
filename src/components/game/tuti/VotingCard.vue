<script setup lang="ts">
import { computed } from 'vue';
import ReactionMenu from '../ReactionMenu.vue';
import ReactionBar from '../ReactionBar.vue';

type CardSize = 'xl' | 'lg' | 'md' | 'sm';

const props = defineProps<{
    playerName: string;
    playerAvatar: string;
    word: string;
    isDuplicate: boolean;
    isAutoValidated: boolean;
    isRejected: boolean;
    isApproved: boolean;
    voteCount: number;
    isMe: boolean;
    selfStatusIcon: string;
    modelValue: boolean;
    cardSize?: CardSize;
    playerId: string;
    categoryId: string;
    reactionCounts: Record<string, number>;
    reactionBursts: Array<{ id: string; emoji: string; offsetX: number }>;
    isSpectator?: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'vote'): void;
    (e: 'react', emoji: string, targetId: string, catId: string): void;
}>();

const handleVote = (value: boolean) => {
    // [Sprint B — C2] Haptic feedback for mobile voting
    if (navigator.vibrate) navigator.vibrate(20);
    emit('update:modelValue', value);
};

const sizeConfig = computed(() => {
    const s = props.cardSize ?? 'md';
    return {
        // Paddings de la fila
        padding: s === 'xl' ? 'p-5 md:p-6 gap-5'
               : s === 'lg' ? 'p-4 md:p-4.5 gap-4'
               : s === 'md' ? 'p-3 md:p-3.5 gap-3'
                            : 'p-2 md:p-2.5 gap-2',
        
        // Perfil ancho
        profileWidth: s === 'xl' ? 'w-[250px]'
                    : s === 'lg' ? 'w-[220px]'
                    : s === 'md' ? 'w-[200px]'
                                 : 'w-[170px]',
        
        avatar:  s === 'xl' ? 'text-xl md:text-2xl'
               : s === 'lg' ? 'text-lg'
               : s === 'md' ? 'text-sm md:text-base'
                            : 'text-xs',
        name:    s === 'xl' ? 'text-sm md:text-base'
               : s === 'lg' ? 'text-xs md:text-sm'
                            : 'text-[11px] md:text-xs',
        word:    s === 'xl' ? 'text-sm md:text-base'
               : s === 'lg' ? 'text-xs md:text-sm'
               : s === 'md' ? 'text-xs md:text-sm'
                            : 'text-[11px] md:text-xs',
        selfIcon: s === 'xl' ? 'w-10 h-10 text-xl'
                : s === 'lg' ? 'w-8 h-8 text-lg'
                : s === 'md' ? 'w-7 h-7 md:w-8 md:h-8 text-base md:text-lg'
                             : 'w-6 h-6 text-sm',
        burst:   s === 'sm' ? 'text-xl' : 'text-3xl',
        isCompact: s === 'sm',
        
        // Ajustes para el Switch Deslizable
        switchWidth: s === 'xl' ? '120px'
                   : s === 'lg' ? '110px'
                   : s === 'md' ? '100px'
                                : '85px',
        switchContainerClass: s === 'xl' ? 'w-[56px] h-[32px] p-[4px]'
                            : s === 'lg' ? 'w-[48px] h-[28px] p-[3px]'
                            : s === 'md' ? 'w-[40px] h-[24px] p-[3px]'
                                         : 'w-[32px] h-[20px] p-[2px]',
        switchCircleClass: s === 'xl' ? 'w-[24px] h-[24px]'
                         : s === 'lg' ? 'w-[22px] h-[22px]'
                         : s === 'md' ? 'w-[18px] h-[18px]'
                                      : 'w-[16px] h-[16px]',
        switchTranslateClass: s === 'xl' ? 'translate-x-[24px]'
                            : s === 'lg' ? 'translate-x-[20px]'
                            : s === 'md' ? 'translate-x-[16px]'
                                         : 'translate-x-[12px]',
    };
});
</script>

<template>
    <!-- MODO FILA HORIZONTAL ÚNICO Y OPTIMIZADO (Para 2 a 8 Jugadores) -->
    <div
        class="backdrop-blur-md rounded-2xl w-full flex flex-row items-center justify-between border-2 transition-all duration-300 shadow-md hover:scale-[1.005] hover:shadow-lg"
        :class="[
            sizeConfig.padding,
            isAutoValidated
                ? 'bg-game-yellow/10 border-game-yellow/40 shadow-[0_2px_8px_rgba(245,158,11,0.15)]'
                : isRejected || !isApproved
                    ? 'bg-game-red/5 border-game-red/20 opacity-80 scale-[0.99]'
                    : isDuplicate
                        ? 'bg-game-yellow/10 border-game-yellow/40 shadow-[0_2px_8px_rgba(245,158,11,0.15)]'
                        : 'bg-panel-card border-white/5 hover:border-white/10'
        ]"
    >
        <!-- Fila Izquierda: Perfil + Badge Votos -->
        <div class="flex items-center gap-2 shrink-0 min-w-0" :class="sizeConfig.profileWidth">
            <span class="leading-none drop-shadow-sm shrink-0" :class="sizeConfig.avatar">
                {{ playerAvatar || '👤' }}
            </span>
            <span class="font-black text-ink-main drop-shadow-sm truncate tracking-wide" :class="sizeConfig.name" :title="playerName">
                {{ playerName }}
            </span>
            <span v-if="isAutoValidated" class="text-xs shrink-0 select-none">🛡️</span>
            
            <!-- Badge de votos integrado directamente en el perfil del jugador -->
            <span v-if="voteCount > 0 && !isAutoValidated"
                  class="shrink-0 bg-game-red/20 text-game-red border border-game-red/30 px-1.5 py-0.5 rounded-full text-[9px] font-black shadow-inner flex items-center gap-0.5 select-none animate-pulse">
                <span>{{ voteCount }}</span><span>👎</span>
            </span>
        </div>

        <!-- Fila Centro: La Palabra Héroe Horizontal -->
        <div class="flex-1 min-w-0 relative flex items-center justify-center py-2 px-4 bg-panel-input/30 border border-white/5 rounded-xl min-h-[44px]">
            <span
                class="font-heading font-black text-center uppercase break-all truncate transition-all duration-300 leading-tight"
                :class="[
                    sizeConfig.word,
                    isRejected || !isApproved
                        ? 'line-through opacity-45 text-game-red'
                        : isAutoValidated
                            ? 'text-game-yellow drop-shadow-glow'
                            : isDuplicate
                                ? 'text-game-yellow'
                                : 'text-ink-main'
                ]"
            >
                {{ word || '—' }}
            </span>

            <span v-if="isDuplicate"
                  class="ml-2 text-[7px] md:text-[8px] font-black bg-game-yellow/20 text-game-yellow px-2 py-0.5 rounded-full uppercase tracking-widest select-none shrink-0">
                Repetida
            </span>

            <!-- Burst de animación flotante en la fila -->
            <div class="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                <TransitionGroup name="burst">
                    <span
                        v-for="b in reactionBursts"
                        :key="b.id"
                        class="absolute bottom-0 font-emoji"
                        :class="sizeConfig.burst"
                        :style="{ left: `${b.offsetX}%` }"
                    >
                        {{ b.emoji }}
                    </span>
                </TransitionGroup>
            </div>
        </div>

        <!-- Fila Derecha: Barra de Reacciones -->
        <div class="flex items-center gap-1.5 shrink-0 min-h-[22px]" v-if="word">
            <ReactionBar
                :counts="reactionCounts"
                :is-compact="sizeConfig.isCompact"
                class="max-w-[120px]"
            />
            <ReactionMenu
                v-if="!isMe"
                :target-player-id="playerId"
                :category-id="categoryId"
                :is-compact="sizeConfig.isCompact"
                @react="(emj, tid, cid) => emit('react', emj, tid, cid)"
            />
        </div>

        <!-- Fila Acción Votación: Switch Deslizable Deslizante Rojo/Verde (Sin emojis) -->
        <div class="shrink-0 flex items-center justify-end" :style="{ width: sizeConfig.switchWidth }">
            <template v-if="!isMe && !isAutoValidated">
                <!-- Switch Deslizable Premium -->
                <button
                    type="button"
                    @click="!isSpectator && handleVote(!modelValue)"
                    class="relative inline-flex items-center rounded-full transition-colors duration-200 border border-white/10 shrink-0 shadow-inner focus:outline-none"
                    :class="[
                        modelValue ? 'bg-game-green shadow-[0_0_10px_rgba(34,197,94,0.25)] border-game-green/30' : 'bg-game-red shadow-[0_0_10px_rgba(239,68,68,0.25)] border-game-red/30',
                        sizeConfig.switchContainerClass,
                        isSpectator ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    ]"
                    :disabled="isSpectator"
                >
                    <span
                        class="inline-block bg-white rounded-full transition-transform duration-200 ease-out shadow-md"
                        :class="[
                            modelValue ? sizeConfig.switchTranslateClass : 'translate-x-0',
                            sizeConfig.switchCircleClass
                        ]"
                    />
                </button>
            </template>
            <span v-else
                  class="drop-shadow-sm flex items-center justify-center bg-panel-input rounded-full border-2 border-white/10 select-none"
                  :class="sizeConfig.selfIcon">
                {{ selfStatusIcon }}
            </span>
        </div>
    </div>
</template>

<style scoped>
.font-emoji { font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif; }

/* Burst: sube y desaparece en 1.5s */
.burst-enter-active {
    animation: burst-fly 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}
.burst-leave-active { transition: opacity 0.2s; }
.burst-leave-to { opacity: 0; }

@keyframes burst-fly {
    0%   { transform: translateY(0)   scale(0.6); opacity: 0; }
    15%  { transform: translateY(-10px) scale(1.3); opacity: 1; }
    80%  { transform: translateY(-60px) scale(1.2); opacity: 0.8; }
    100% { transform: translateY(-80px) scale(1.0); opacity: 0; }
}
</style>
