<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { generateRoomId, generateRandomName } from '../utils/random';
import { useGame } from '../composables/useGame';
import { useLobby } from '../composables/useLobby';

const emit = defineEmits(['navigate']);
const { joinGame, myUserName, myUserAvatar } = useGame();
const { publicRooms, connect, refreshRooms } = useLobby();

const showJoinInput = ref(false);
const joinCode = ref('');
const isPublicRoom = ref(false);
const isRefreshing = ref(false);
const isEditingProfile = ref(false);

// Avatar Pool
const AVATARS = ['🦁', '🐯', '🐼', '🐸', '🐙', '🤖', '👽', '👻', '🤡', '💀', '🤠', '🎃'];

// Initialize with persisted name, sync back on input
const playerName = ref(myUserName.value);
const selectedAvatar = myUserAvatar;

watch(playerName, (val: string) => {
    myUserName.value = val;
});

// [Phoenix Lobby] Connect + Zero Friction Identity
onMounted(() => {
    connect();

    // Auto-assign identity if empty
    if (!myUserName.value.trim()) {
        const randomName = generateRandomName();
        playerName.value = randomName;
        myUserName.value = randomName;
    }
    if (!myUserAvatar.value || myUserAvatar.value === '🦁') {
        const randomAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
        selectedAvatar.value = randomAvatar;
    }
});

// --- Action Handlers ---

const handleCreateRoom = (asPublic = false) => {
    isPublicRoom.value = asPublic;
    const roomId = generateRoomId();
    joinGame(playerName.value, roomId, selectedAvatar.value, asPublic || undefined);
    emit('navigate', 'LOBBY');
};

const handleJoinRoom = () => {
    if (!joinCode.value.trim() || joinCode.value.length !== 4) {
        alert('Código de sala inválido');
        return;
    }
    joinGame(playerName.value, joinCode.value.toUpperCase(), selectedAvatar.value);
    emit('navigate', 'LOBBY');
};

const handleJoinPublicRoom = (roomId: string) => {
    joinGame(playerName.value, roomId, selectedAvatar.value);
    emit('navigate', 'LOBBY');
};

