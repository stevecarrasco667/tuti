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
    isHorizontal?: boolean; // Soporte para el modo fila (7-8 jugadores)
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
        card:    s === 'xl' ? 'p-4 md:p-6 min-h-[220px] md:min-h-[240px]' // Reducción de min-h para mayor compresión vertical
               : s === 'lg' ? 'p-4 md:p-5 min-h-[180px] md:min-h-[200px]'
               : s === 'md' ? 'p-3 md:p-4 min-h-[130px]'
                            : 'p-2.5 min-h-[110px]',
        avatar:  s === 'xl' ? 'text-xl'
               : s === 'lg' ? 'text-lg'
               : s === 'md' ? 'text-sm md:text-base'
                            : 'text-xs',
        name:    s === 'xl' ? 'text-sm md:text-base'
               : s === 'lg' ? 'text-xs md:text-sm'
                            : 'text-xs',
        word:    s === 'xl' ? 'text-[clamp(1.75rem,12cqi,4.5rem)]'
               : s === 'lg' ? 'text-[clamp(1.25rem,9cqi,3.5rem)]'
               : s === 'md' ? 'text-[clamp(1.125rem,8cqi,2.75rem)]'
                            : 'text-[clamp(0.85rem,7cqi,1.85rem)]',
        selfIcon: s === 'xl' ? 'w-10 h-10 text-xl'
                : s === 'lg' ? 'w-8 h-8 text-lg'
                : s === 'md' ? 'w-7 h-7 md:w-8 md:h-8 text-base md:text-lg'
                             : 'w-6 h-6 text-sm',
        burst:   s === 'sm' ? 'text-2xl' : 'text-4xl',
        isCompact: s === 'sm',
    };
});
</script>

