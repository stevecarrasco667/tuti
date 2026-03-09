<script setup lang="ts">
import { ref, computed } from 'vue';
import { ImpostorData, Player } from '../../../../shared/types';
import { localImpostorRole } from '../../../composables/useGameState';

const props = defineProps<{
    impostorData: ImpostorData;
    players: Player[];
    myUserId: string;
    timeRemaining: number;
    timerColor: string;
}>();

const emit = defineEmits<{
    (e: 'submit', word: string): void;
}>();

const inputWord = ref('');
const hasSubmitted = ref(false);

const isDead = computed(() => !props.impostorData.alivePlayers.includes(props.myUserId));
// Sprint 3.4: Read role from private whisper instead of public state
const isImpostor = computed(() => localImpostorRole.value?.role === 'impostor');
const secretWord = computed(() => localImpostorRole.value?.word ?? null);


const impostorAllies = computed(() => {
    if (!isImpostor.value || !localImpostorRole.value) return [];
    return (localImpostorRole.value.allies)
        .map(id => props.players.find(p => p.id === id)?.name || 'Desconocido');
});

const isLocked = computed(() => {
    // UX Locking rule: if time is 0 or less, disable immediately, or if dead
    return props.timeRemaining <= 0 || hasSubmitted.value || isDead.value;
});

