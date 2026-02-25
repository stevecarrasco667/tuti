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



const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
        'LOBBY': '⏳ Esperando',
        'PLAYING': '🎮 Jugando',
        'REVIEW': '📋 Revisión',
        'RESULTS': '📊 Resultados',
        'GAME_OVER': '🏁 Finalizado',
        'ROLE_REVEAL': '🕵️ Impostor',
        'TYPING': '🕵️ Impostor',
        'VOTING': '🕵️ Impostor'
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
            <div class="bg-panel-base rounded-3xl p-8 shadow-game-panel border-[3px] border-white/50 relative overflow-hidden">
                <!-- Logo -->
                <h1 class="text-4xl sm:text-5xl font-black text-center mb-2 tracking-tight">
                    <span class="text-white drop-shadow-md">
                        TUTI PARTY
                    </span>
                </h1>
                <p class="text-center text-ink-soft text-sm mb-8 font-bold">
                    <span v-if="publicRooms.length > 0" class="text-action-primary">🟢 {{ publicRooms.length }} sala{{ publicRooms.length !== 1 ? 's' : '' }} activa{{ publicRooms.length !== 1 ? 's' : '' }}</span>
                    <span v-else>El juego de palabras más rápido</span>
                </p>

                <!-- PRIMARY ACTION BUTTONS -->
                <div class="grid grid-cols-2 gap-3">
                    <button
                        @click="handleCreateRoom(true)"
                        class="py-5 px-4 bg-action-blue hover:bg-blue-500 text-white font-black text-lg rounded-2xl transform transition-all hover:scale-[1.02] active:scale-[0.98] shadow-game-btn flex items-center justify-center gap-2 border-[3px] border-blue-400"
                    >
                        <span class="text-xl">🌐</span> Sala Pública
                    </button>
                    <button
                        @click="handleCreateRoom(false)"
                        class="py-5 px-4 bg-tuti-teal hover:bg-teal-300 text-ink-main font-black text-lg rounded-2xl transform transition-all hover:scale-[1.02] active:scale-[0.98] shadow-game-btn flex items-center justify-center gap-2 border-[3px] border-white/60"
                    >
                        <span class="text-xl">🔒</span> Sala Privada
                    </button>
                </div>

                <!-- Tertiary: Join by Code -->
                <button
                    @click="showJoinInput = !showJoinInput"
                    class="w-full mt-4 py-3 px-4 bg-panel-card hover:bg-white text-action-blue font-bold text-sm rounded-xl transition-all border-2 border-white flex items-center justify-center gap-2 shadow-sm"
                >
                    <span class="text-base">🔑</span> Tengo un Código de Sala
                </button>

                <!-- JOIN CODE INPUT (Collapsible) -->
                <div v-if="showJoinInput" class="mt-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    <div>
                        <label class="block text-xs font-bold text-ink-soft mb-2 text-left uppercase tracking-widest">Código de Sala</label>
                        <input
                            v-model="joinCode"
                            @keyup.enter="handleJoinRoom"
                            type="text"
                            maxlength="4"
                            class="w-full px-4 py-4 bg-panel-input border-2 border-panel-card focus:border-action-cyan rounded-xl text-ink-main placeholder-ink-muted transition-all text-center text-3xl font-mono tracking-[0.2em] font-black uppercase outline-none shadow-inner"
                            placeholder="ABCD"
                        >
                    </div>
                    <div class="flex gap-3">
                        <button @click="showJoinInput = false" class="flex-1 py-3 bg-panel-modal hover:bg-white text-ink-soft font-bold rounded-xl transition-all border-2 border-white">Cancelar</button>
                        <button @click="handleJoinRoom" class="flex-1 py-3 bg-action-primary hover:bg-action-hover text-white font-black rounded-xl shadow-game-btn transition-all active:scale-[0.98] border-2 border-green-400/50">Unirse</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ═══════════════════════════════════════════════ -->
        <!-- COLUMN RIGHT: Identity & Social Radar          -->
        <!-- ═══════════════════════════════════════════════ -->
        <div class="lg:col-span-3 space-y-5">
            
            <!-- IDENTITY CARD -->
            <div class="bg-panel-base rounded-3xl p-5 shadow-game-panel border-[3px] border-white/50">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xs font-black text-ink-main uppercase tracking-widest">Tu Identidad</h3>
                    <button @click="isEditingProfile = !isEditingProfile" class="text-[10px] font-bold text-action-blue bg-white/50 hover:bg-white px-2 py-1 rounded border border-white/60 transition-colors uppercase">
                        {{ isEditingProfile ? 'Guardar' : 'Editar' }}
                    </button>
                </div>

                <div class="flex items-center gap-4">
                    <!-- Avatar Button/Display -->
                    <div class="relative group flex-none">
                        <div class="w-16 h-16 sm:w-20 sm:h-20 bg-panel-input border-[3px] border-white rounded-2xl flex items-center justify-center text-4xl shadow-sm transition-transform group-hover:scale-105 overflow-hidden">
                            {{ selectedAvatar }}
                        </div>
                    </div>

                    <!-- Name Display/Input -->
                    <div class="flex-1 min-w-0">
                        <p class="text-ink-soft text-[10px] font-bold tracking-wider uppercase mb-1">Nombre Público</p>
                        <input v-if="isEditingProfile"
                            v-model="playerName"
                            type="text"
                            class="w-full bg-panel-input border-2 border-panel-card rounded-lg px-3 py-2 text-ink-main font-black text-lg focus:outline-none focus:border-action-cyan shadow-inner"
                            placeholder="Tu nombre..."
                            maxlength="12"
                        >
                        <p v-else class="text-2xl sm:text-3xl font-black text-ink-main truncate tracking-tight">{{ playerName }}</p>
                    </div>
                </div>

                <!-- Avatar Grid Selection (Hidden by default) -->
                <div v-show="isEditingProfile" class="mt-4 pt-4 border-t border-white/50 grid grid-cols-6 gap-2 animate-in fade-in slide-in-from-top-2">
                    <button v-for="avatar in AVATARS" :key="avatar"
                        @click="selectedAvatar = avatar"
                        class="aspect-square flex items-center justify-center text-2xl rounded-xl transition-all border-2"
                        :class="selectedAvatar === avatar ? 'bg-panel-card border-action-blue scale-110 shadow-sm' : 'bg-panel-input border-transparent hover:border-white/50 opacity-60 hover:opacity-100'"
                    >
                        {{ avatar }}
                    </button>
                </div>
            </div>

            <!-- ACTIVE ROOMS RADAR -->
            <div class="bg-panel-base rounded-3xl border-[3px] border-white/50 shadow-game-panel flex flex-col overflow-hidden max-h-[400px]">
                <div class="p-4 border-b border-white/50 bg-panel-card/50 flex items-center justify-between sticky top-0 z-10">
                    <h3 class="text-xs font-black text-ink-main uppercase tracking-widest flex items-center gap-2">
                        📡 Radar de Salas
                    </h3>
                    <button 
                        @click="handleRefresh" 
                        class="text-action-blue hover:text-blue-700 transition-colors p-1"
                        :class="{ 'animate-spin': isRefreshing }"
                    >
                        ↻
                    </button>
                </div>

                <div class="flex-1 overflow-y-auto p-3 space-y-2 relative min-h-[150px]">
                    
                    <div v-if="publicRooms.length === 0 && !isRefreshing" class="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                        <span class="text-4xl mb-3 opacity-20">👻</span>
                        <p class="text-ink-soft font-bold text-sm">No hay salas públicas ahora.</p>
                        <p class="text-ink-muted text-[10px] font-bold mt-1">¡Crea una y sé el anfitrión!</p>
                    </div>

                    <!-- Room Item -->
                    <button
                        v-for="room in publicRooms" :key="room.id"
                        @click="handleJoinPublicRoom(room.id)"
                        class="w-full bg-panel-card hover:bg-white p-3 rounded-2xl border-2 border-white/50 hover:border-action-cyan transition-all text-left flex items-center justify-between group shadow-sm"
                    >
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-panel-base border-2 border-white flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition-transform">
                                👑
                            </div>
                            <div>
                                <h4 class="text-ink-main font-black text-sm tracking-tight">{{ room.hostName }}</h4>
                                <div class="flex items-center gap-2 mt-0.5">
                                    <span class="text-[9px] font-bold text-ink-muted uppercase flex items-center gap-1">
                                        <span class="w-1.5 h-1.5 rounded-full" :class="room.status === 'LOBBY' ? 'bg-emerald-400' : 'bg-amber-400'"></span>
                                        {{ getStatusLabel(room.status) }}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-black bg-panel-input px-2 py-1 rounded-lg text-ink-soft border border-white">
                                {{ room.currentPlayers }}/{{ room.maxPlayers }}
                            </span>
                            <span class="text-action-blue opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">→</span>
                        </div>
                    </button>
                    <!-- /Room Item -->

                </div>
            </div>

        </div>
    </div>
</template>
