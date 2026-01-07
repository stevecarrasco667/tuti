<script setup lang="ts">
import { ref, watch } from 'vue';
import { generateRoomId } from '../utils/random';
import { useGame } from '../composables/useGame';

const emit = defineEmits(['navigate']);
const { joinGame, myUserName, myUserAvatar } = useGame();

const showJoinInput = ref(false);
const joinCode = ref('');
// Initialize with persisted name, sync back on input
const playerName = ref(myUserName.value);

// Avatar Logic
const AVATARS = ['🦁', '🐯', '🐼', '🐸', '🐙', '🤖', '👽', '👻', '🤡', '💀', '🤠', '🎃'];

// We now use myUserAvatar directly which is already persisted in useGame
const selectedAvatar = myUserAvatar;

watch(playerName, (val: string) => {
    myUserName.value = val;
});

const handleCreateRoom = () => {
    if (!playerName.value.trim()) {
        alert('Por favor ingresa tu nombre primero');
        return;
    }
    const roomId = generateRoomId();
    joinGame(playerName.value, roomId, selectedAvatar.value);
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
</script>

<template>
    <div class="max-w-md mx-auto bg-indigo-900/40 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10 text-center relative overflow-hidden transition-all duration-300 hover:shadow-violet-900/20">
        
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
</template>
