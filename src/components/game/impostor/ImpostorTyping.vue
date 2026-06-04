<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ImpostorData, Player } from '../../../../shared/types';
import { useGame } from '../../../composables/useGame';
import { isSpoiler } from '../../../../shared/utils/spoiler';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
    impostorData: ImpostorData;
    players: Player[];
    myUserId: string;
    timeRemaining: number;
    timerColor: string;
    isSpectator?: boolean;
}>();

const inputWord = ref('');
// [P12] En lugar de hasSubmitted pasamos a evaluar if player in readyPlayers
const hasConfirmed = computed(() => props.impostorData.readyPlayers?.includes(props.myUserId));

const isDead = computed(() => !props.impostorData.alivePlayers.includes(props.myUserId));
// Sprint 3.4: Read role from private whisper instead of public state
const isImpostor = computed(() => localImpostorRole.value?.role === 'impostor');
const secretWord = computed(() => localImpostorRole.value?.word ?? null);

const impostorAllies = computed(() => {
    if (!isImpostor.value || !localImpostorRole.value) return [];
    return (localImpostorRole.value.allies)
        .map(id => props.players.find(p => p.id === id)?.name || t('impostorTyping.unknown'));
});

const isLocked = computed(() => {
    // UX Locking rule: if time is 0 or less, disable immediately, or if dead
    return props.timeRemaining <= 0 || hasConfirmed.value || isDead.value;
});

// [P12] UX Anti-Spoiler
const spoilerDetected = computed(() => {
    if (isImpostor.value || !secretWord.value) return false;
    return isSpoiler(inputWord.value, secretWord.value);
});

const { debouncedUpdateImpostorDraft, confirmImpostorWord, localImpostorRole } = useGame();
const { t } = useI18n();

// [P12] Live Drafts: enviar borrador al escribir
watch(inputWord, (newWord) => {
    if (isLocked.value) return;
    debouncedUpdateImpostorDraft(newWord);
});

const confirmWord = () => {
    if (isLocked.value || !inputWord.value.trim() || spoilerDetected.value) return;
    confirmImpostorWord(); // [P12] Marca listo, el borrador ya viaja por debounce
};

const activePlayers = computed(() => {
    // Only display active non-spectating players
    return props.players.filter(p => p.isConnected);
});

const hasPlayerTypingCompleted = (playerId: string) => {
    // Relying on Backend's State Masking:
    // This object has { "uuid": "***", "myUuid": "myword" }
    return props.impostorData.words && props.impostorData.words[playerId] !== undefined;
};

const isPlayerDead = (playerId: string) => {
    if (!props.impostorData) return false;
    return !props.impostorData.alivePlayers.includes(playerId);
};

