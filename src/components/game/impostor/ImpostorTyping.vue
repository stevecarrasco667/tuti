<script setup lang="ts">
import { ref, computed } from 'vue';
import { ImpostorData, Player } from '../../../../shared/types';

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
const isImpostor = computed(() => props.impostorData.impostorIds.includes(props.myUserId));

const impostorAllies = computed(() => {
    if (!isImpostor.value) return [];
    const myId = props.myUserId;
    return props.impostorData.impostorIds
        .filter(id => id !== myId)
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
            <div class="bg-black/40 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-md">
                <span class="text-sm text-slate-400 uppercase tracking-widest block font-bold mb-1">Categoría</span>
                <span class="text-xl text-white font-bold">{{ impostorData.secretCategory }}</span>
            </div>
            
            <div class="bg-black/60 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-md flex flex-col items-center min-w-[120px]">
                 <span class="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Tiempo</span>
                 <span class="text-3xl font-mono font-black" :class="timerColor">{{ Math.max(0, timeRemaining) }}</span>
            </div>
        </div>

        <!-- BANNER DE FANTASMA -->
        <div v-if="isDead" class="w-full max-w-4xl mb-6 bg-slate-900/80 border border-slate-500/30 rounded-2xl px-6 py-4 backdrop-blur-md flex items-center justify-center gap-3">
            <span class="text-3xl animate-bounce">💀</span>
            <div class="text-center">
                <span class="text-slate-300 font-black text-sm uppercase tracking-widest block">Eres un Fantasma</span>
                <span class="text-slate-400 text-xs text-left">Observa el caos. Tus acciones ya no afectan este mundo.</span>
            </div>
        </div>

        <!-- HUD DE IDENTIDAD -->
        <div class="w-full max-w-4xl mb-8 px-2 transition-opacity duration-500" :class="{ 'opacity-50 grayscale pointer-events-none': isDead }">
            <div v-if="isImpostor"
                 class="bg-red-950/60 border border-red-500/30 rounded-2xl px-6 py-3 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                <div class="flex items-center gap-3">
                    <span class="text-2xl">⚠️</span>
                    <div>
                        <span class="text-red-400 font-black text-sm uppercase tracking-widest block text-left">Eres Impostor</span>
                        <span class="text-white/70 text-sm ml-2" v-if="!isDead">Categoría: <strong class="text-red-300">{{ impostorData.secretCategory }}</strong></span>
                    </div>
                </div>
                <div v-if="impostorAllies.length > 0" class="flex flex-col items-end">
                    <span class="text-red-500/80 text-[10px] uppercase font-black tracking-widest">Tus Aliados:</span>
                    <span class="text-red-300 font-bold text-sm">{{ impostorAllies.join(', ') }}</span>
                </div>
            </div>
            <div v-else
                 class="bg-cyan-950/40 border border-cyan-500/20 rounded-2xl px-6 py-3 backdrop-blur-md flex items-center gap-3 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                <span class="text-2xl">💡</span>
                <div>
                    <span class="text-cyan-400 font-black text-sm uppercase tracking-widest text-left block">Eres Tripulante</span>
                    <span class="text-white/70 text-sm ml-2" v-if="!isDead">La palabra es: <strong class="text-cyan-300">{{ impostorData.secretWord }}</strong></span>
                </div>
            </div>
        </div>

        <!-- CENTER: Main Input Area -->
        <div class="flex-1 w-full flex flex-col justify-center items-center max-w-2xl px-4">
            <h2 class="text-2xl md:text-3xl text-white font-light text-center mb-8 drop-shadow-md">
                Escribe una palabra que te camufle...
            </h2>
            
            <form @submit.prevent="submitWord" class="w-full relative group">
                <input 
                    type="text" 
                    v-model="inputWord"
                    :disabled="isLocked"
                    placeholder="Tu palabra aquí..."
                    class="w-full bg-white/5 border-2 border-white/20 text-white text-center text-4xl py-6 px-12 rounded-3xl backdrop-blur-xl focus:outline-none focus:border-indigo-400 focus:bg-white/10 transition-all font-black placeholder:text-white/20 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                    autofocus
                />
                <button 
                    type="submit"
                    :disabled="isLocked || !inputWord.trim()"
                    class="absolute right-4 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-xl font-bold transition-colors disabled:opacity-0"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-6 h-6">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                </button>
            </form>
            
            <p v-if="hasSubmitted" class="mt-6 text-green-400 font-bold animate-pulse text-lg">
                ¡Palabra enviada! Esperando al resto...
            </p>
            <p v-else-if="timeRemaining <= 0" class="mt-6 text-red-400 font-bold text-lg">
                ¡Tiempo agotado!
            </p>
        </div>

        <!-- BOTTOM: Social Grid (Feedback visual) -->
        <div class="w-full max-w-4xl mt-auto pb-4 pt-12">
            <h3 class="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold text-center mb-6">Estado de la Tripulación</h3>
            
            <div class="flex flex-wrap justify-center gap-6">
                <div v-for="player in activePlayers" :key="player.id" 
                     class="flex flex-col items-center relative transition-all duration-300"
                     :class="{ 'opacity-40 grayscale pointer-events-none': isPlayerDead(player.id) }">
                    <div class="w-14 h-14 rounded-full bg-gradient-to-b from-indigo-500 to-indigo-700 border-2 border-white/20 flex items-center justify-center text-2xl shadow-xl relative z-10 ring-2 ring-white/10 overflow-hidden">
                        {{ player.avatar || '👤' }}
                        
                        <!-- Ícono de Calavera para muertos -->
                        <div v-if="isPlayerDead(player.id)" class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
                            <span class="text-2xl drop-shadow-md">💀</span>
                        </div>
                    </div>
                    <span class="text-xs text-white/50 mt-2 font-medium max-w-[80px] truncate">{{ player.id === myUserId ? 'Tú' : player.name }}</span>
                    
                    <!-- Checkmark Badge for submitted word -->
                    <div v-if="!isPlayerDead(player.id) && hasPlayerTypingCompleted(player.id)" 
                         class="absolute -top-2 -right-2 bg-green-500 text-black w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-black shadow-[0_0_10px_rgba(34,197,94,0.6)] z-10 scale-in">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
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