const handleQuickPlay = () => {
    if (publicRooms.value.length > 0) {
        // Join first available lobby room
        const lobby = publicRooms.value.find(r => r.status === 'LOBBY');
        if (lobby) {
            handleJoinPublicRoom(lobby.id);
            return;
        }
    }
    // No rooms available — create a new public one
    handleCreateRoom(true);
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
    <div class="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-7 gap-6 px-4">

        <!-- ═══════════════════════════════════════════════ -->
        <!-- COLUMN LEFT: "LA CONSOLA" (Main Action Hub)    -->
        <!-- ═══════════════════════════════════════════════ -->
        <div class="lg:col-span-4 space-y-5">

            <!-- HERO: Logo + Quick Play -->
            <div class="bg-indigo-900/40 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-red-500 opacity-80"></div>

                <!-- Logo -->
                <h1 class="text-4xl sm:text-5xl font-black text-center mb-2 tracking-tight">
                    <span class="bg-gradient-to-r from-amber-300 via-orange-400 to-red-400 bg-clip-text text-transparent drop-shadow-lg">
                        TUTI PARTY
                    </span>
                </h1>
                <p class="text-center text-indigo-300/60 text-sm mb-8 font-medium">
                    <span v-if="publicRooms.length > 0" class="text-emerald-400">🟢 {{ publicRooms.length }} sala{{ publicRooms.length !== 1 ? 's' : '' }} activa{{ publicRooms.length !== 1 ? 's' : '' }}</span>
                    <span v-else>El juego de palabras más rápido</span>
                </p>

                <!-- PRIMARY ACTION BUTTONS -->
                <div class="grid grid-cols-2 gap-3">
                    <button
                        @click="handleCreateRoom(true)"
                        class="py-5 px-4 bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 hover:from-amber-500 hover:via-orange-400 hover:to-red-400 text-white font-black text-lg rounded-2xl transform transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_25px_rgba(251,146,60,0.3)] hover:shadow-[0_0_35px_rgba(251,146,60,0.5)] flex items-center justify-center gap-2 border border-white/10"
                    >
                        <span class="text-xl">🌐</span> Sala Pública
                    </button>
                    <button
                        @click="handleCreateRoom(false)"
                        class="py-5 px-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:via-violet-500 hover:to-purple-500 text-white font-black text-lg rounded-2xl transform transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_25px_rgba(124,58,237,0.3)] hover:shadow-[0_0_35px_rgba(124,58,237,0.5)] flex items-center justify-center gap-2 border border-white/10"
                    >
                        <span class="text-xl">🔒</span> Sala Privada
                    </button>
                </div>

                <!-- Tertiary: Join by Code -->
                <button
                    @click="showJoinInput = !showJoinInput"
                    class="w-full mt-3 py-3 px-4 bg-white/5 hover:bg-white/10 text-indigo-300 hover:text-white font-bold text-sm rounded-xl transition-all border border-white/5 hover:border-white/10 flex items-center justify-center gap-2"
                >
                    <span class="text-base">🔑</span> Tengo un Código de Sala
                </button>

                <!-- JOIN CODE INPUT (Collapsible) -->
                <div v-if="showJoinInput" class="mt-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
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
                    <div class="flex gap-3">
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

            <!-- EL PASAPORTE (Identity Card) -->
            <div class="bg-indigo-900/40 backdrop-blur-xl rounded-3xl p-5 shadow-2xl border border-white/10 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fuchsia-500 via-violet-400 to-fuchsia-500 opacity-60"></div>

                <!-- Collapsed: Identity Preview -->
                <div
                    v-if="!isEditingProfile"
                    class="flex items-center gap-4 cursor-pointer group"
                    @click="isEditingProfile = true"
                >
                    <div class="text-4xl filter drop-shadow-lg group-hover:scale-110 transition-transform">{{ selectedAvatar }}</div>
                    <div class="flex-1 min-w-0">
                        <p class="text-xs font-bold text-indigo-300/60 uppercase tracking-widest mb-0.5">Tu Identidad</p>
                        <p class="text-white font-black text-lg truncate">{{ playerName || 'Sin nombre' }}</p>
                    </div>
                    <button
                        class="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-indigo-300 hover:text-white text-xs font-bold rounded-lg transition-all border border-white/5"
                    >
                        ✏️ Editar
                    </button>
                </div>

                <!-- Expanded: Edit Mode -->
                <div v-else class="space-y-4 animate-in fade-in duration-200">
                    <div class="flex items-center justify-between">
                        <p class="text-xs font-bold text-indigo-300 uppercase tracking-widest">Editar Perfil</p>
                        <button
                            @click="isEditingProfile = false"
                            class="px-3 py-1 bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold rounded-lg transition-all"
                        >
                            ✓ Listo
                        </button>
                    </div>

                    <!-- Name Input -->
                    <div class="relative group">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-2xl filter drop-shadow-md transition-transform group-focus-within:scale-110">{{ selectedAvatar }}</span>
                        <input
                            v-model="playerName"
                            type="text"
                            class="w-full pl-14 pr-4 py-3.5 bg-black/20 border-b-2 border-white/10 rounded-t-xl focus:bg-black/40 focus:border-yellow-400 focus:shadow-[0_4px_15px_-5px_rgba(250,204,21,0.2)] text-white placeholder-white/20 transition-all text-left text-lg font-bold outline-none"
                            placeholder="Tu nombre..."
                        >
                    </div>

                    <!-- Avatar Grid -->
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
            </div>
        </div>

        <!-- ═══════════════════════════════════════════════ -->
        <!-- COLUMN RIGHT: "EL TERMINAL" (Public Rooms)     -->
        <!-- ═══════════════════════════════════════════════ -->
        <div class="lg:col-span-3">
            <div class="bg-indigo-900/40 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10 relative overflow-hidden lg:sticky lg:top-6">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500 opacity-60"></div>

                <h3 class="text-lg font-black text-white mb-4 flex items-center gap-2">
                    <span class="text-xl">🌐</span> Salas en Vivo
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
                <div v-if="publicRooms.length === 0" class="text-center py-10">
                    <p class="text-4xl mb-3">🏜️</p>
                    <p class="text-indigo-300/60 text-sm font-medium">No hay salas públicas.</p>
                    <p class="text-indigo-400/40 text-xs mt-1">¡Usa ⚡ Partida Rápida para crear una!</p>
                </div>

                <!-- Room Cards -->
                <div v-else class="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
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
    </div>
</template>