const handleInputFocus = (event: Event) => {
    // SMART SCROLL: Only if keyboard covers input
    if (window.visualViewport) {
        const target = event.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        const viewportHeight = window.visualViewport.height;

        // If bottom of input is outside visible viewport
        if (rect.bottom > viewportHeight) {
             setTimeout(() => { 
                target.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); 
            }, 300);
        }
    } else {
         // Fallback for non-compliant browsers
        const target = event.target as HTMLElement;
        setTimeout(() => { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
    }
};
</script>

<template>
    <div class="min-h-[100dvh] w-full flex flex-col justify-start items-center p-3 md:p-6 overflow-y-auto scrollbar-thin pb-[env(safe-area-inset-bottom,1rem)]">
        
        <!-- HEADER UNIFICADO: Categoría + Identidad + Tiempo -->
        <div class="w-full flex justify-between items-stretch bg-panel-card border border-white/10 p-2 md:p-3 rounded-2xl backdrop-blur-md shadow-sm max-w-xl flex-none mb-3 md:mb-4 relative overflow-hidden group gap-2 md:gap-3">
            <!-- 1. Categoría (Izquierda) -->
            <div class="flex-[1.2] min-w-0 flex flex-col justify-center pl-1 md:pl-2">
                <span class="text-[7px] md:text-[9px] text-ink-muted uppercase tracking-widest block font-black mb-0.5">{{ t('impostorTyping.category') }}</span>
                <span class="text-[10px] xs:text-xs md:text-base text-ink-main font-black truncate">{{ t(`categories.${impostorData.currentCategoryId}`, impostorData.currentCategoryName) }}</span>
            </div>
            
            <!-- Divisor Vertical -->
            <div class="h-8 md:h-10 w-px bg-white/10 flex-none self-center"></div>
            
            <!-- 2. Identidad y Rol (Centro) -->
            <div class="flex-[2.8] min-w-0 flex items-center px-1 md:px-2 gap-2 md:gap-3 transition-opacity duration-300"
                 :class="{ 'opacity-50': isDead }">
                
                <span class="text-2xl md:text-4xl flex-none drop-shadow-sm animate-pulse">
                    {{ isDead ? '💀' : isImpostor ? '🤫' : '💡' }}
                </span>
                
                <div class="min-w-0 flex flex-col justify-center text-left">
                    <span class="text-[8px] md:text-xs uppercase tracking-widest font-black block mb-0.5 md:mb-1"
                          :class="[
                              isDead ? 'text-ink-muted' :
                              isImpostor ? 'text-action-error' : 'text-tuti-teal'
                          ]">
                        {{ isDead ? t('impostorTyping.ghostTitle') : isImpostor ? t('impostorTyping.impostorTitle') : t('impostorTyping.crewTitle') }}
                    </span>
                    <span class="text-xs xs:text-sm md:text-xl lg:text-2xl text-ink-main font-black leading-tight truncate">
                        <template v-if="isDead">
                            <span class="text-ink-muted font-bold text-[9px] xs:text-[10px] md:text-sm">{{ t('impostorTyping.ghostDesc') }}</span>
                        </template>
                        <template v-else-if="isImpostor">
                            <span v-if="impostorAllies.length > 0" class="text-ink-muted font-normal text-[9px] xs:text-xs md:text-base">
                                {{ t('impostorTyping.allies') }}: <strong class="text-action-error font-black">{{ impostorAllies.join(', ') }}</strong>
                            </span>
                            <span v-else class="text-action-error font-black italic text-xs xs:text-sm md:text-xl">
                                {{ t('impostorTyping.impostorTip') }}
                            </span>
                        </template>
                        <template v-else>
                            <span class="text-ink-muted font-normal text-[10px] xs:text-xs md:text-lg mr-1">{{ t('impostorTyping.wordIs') }}</span>
                            <span class="text-tuti-teal font-black text-xs xs:text-sm md:text-xl lg:text-2xl animate-pulse">{{ secretWord }}</span>
                        </template>
                    </span>
                </div>
            </div>
            
            <!-- Divisor Vertical -->
            <div class="h-8 md:h-10 w-px bg-white/10 flex-none self-center"></div>
            
            <!-- 3. Tiempo (Derecha) -->
            <div class="flex items-center gap-1 md:gap-2 flex-none justify-center pr-1 md:pr-2">
                <span class="text-[7px] md:text-[9px] text-ink-muted uppercase tracking-widest font-black hidden xs:inline">{{ t('impostorTyping.time') }}</span>
                <span class="text-sm md:text-xl font-mono font-black border bg-panel-input px-2 md:px-2.5 py-0.5 md:py-1 rounded-lg leading-none shadow-inner" :class="timerColor">
                    {{ Math.max(0, timeRemaining) }}
                </span>
            </div>
        </div>

        <!-- CENTER: Main Input Area -->
        <div class="w-full flex flex-col justify-center items-center max-w-xl px-4 my-auto py-2 md:py-4">
            <h2 class="text-lg md:text-3xl text-ink-main font-black uppercase tracking-widest text-center mb-4 md:mb-4 drop-shadow-sm">
                {{ t('impostorTyping.typeWord') }}
            </h2>
            
            <form v-if="!isSpectator" @submit.prevent="confirmWord" class="w-full relative group">
                <input 
                    type="text" 
                    v-model="inputWord"
                    :disabled="isLocked"
                    :placeholder="t('impostorTyping.placeholder')"
                    class="w-full bg-panel-input border-[3px] md:border-[4px] text-center text-lg md:text-4xl py-2 md:py-6 px-10 md:px-16 rounded-2xl md:rounded-[2.5rem] backdrop-blur-xl focus:outline-none transition-all font-black shadow-inner disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    :class="[
                        spoilerDetected 
                            ? 'border-action-error text-action-error placeholder:text-action-error/40 focus:border-action-error focus:bg-action-error/10 focus:shadow-glow-panic' 
                            : 'border-white/20 text-ink-main placeholder:text-ink-muted/40 focus:border-action-primary focus:bg-white/10 focus:shadow-glow-primary'
                    ]"
                    @focus="handleInputFocus"
                    autofocus
                />
                
                <!-- [P12] Botón "Listo" -->
                <button 
                    type="submit"
                    :disabled="isLocked || !inputWord.trim() || spoilerDetected"
                    class="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 p-2.5 md:p-4 rounded-xl md:rounded-full font-black transition-all shadow-glow-primary border"
                    :class="[
                        hasConfirmed 
                            ? 'bg-tuti-teal text-white border-white/20 opacity-100 scale-95' 
                            : 'bg-action-primary hover:bg-action-hover text-ink-base border-white/20 active:scale-95 disabled:opacity-0',
                        spoilerDetected && !hasConfirmed ? '!bg-action-error !opacity-50 !cursor-not-allowed !shadow-none' : ''
                    ]"
                >
                    <span v-if="hasConfirmed" class="text-sm md:text-xl px-1">✓</span>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="w-5 h-5 md:w-7 md:h-7">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                </button>
            </form>
            <div v-else class="w-full text-center py-6 text-action-primary animate-pulse text-lg font-black uppercase tracking-widest bg-panel-input/50 rounded-full border border-action-primary/30">
                <span class="text-xl">👀</span> {{ t('impostorTyping.playersTyping') }}
            </div>

            <!-- [P12] Anti-Spoiler Feedback Msg -->
            <p v-if="spoilerDetected && !hasConfirmed" class="mt-4 text-action-error font-black uppercase tracking-widest animate-pulse text-sm text-center px-4 drop-shadow-md">
                {{ t('impostorTyping.spoilerWarning') }}
            </p>
            
            <p v-else-if="hasConfirmed" class="mt-6 text-tuti-teal font-black uppercase tracking-widest text-sm">
                {{ t('impostorTyping.readyWaiting') }}
            </p>
            <p v-else-if="timeRemaining <= 0" class="mt-6 text-action-error font-black uppercase tracking-widest text-sm">
                {{ t('impostorTyping.timeUp') }}
            </p>
        </div>

        <!-- BOTTOM: Social Grid (Feedback visual) -->
        <div class="w-full max-w-xl mt-auto pb-2 pt-2 md:pt-4 flex-none">
            <h3 class="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-ink-muted font-black text-center mb-2 md:mb-4">
                {{ t('impostorTyping.crewStatus') }}
            </h3>
            
            <!-- Mobile Swipeable Horizontal List / Desktop Flex Wrap -->
            <div class="w-full overflow-x-auto md:overflow-x-visible px-4 md:px-0 pb-3 md:pb-0 scrollbar-none">
                <div class="flex flex-row md:flex-wrap justify-start md:justify-center gap-3.5 md:gap-6 min-w-max md:min-w-0 mx-auto w-fit">
                    <div v-for="player in activePlayers" :key="player.id" 
                         class="flex flex-col items-center relative transition-all duration-300 flex-none"
                         :class="{ 'opacity-50 grayscale pointer-events-none': isPlayerDead(player.id) }">
                        <div class="w-12 h-12 md:w-16 md:h-16 rounded-full bg-panel-input border-2 md:border-4 border-white/10 flex items-center justify-center text-2xl md:text-3xl shadow-sm relative z-10 overflow-hidden">
                            {{ player.avatar || '👤' }}
                            
                            <!-- Ícono de Calavera para muertos -->
                            <div v-if="isPlayerDead(player.id)" class="absolute inset-0 flex items-center justify-center bg-panel-base/80 backdrop-blur-[1px]">
                                <span class="text-lg md:text-2xl drop-shadow-md">💀</span>
                            </div>
                        </div>
                        <span class="text-[9px] md:text-xs text-ink-soft mt-1.5 md:mt-2 font-black uppercase tracking-wider max-w-[64px] md:max-w-[80px] truncate bg-panel-input/60 px-1.5 py-0.5 rounded-full border border-white/10">
                            {{ player.id === myUserId ? t('impostorTyping.you') : player.name }}
                        </span>
                        
                        <!-- Checkmark Badge for submitted word -->
                        <div v-if="!isPlayerDead(player.id) && hasPlayerTypingCompleted(player.id)" 
                             class="absolute -top-1 -right-1 bg-action-primary text-white w-5 h-5 md:w-7 md:h-7 rounded-full flex items-center justify-center border border-white/10 shadow-sm z-10 scale-in">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5 md:w-5 md:h-5">
                              <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.scale-in {
    animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes scaleIn {
    from {
        transform: scale(0);
        opacity: 0;
    }
    to {
        transform: scale(1);
        opacity: 1;
    }
}

/* Hide scrollbar for Chrome, Safari and Opera */
.scrollbar-none::-webkit-scrollbar {
    display: none;
}
/* Hide scrollbar for IE, Edge and Firefox */
.scrollbar-none {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
}
</style>
