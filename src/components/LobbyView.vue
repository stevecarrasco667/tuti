<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGame } from '../composables/useGame';

const { gameState, joinGame } = useGame();
const playerName = ref('');
const hasJoined = ref(false);

const currentPlayer = computed(() => {
    return gameState.value.players.find(p => p.name === playerName.value);
});

const handleJoin = () => {
    if (!playerName.value.trim()) return;
    joinGame(playerName.value);
    hasJoined.value = true;
};
</script>

<template>
    <div class="max-w-md mx-auto bg-white/10 backdrop-blur-lg rounded-xl p-8 shadow-2xl border border-white/20">
        <!-- HEADER -->
        <div class="text-center mb-8">
            <h2 class="text-3xl font-bold text-white mb-2">Sala de Espera</h2>
            <div class="inline-block px-3 py-1 rounded-full bg-purple-500/30 text-purple-200 text-sm">
                {{ gameState.players.length }} Jugadores Conectados
            </div>
        </div>

        <!-- STATE 1: JOIN FORM -->
        <div v-if="!hasJoined" class="space-y-6">
            <div>
                <label class="block text-sm font-medium text-purple-200 mb-2">Tu Nombre</label>
                <input 
                    v-model="playerName"
                    @keyup.enter="handleJoin"
                    type="text" 
                    class="w-full px-4 py-3 bg-black/30 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 transition-all"
                    placeholder="Escribe tu nombre..."
                >
            </div>
            <button 
                @click="handleJoin"
                class="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-lg transform transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
            >
                Entrar a la Sala
            </button>
        </div>

        <!-- STATE 2: PLAYER LIST -->
        <div v-else class="space-y-6">
            <div class="space-y-3">
                <div 
                    v-for="player in gameState.players" 
                    :key="player.id"
                    class="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 transition-all hover:bg-black/30"
                >
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm">
                            {{ player.name.charAt(0).toUpperCase() }}
                        </div>
                        <span class="text-white font-medium">
                            {{ player.name }}
                            <span v-if="player.name === playerName" class="text-xs text-purple-300 ml-2">(Tú)</span>
                        </span>
                    </div>
                    <span v-if="player.isHost" class="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                        👑 HOST
                    </span>
                </div>
            </div>

            <div class="pt-4 border-t border-white/10 text-center">
                <p v-if="currentPlayer?.isHost" class="text-green-400 font-medium animate-pulse">
                    ¡Eres el anfitrión! Iniciar partida (Pronto...)
                </p>
                <p v-else class="text-gray-400 text-sm animate-pulse">
                    Esperando al anfitrión para comenzar...
                </p>
            </div>
        </div>
    </div>
</template>