<template>
    <!-- ========================================== -->
    <!-- 1. MODO FILA HORIZONTAL (7-8 Jugadores)    -->
    <!-- ========================================== -->
    <div
        v-if="isHorizontal"
        class="backdrop-blur-md rounded-2xl w-full flex flex-row items-center justify-between p-3.5 border-2 transition-all duration-300 gap-4"
        :class="[
            isAutoValidated
                ? 'bg-game-yellow/10 border-game-yellow/40 shadow-[0_2px_8px_rgba(245,158,11,0.15)]'
                : isRejected || !isApproved
                    ? 'bg-game-red/5 border-game-red/20 opacity-80 scale-[0.99]'
                    : isDuplicate
                        ? 'bg-game-yellow/10 border-game-yellow/40 shadow-[0_2px_8px_rgba(245,158,11,0.15)]'
                        : 'bg-panel-card border-white/5 shadow-md hover:border-white/10'
        ]"
    >
        <!-- Fila Izquierda: Perfil + Badge Votos -->
        <div class="flex items-center gap-2.5 w-[200px] shrink-0 min-w-0">
            <span class="leading-none drop-shadow-sm shrink-0 text-base md:text-lg">
                {{ playerAvatar || '👤' }}
            </span>
            <span class="font-black text-ink-main drop-shadow-sm truncate text-xs md:text-sm tracking-wide" :title="playerName">
                {{ playerName }}
            </span>
            <span v-if="isAutoValidated" class="text-xs shrink-0 select-none" title="Autovalidado">🛡️</span>
            
            <!-- Badge de votos integrado directamente en el perfil -->
            <span v-if="voteCount > 0 && !isAutoValidated"
                  class="shrink-0 bg-game-red/20 text-game-red border border-game-red/30 px-1.5 py-0.5 rounded-full text-[9px] font-black shadow-inner flex items-center gap-0.5 select-none animate-pulse">
                <span>{{ voteCount }}</span><span>👎</span>
            </span>
        </div>

        <!-- Fila Centro: La Palabra Héroe Horizontal -->
        <div class="flex-1 min-w-0 relative flex items-center justify-center py-1.5 px-4 bg-panel-input/30 border border-white/5 rounded-xl min-h-[44px]">
            <span
                class="font-heading font-black text-center uppercase break-all truncate transition-all duration-300 leading-tight text-sm md:text-base"
                :class="[
                    isRejected || !isApproved
                        ? 'line-through opacity-40 text-game-red'
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
                        class="absolute bottom-0 font-emoji text-2xl"
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
                :is-compact="true"
                class="max-w-[120px]"
            />
            <ReactionMenu
                v-if="!isMe"
                :target-player-id="playerId"
                :category-id="categoryId"
                :is-compact="true"
                @react="(emj, tid, cid) => emit('react', emj, tid, cid)"
            />
        </div>

        <!-- Fila Acción Votación: Selector Segmentado Compacto -->
        <div class="shrink-0 w-[110px] flex justify-end">
            <template v-if="!isMe && !isAutoValidated">
                <div class="relative bg-panel-input/80 border border-white/10 rounded-full p-0.5 flex items-center select-none w-[90px] h-8"
                     :class="isSpectator ? 'opacity-50 cursor-not-allowed' : ''">
                    <!-- Fondo Deslizante -->
                    <div 
                        class="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full transition-all duration-300 ease-out shadow-sm pointer-events-none"
                        :class="[
                            !modelValue ? 'left-0.5 bg-game-red' : 'left-[calc(50%+1px)] bg-game-green'
                        ]"
                    />
                    
                    <!-- Botón Rechazar -->
                    <button
                        type="button"
                        @click="!isSpectator && handleVote(false)"
                        class="flex-1 text-center text-xs font-black z-10 py-0.5 transition-colors duration-200 focus:outline-none"
                        :class="!modelValue ? 'text-white' : 'text-ink-muted hover:text-ink-main'"
                        :disabled="isSpectator"
                    >
                        ❌
                    </button>
                    
                    <!-- Botón Aprobar -->
                    <button
                        type="button"
                        @click="!isSpectator && handleVote(true)"
                        class="flex-1 text-center text-xs font-black z-10 py-0.5 transition-colors duration-200 focus:outline-none"
                        :class="modelValue ? 'text-white' : 'text-ink-muted hover:text-ink-main'"
                        :disabled="isSpectator"
                    >
                        ✅
                    </button>
                </div>
            </template>
            <span v-else
                  class="drop-shadow-sm flex items-center justify-center bg-panel-input rounded-full border-2 border-white/10 w-7 h-7 text-xs select-none">
                {{ selfStatusIcon }}
            </span>
        </div>
    </div>

    <!-- ========================================== -->
    <!-- 2. MODO TARJETA VERTICAL OPTIMIZADO        -->
    <!-- ========================================== -->
    <div
        v-else
        class="backdrop-blur-md rounded-[2rem] w-full flex flex-col transition-all duration-300 [container-type:inline-size] border-2"
        :class="[
            sizeConfig.card,
            isAutoValidated
                ? 'bg-game-yellow/10 border-game-yellow/40 shadow-3d-yellow'
                : isRejected || !isApproved
                    ? 'bg-game-red/5 border-game-red/20 shadow-[0_2px_0_rgba(239,68,68,0.15)] opacity-85 scale-[0.98]'
                    : isDuplicate
                        ? 'bg-game-yellow/10 border-game-yellow/40 shadow-3d-yellow'
                        : 'bg-panel-card border-white/10 shadow-3d-panel hover:-translate-y-0.5'
        ]"
    >
        <!-- ROW 1 — Avatar + Nombre + Badge Votos (Header Integrado) -->
        <div class="flex-none flex items-center gap-2 mb-1.5">
            <span class="leading-none drop-shadow-sm flex-shrink-0" :class="sizeConfig.avatar">
                {{ playerAvatar || '👤' }}
            </span>
            <span class="font-black text-ink-main drop-shadow-sm truncate tracking-wide" :class="sizeConfig.name"
                  :title="playerName">
                {{ playerName }}
            </span>
            <span v-if="isAutoValidated" class="text-xs flex-shrink-0 ml-1.5 select-none" title="Autovalidado">🛡️</span>

            <!-- Badge de votos negativos en esquina superior derecha de la tarjeta -->
            <span v-if="voteCount > 0 && !isAutoValidated"
                  class="ml-auto bg-game-red/20 text-game-red border border-game-red/30 px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-black shadow-inner flex items-center gap-0.5 select-none animate-pulse">
                <span>{{ voteCount }}</span><span>👎</span>
            </span>
        </div>

        <!-- ROW 2 — La Palabra Premium (Contraste Mejorado, sin caja negra gigante) -->
        <div class="relative flex-1 flex flex-col items-center justify-center w-full px-2.5 min-h-[64px] bg-panel-input/20 border border-white/5 rounded-2xl my-1">
            <span
                class="font-heading font-black text-center uppercase break-words break-all drop-shadow-sm transition-all duration-300 leading-tight"
                :class="[
                    sizeConfig.word,
                    'line-clamp-2',
                    isRejected || !isApproved
                        ? 'line-through opacity-40 text-game-red'
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
                  class="mt-1 text-[8px] font-black bg-game-yellow/20 text-game-yellow px-2.5 py-0.5 rounded-full uppercase tracking-widest select-none">
                Repetida
            </span>

            <!-- Burst de animación (solo visual, 1.5s) -->
            <div class="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
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

        <!-- ROW 3 — ReactionBar + Trigger -->
        <div class="flex-none flex items-center gap-1.5 mt-1.5 min-h-[22px]" v-if="word">
            <ReactionBar
                :counts="reactionCounts"
                :is-compact="sizeConfig.isCompact"
                class="flex-1 min-w-0"
            />
            <ReactionMenu
                v-if="!isMe"
                :target-player-id="playerId"
                :category-id="categoryId"
                :is-compact="sizeConfig.isCompact"
                @react="(emj, tid, cid) => emit('react', emj, tid, cid)"
            />
        </div>

        <!-- ROW 4 — Selector de Votación Segmentado / Icono Propio -->
        <div class="flex-none flex items-center justify-center mt-2.5 relative">
            <template v-if="!isMe && !isAutoValidated">
                <!-- Selector Segmentado Premium tipo Interruptor -->
                <div class="relative bg-panel-input border border-white/10 rounded-full p-0.5 flex items-center select-none w-full max-w-[160px] h-9"
                     :class="isSpectator ? 'opacity-50 cursor-not-allowed' : ''">
                    <!-- Fondo Deslizante Activo -->
                    <div 
                        class="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full transition-all duration-300 ease-out shadow-sm pointer-events-none"
                        :class="[
                            !modelValue ? 'left-0.5 bg-game-red' : 'left-[calc(50%+1px)] bg-game-green'
                        ]"
                    />
                    
                    <!-- Botón Rechazar ❌ -->
                    <button
                        type="button"
                        @click="!isSpectator && handleVote(false)"
                        class="flex-1 text-center text-xs font-black z-10 py-1 transition-colors duration-200 focus:outline-none"
                        :class="!modelValue ? 'text-white' : 'text-ink-muted hover:text-ink-main'"
                        :disabled="isSpectator"
                    >
                        ❌ Rechazar
                    </button>
                    
                    <!-- Botón Aprobar ✅ -->
                    <button
                        type="button"
                        @click="!isSpectator && handleVote(true)"
                        class="flex-1 text-center text-xs font-black z-10 py-1 transition-colors duration-200 focus:outline-none"
                        :class="modelValue ? 'text-white' : 'text-ink-muted hover:text-ink-main'"
                        :disabled="isSpectator"
                    >
                        ✅ Aprobar
                    </button>
                </div>
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
