<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { generateRoomId } from '../utils/random';
import { useGame } from '../composables/useGame';
import { useLobby } from '../composables/useLobby';

const emit = defineEmits(['navigate']);
const { joinGame, myUserName, myUserAvatar } = useGame();
const { publicRooms, connect, refreshRooms } = useLobby();

const showJoinInput = ref(false);
const joinCode = ref('');
const isPublicRoom = ref(false);
const isRefreshing = ref(false);
// Initialize with persisted name, sync back on input
const playerName = ref(myUserName.value);

// Avatar Logic
const AVATARS = ['🦁', '🐯', '🐼', '🐸', '🐙', '🤖', '👽', '👻', '🤡', '💀', '🤠', '🎃'];

// We now use myUserAvatar directly which is already persisted in useGame
const selectedAvatar = myUserAvatar;

watch(playerName, (val: string) => {
    myUserName.value = val;
});

// [Phoenix Lobby] Connect to orchestrator on mount
onMounted(() => {
    connect();
});

const handleCreateRoom = () => {
    if (!playerName.value.trim()) {
        alert('Por favor ingresa tu nombre primero');
        return;
    }
    const roomId = generateRoomId();
    joinGame(playerName.value, roomId, selectedAvatar.value, isPublicRoom.value || undefined);
    emit('navigate', 'LOBBY');
};

const handleJoinRoom = () => {
    if (!playerName.value.trim()) {
        alert('Por favor ingresa tu nombre primero');
        return;
    }
    if (!joinCode.value.trim() || joinCode.value.length !== 4) {
        alert('Código de sala inválido');
        return;
    }
    joinGame(playerName.value, joinCode.value.toUpperCase(), selectedAvatar.value);
    emit('navigate', 'LOBBY');
};

const handleJoinPublicRoom = (roomId: string) => {
    if (!playerName.value.trim()) {
        alert('Por favor ingresa tu nombre primero');
        return;
    }
    joinGame(playerName.value, roomId, selectedAvatar.value);
    emit('navigate', 'LOBBY');
};

const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
        'LOBBY': '⏳ Esperando',
        'PLAYING': '🎮 Jugando',
        'REVIEW': '📋 Revisión',
        'RESULTS': '📊 Resultados',
        'GAME_OVER': '🏁 Finalizado'
    };
    return map[status] || status;
};

const handleRefresh = () => {
    isRefreshing.value = true;
    refreshRooms();
    setTimeout(() => isRefreshing.value = false, 500);
};
</script>