const submitWord = () => {
    if (isLocked.value || !inputWord.value.trim()) return;
    hasSubmitted.value = true;
    emit('submit', inputWord.value.trim());
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
</script>

<template>
    <div class="h-full w-full flex flex-col items-center p-4">
        
        <!-- HEADER: Timer & Info -->
        <div class="w-full flex justify-between items-start mb-4 max-w-4xl">
            <div class="bg-panel-card border-2 border-white/10 px-6 py-3 rounded-3xl backdrop-blur-md shadow-sm">
                <span class="text-[10px] text-ink-muted uppercase tracking-widest block font-black mb-1">Categoría</span>
                <span class="text-xl text-ink-main font-black">{{ impostorData.currentCategoryName }}</span>
            </div>
            
            <div class="bg-panel-card border-2 border-white/10 px-6 py-2 rounded-3xl backdrop-blur-md flex flex-col items-center min-w-[120px] shadow-sm">
                 <span class="text-[10px] text-ink-muted uppercase tracking-widest font-black mb-1">Tiempo</span>
                 <span class="text-3xl font-mono font-black border bg-panel-input px-2 rounded-lg leading-none" :class="timerColor">{{ Math.max(0, timeRemaining) }}</span>
            </div>
        </div>

        <!-- BANNER DE FANTASMA -->
        <div v-if="isDead" class="w-full max-w-4xl mb-6 bg-panel-input/60 border-4 border-white/10 rounded-3xl px-6 py-4 backdrop-blur-md flex items-center justify-center gap-3 shadow-inner">
            <span class="text-4xl animate-bounce drop-shadow-sm">💀</span>
            <div class="text-center">
                <span class="text-ink-muted font-black text-sm uppercase tracking-widest block">Eres un Fantasma</span>
                <span class="text-ink-muted/70 text-xs text-left font-bold">Observa el caos. Tus acciones ya no afectan este mundo.</span>
            </div>
        </div>

        <!-- HUD DE IDENTIDAD -->
        <div class="w-full max-w-4xl mb-8 px-2 transition-opacity duration-500" :class="{ 'opacity-50 grayscale pointer-events-none': isDead }">
            <div v-if="isImpostor"
                 class="bg-action-error/10 border-[3px] border-action-error/30 rounded-3xl px-6 py-3 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                <div class="flex items-center gap-3">
                    <span class="text-3xl drop-shadow-sm">🤫</span>
                    <div>
                        <span class="text-action-error font-black text-sm md:text-base uppercase tracking-widest block text-left">Eres Impostor</span>
                        <span class="text-ink-muted text-sm font-bold ml-2" v-if="!isDead">Categoría: <strong class="text-action-error font-black">{{ impostorData.currentCategoryName }}</strong></span>
                    </div>
                </div>
                <div v-if="impostorAllies.length > 0" class="flex flex-col items-end">
                    <span class="text-[10px] font-black text-ink-muted uppercase tracking-widest">Tus aliados</span>
                    <span class="text-action-error font-black text-sm">{{ impostorAllies.join(', ') }}</span>
                </div>
            </div>
            <div v-else
                 class="bg-tuti-teal/10 border-[3px] border-tuti-teal/30 rounded-3xl px-6 py-3 backdrop-blur-md flex items-center gap-3 shadow-sm">
                <span class="text-3xl drop-shadow-sm">💡</span>
                <div>
                    <span class="text-tuti-teal font-black text-sm md:text-base uppercase tracking-widest text-left block">Eres Tripulante</span>
                    <span class="text-ink-muted text-sm font-bold ml-2" v-if="!isDead">La palabra es: <strong class="text-tuti-teal font-black">{{ secretWord }}</strong></span>
                </div>
            </div>
        </div>

        <!-- CENTER: Main Input Area -->
        <div class="flex-1 w-full flex flex-col justify-center items-center max-w-2xl px-4">
            <h2 class="text-2xl md:text-3xl text-ink-main font-black uppercase tracking-widest text-center mb-8 drop-shadow-sm">
                Escribe una palabra que te camufle...
            </h2>
            
            <form @submit.prevent="submitWord" class="w-full relative group">
                <input 
                    type="text" 
                    v-model="inputWord"
                    :disabled="isLocked"
                    placeholder="Tu palabra aquí..."
                    class="w-full bg-panel-input border-[4px] border-white/10 text-ink-main text-center text-4xl py-6 px-12 rounded-[2.5rem] backdrop-blur-xl focus:outline-none focus:border-action-primary focus:bg-panel-input transition-all font-black placeholder:text-ink-muted/40 shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                    autofocus
                />
                <button 
                    type="submit"
                    :disabled="isLocked || !inputWord.trim()"
                    class="absolute right-3 top-1/2 -translate-y-1/2 bg-action-primary hover:bg-action-hover text-white p-4 rounded-3xl font-black transition-colors disabled:opacity-0 shadow-game-btn border-2 border-white/20 active:scale-95"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="w-7 h-7">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                </button>
            </form>
            
            <p v-if="hasSubmitted" class="mt-6 text-action-primary font-black uppercase tracking-widest animate-pulse text-sm">
                ¡Palabra enviada! Esperando al resto...
            </p>
            <p v-else-if="timeRemaining <= 0" class="mt-6 text-action-error font-black uppercase tracking-widest text-sm">
                ¡Tiempo agotado!
            </p>
        </div>

        <!-- BOTTOM: Social Grid (Feedback visual) -->
        <div class="w-full max-w-4xl mt-auto pb-4 pt-12">
            <h3 class="text-[10px] uppercase tracking-[0.2em] text-ink-muted font-black text-center mb-6">Estado de la Tripulación</h3>
            
            <div class="flex flex-wrap justify-center gap-6">
                <div v-for="player in activePlayers" :key="player.id" 
                     class="flex flex-col items-center relative transition-all duration-300"
                     :class="{ 'opacity-50 grayscale pointer-events-none': isPlayerDead(player.id) }">
                    <div class="w-16 h-16 rounded-full bg-panel-input border-4 border-white/10 flex items-center justify-center text-3xl shadow-sm relative z-10 overflow-hidden">
                        {{ player.avatar || '👤' }}
                        
                        <!-- Ícono de Calavera para muertos -->
                        <div v-if="isPlayerDead(player.id)" class="absolute inset-0 flex items-center justify-center bg-panel-base/80 backdrop-blur-[1px]">
                            <span class="text-2xl drop-shadow-md">💀</span>
                        </div>
                    </div>
                    <span class="text-xs text-ink-soft mt-2 font-black uppercase tracking-wider max-w-[80px] truncate bg-panel-input/60 px-2 py-0.5 rounded-full border border-white/10">{{ player.id === myUserId ? 'Tú' : player.name }}</span>
                    
                    <!-- Checkmark Badge for submitted word -->
                    <div v-if="!isPlayerDead(player.id) && hasPlayerTypingCompleted(player.id)" 
                         class="absolute -top-1 -right-1 bg-action-primary text-white w-7 h-7 rounded-full flex items-center justify-center border-2 border-white/10 shadow-sm z-10 scale-in">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                          <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                        </svg>
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
</style>