<template>
    <div class="max-w-md mx-auto space-y-6">
        <!-- MAIN CARD -->
        <div class="bg-indigo-900/40 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10 text-center relative overflow-hidden transition-all duration-300 hover:shadow-violet-900/20">
            
            <!-- Decoration -->
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fuchsia-500 via-yellow-400 to-fuchsia-500 opacity-60"></div>
            
            <h2 class="text-3xl font-black text-white mb-8 tracking-tight drop-shadow-md">Bienvenido</h2>

            <!-- AVATAR SELECTOR -->
            <div class="mb-6">
                <label class="block text-xs font-bold text-indigo-300 mb-2 text-left uppercase tracking-widest">Elige tu Avatar</label>
                <div class="grid grid-cols-6 gap-2 bg-black/20 p-3 rounded-2xl border border-white/5 shadow-inner">
                    <button 
                        v-for="avatar in AVATARS" 
                        :key="avatar"
                        @click="selectedAvatar = avatar"
                        class="text-2xl hover:scale-125 transition-transform p-1 rounded-full relative"
                        :class="selectedAvatar === avatar ? 'bg-indigo-500/30 shadow-[0_0_15px_rgba(250,204,21,0.2)] scale-110' : 'opacity-60 hover:opacity-100 grayscale hover:grayscale-0'"
                    >
                        {{ avatar }}
                        <span v-if="selectedAvatar === avatar" class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.8)]"></span>
                    </button>
                </div>
            </div>

            <!-- NAME INPUT (Always required) -->
            <div class="mb-8 relative group">
                <label class="block text-xs font-bold text-indigo-300 mb-2 text-left uppercase tracking-widest">Tu Nombre</label>
                <div class="relative">
                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-2xl filter drop-shadow-md transition-transform group-focus-within:scale-110">{{ selectedAvatar }}</span>
                    <input 
                        v-model="playerName"
                        type="text" 
                        class="w-full pl-14 pr-4 py-4 bg-black/20 border-b-2 border-white/10 rounded-t-xl focus:bg-black/40 focus:border-yellow-400 focus:shadow-[0_4px_15px_-5px_rgba(250,204,21,0.2)] text-white placeholder-white/20 transition-all text-left text-lg font-bold outline-none"
                        placeholder="¿Cómo te llamas?"
                    >
                </div>
            </div>

            <!-- ACTION BUTTONS -->
            <div v-if="!showJoinInput" class="space-y-4">
                <!-- Public Room Toggle -->
                <label class="flex items-center justify-between px-4 py-3 bg-black/20 rounded-xl border border-white/5 cursor-pointer group hover:bg-black/30 transition-colors">
                    <span class="text-sm font-bold text-indigo-300 group-hover:text-indigo-200 transition-colors">🌐 Crear como Sala Pública</span>
                    <div class="relative">
                        <input type="checkbox" v-model="isPublicRoom" class="sr-only peer">
                        <div class="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-fuchsia-500 transition-colors"></div>
                        <div class="absolute left-[2px] top-[2px] w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-md"></div>
                    </div>
                </label>

                <button 
                    @click="handleCreateRoom"
                    class="w-full py-4 px-6 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black rounded-2xl transform transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(236,72,153,0.3)] flex items-center justify-center gap-3 active:scale-[0.98] border border-white/10"
                >
                    <span class="text-2xl drop-shadow-md">✨</span> Crear Nueva Sala
                </button>

                <button 
                    @click="showJoinInput = true"
                    class="w-full py-4 px-6 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 hover:text-white font-bold rounded-2xl transform transition-all border border-indigo-500/30 hover:border-indigo-400/50 flex items-center justify-center gap-3 backdrop-blur-sm"
                >
                    <span class="text-2xl drop-shadow-md">👋</span> Unirse a Sala
                </button>
            </div>

            <!-- JOIN INPUT -->
            <div v-else class="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div>
                    <label class="block text-xs font-bold text-indigo-300 mb-2 text-left uppercase tracking-widest">Código de Sala</label>
                    <input 
                        v-model="joinCode"
                        @keyup.enter="handleJoinRoom"
                        type="text" 
                        maxlength="4"
                        class="w-full px-4 py-4 bg-black/20 border-b-2 border-white/10 rounded-t-xl focus:bg-black/40 focus:border-yellow-400 focus:shadow-[0_4px_15px_-5px_rgba(250,204,21,0.2)] text-white placeholder-white/20 transition-all text-center text-3xl font-mono tracking-[0.2em] font-bold uppercase outline-none"
                        placeholder="ABCD"
                    >
                </div>
                <div class="flex gap-3 pt-2">
                    <button 
                        @click="showJoinInput = false"
                        class="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white/60 font-bold rounded-xl transition-all border border-white/5"
                    >
                        Cancelar
                    </button>
                    <button 
                        @click="handleJoinRoom"
                        class="flex-[2] py-3 px-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black rounded-xl transition-all shadow-lg active:scale-[0.98]"
                    >
                        Entrar
                    </button>
                </div>
            </div>
        </div>

        <!-- PUBLIC ROOMS BROWSER -->
        <div class="bg-indigo-900/40 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10 relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500 opacity-60"></div>
            
            <h3 class="text-lg font-black text-white mb-4 flex items-center gap-2">
                <span class="text-xl">🌐</span> Salas Públicas en Vivo
                <span v-if="publicRooms.length > 0" class="text-xs font-bold bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full border border-emerald-500/30">
                    {{ publicRooms.length }} activa{{ publicRooms.length !== 1 ? 's' : '' }}
                </span>
                <button
                    @click="handleRefresh"
                    class="ml-auto p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-indigo-300 hover:text-white transition-all border border-white/5"
                    title="Refrescar salas"
                >
                    <span class="text-sm inline-block transition-transform" :class="{ 'animate-spin': isRefreshing }">🔄</span>
                </button>
            </h3>

            <!-- Empty State -->
            <div v-if="publicRooms.length === 0" class="text-center py-8">
                <p class="text-4xl mb-3">🏜️</p>
                <p class="text-indigo-300/60 text-sm font-medium">No hay salas públicas en este momento.</p>
                <p class="text-indigo-400/40 text-xs mt-1">¡Crea una con el toggle de arriba!</p>
            </div>

            <!-- Room Cards -->
            <div v-else class="space-y-3">
                <div 
                    v-for="room in publicRooms" 
                    :key="room.id"
                    class="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 hover:border-white/10 transition-all group"
                >
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-white font-bold text-sm truncate">{{ room.hostName }}</span>
                            <span class="text-[10px] font-mono text-indigo-400/50 bg-indigo-500/10 px-1.5 py-0.5 rounded">{{ room.id }}</span>
                        </div>
                        <div class="flex items-center gap-3 text-xs text-indigo-300/60">
                            <span>👥 {{ room.currentPlayers }}/{{ room.maxPlayers }}</span>
                            <span>{{ getStatusLabel(room.status) }}</span>
                        </div>
                    </div>
                    <button
                        @click="handleJoinPublicRoom(room.id)"
                        class="ml-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black rounded-xl transition-all shadow-lg active:scale-[0.95] group-hover:shadow-emerald-500/20"
                    >
                        Unirse
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
