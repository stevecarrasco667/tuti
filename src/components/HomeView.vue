<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { generateRoomId, generateRandomName } from '../utils/random';
import { useGame } from '../composables/useGame';
import { useLobby } from '../composables/useLobby';

const emit = defineEmits(['navigate']);
const { joinGame, myUserName, myUserAvatar } = useGame();
const { publicRooms, connect, refreshRooms } = useLobby();

const joinCode = ref('');
const isRefreshing = ref(false);

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
    <div class="container mx-auto px-4 py-8 max-w-6xl">

        <!-- ═══ HEADER ═══ -->
        <header class="flex justify-center items-center mb-12">
            <h1 class="text-6xl md:text-8xl font-black italic tracking-tighter animate-bounce-slow drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] cursor-default select-none">
                <span class="text-white">TUTI</span>
                <span class="text-brand-lime">GAMES</span>
            </h1>
        </header>

        <!-- ═══ MAIN BENTO GRID ═══ -->
        <main class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            <!-- ═══ LEFT COLUMN: Player Setup ═══ -->
            <section class="lg:col-span-3 flex flex-col gap-6">

                <!-- Avatar & Name Card -->
                <div class="glass-card rounded-[2.5rem] p-8 flex flex-col items-center text-center">
                    <h2 class="text-2xl font-black mb-6 uppercase tracking-tight">Tu Avatar</h2>

                    <!-- Avatar Selector -->
                    <div class="relative group cursor-pointer mb-6">
                        <div class="w-28 h-28 rounded-full border-4 border-brand-lime overflow-hidden bg-brand-deep flex items-center justify-center transition-transform group-hover:scale-105">
                            <span class="text-5xl">{{ selectedAvatar }}</span>
                        </div>
                    </div>

                    <!-- Avatar Grid -->
                    <div class="grid grid-cols-6 gap-2 bg-brand-deep/30 p-3 rounded-2xl border border-white/5 shadow-inner mb-6 w-full">
                        <button
                            v-for="avatar in AVATARS"
                            :key="avatar"
                            @click="selectedAvatar = avatar"
                            class="text-2xl hover:scale-125 transition-transform p-1 rounded-full relative"
                            :class="selectedAvatar === avatar ? 'bg-brand-purple/40 shadow-[0_0_15px_rgba(163,230,53,0.3)] scale-110' : 'opacity-50 hover:opacity-100 grayscale hover:grayscale-0'"
                        >
                            {{ avatar }}
                            <span v-if="selectedAvatar === avatar" class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-brand-lime rounded-full shadow-[0_0_8px_rgba(163,230,53,0.8)]"></span>
                        </button>
                    </div>

                    <!-- Name Input -->
                    <div class="w-full">
                        <label class="block text-sm font-bold uppercase mb-2 opacity-80" for="player-name">Nombre</label>
                        <input
                            id="player-name"
                            v-model="playerName"
                            type="text"
                            class="w-full bg-brand-deep/50 border-4 border-brand-deep rounded-2xl p-4 text-center font-black text-xl focus:ring-0 focus:border-brand-lime transition-colors outline-none"
                            placeholder="Escribe tu nombre..."
                        />
                    </div>
                </div>

                <!-- Join with Code Card -->
                <div class="glass-card rounded-[2.5rem] p-8">
                    <h2 class="text-2xl font-black mb-6 uppercase tracking-tight text-center">Tengo un Código</h2>
                    <div class="flex flex-col gap-4">
                        <input
                            v-model="joinCode"
                            @keyup.enter="handleJoinRoom"
                            type="text"
                            maxlength="4"
                            class="w-full rounded-full bg-white/10 border-none px-6 py-4 text-center font-bold tracking-widest placeholder:text-white/30 focus:ring-2 focus:ring-brand-purple outline-none uppercase"
                            placeholder="ABCD"
                        />
                        <button
                            @click="handleJoinRoom"
                            class="w-full py-4 bg-brand-purple rounded-full font-black text-lg hover:bg-brand-purple/80 transition-all uppercase tracking-wider"
                        >
                            Unirse
                        </button>
                    </div>
                </div>
            </section>

            <!-- ═══ CENTER COLUMN: Hero Action ═══ -->
            <section class="lg:col-span-5 flex flex-col gap-6">
                <div class="glass-card rounded-[2.5rem] p-8 flex flex-col items-center justify-center min-h-[450px] text-center bg-gradient-to-br from-white/10 to-transparent">
                    <div class="mb-10">
                        <h2 class="text-4xl font-black mb-4 leading-none uppercase tracking-tighter">¿Listo para la acción?</h2>
                        <p class="text-lg font-bold opacity-80">
                            <span v-if="publicRooms.length > 0" class="text-brand-lime">🟢 {{ publicRooms.length }} sala{{ publicRooms.length !== 1 ? 's' : '' }} activa{{ publicRooms.length !== 1 ? 's' : '' }}</span>
                            <span v-else>Elige tu modo de juego y empieza a jugar</span>
                        </p>
                    </div>

                    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
                        <!-- Create Public Room -->
                        <button
                            @click="handleCreateRoom(true)"
                            class="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] bg-gradient-to-b from-orange-400 to-red-600 shadow-[0_10px_0_0_#991b1b] active:shadow-[0_4px_0_0_#991b1b] active:translate-y-2 transition-all duration-100"
                        >
                            <span class="text-4xl mb-1 group-hover:scale-110 transition-transform">🌍</span>
                            <span class="text-xl font-black text-white leading-tight uppercase">Crear Sala<br />Pública</span>
                            <span class="text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full">TODO EL MUNDO</span>
                        </button>

                        <!-- Create Private Room -->
                        <button
                            @click="handleCreateRoom(false)"
                            class="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] bg-gradient-to-b from-indigo-400 to-purple-600 shadow-[0_10px_0_0_#4c1d95] active:shadow-[0_4px_0_0_#4c1d95] active:translate-y-2 transition-all duration-100"
                        >
                            <span class="text-4xl mb-1 group-hover:scale-110 transition-transform">🔒</span>
                            <span class="text-xl font-black text-white leading-tight uppercase">Crear Sala<br />Privada</span>
                            <span class="text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full">SOLO AMIGOS</span>
                        </button>
                    </div>
                </div>
            </section>

            <!-- ═══ RIGHT COLUMN: Public Rooms Sidebar ═══ -->
            <section class="lg:col-span-4 h-full">
                <div class="glass-card rounded-[2.5rem] p-6 h-full flex flex-col">

                    <!-- Header -->
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-lg font-black uppercase tracking-wider">Salas Públicas</h3>
                        <div class="flex items-center gap-2">
                            <span v-if="publicRooms.length > 0" class="flex items-center gap-2 text-[10px] font-bold bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
                                <span class="relative flex h-2 w-2">
                                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                {{ publicRooms.length }} ACTIVA{{ publicRooms.length !== 1 ? 'S' : '' }}
                            </span>
                            <button
                                @click="handleRefresh"
                                class="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all border border-white/5"
                                title="Refrescar salas"
                            >
                                <span class="text-sm inline-block transition-transform" :class="{ 'animate-spin': isRefreshing }">🔄</span>
                            </button>
                        </div>
                    </div>

                    <!-- Empty State -->
                    <div v-if="publicRooms.length === 0" class="flex-1 flex flex-col items-center justify-center text-center py-10">
                        <p class="text-5xl mb-4">🏜️</p>
                        <p class="text-white/40 text-sm font-bold">No hay salas públicas.</p>
                        <p class="text-white/20 text-xs mt-2">¡Crea una con el botón gigante!</p>
                    </div>

                    <!-- Room Cards (Live Feed) -->
                    <div v-else class="overflow-y-auto pr-2 space-y-3 custom-scrollbar flex-1">
                        <div
                            v-for="room in publicRooms"
                            :key="room.id"
                            class="glass-card rounded-2xl p-4 border-l-4 border-brand-lime flex flex-col gap-3 transition-all"
                        >
                            <div class="flex justify-between items-start">
                                <div>
                                    <p class="text-[8px] font-bold opacity-50 uppercase">Host</p>
                                    <p class="font-black text-sm truncate">{{ room.hostName }}</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-[8px] font-bold opacity-50 uppercase">Players</p>
                                    <p class="font-black text-sm" :class="room.currentPlayers >= room.maxPlayers ? 'text-brand-pink' : 'text-brand-lime'">
                                        {{ room.currentPlayers }}/{{ room.maxPlayers }}
                                    </p>
                                </div>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-bold text-white/40">{{ getStatusLabel(room.status) }}</span>
                                <button
                                    @click="handleJoinPublicRoom(room.id)"
                                    class="px-4 py-2 bg-white/10 hover:bg-brand-lime hover:text-brand-deep rounded-xl font-black text-xs transition-all uppercase"
                                >
                                    {{ room.currentPlayers >= room.maxPlayers ? '👁️ Espectar' : '¡VAMOS!' }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </main>

        <!-- ═══ FOOTER ═══ -->
        <footer class="mt-16 text-center opacity-40 hover:opacity-100 transition-opacity">
            <p class="text-sm font-bold uppercase tracking-widest">
                © 2026 TUTI GAMES LABS • HECHO CON ❤️ PARA GAMERS
            </p>
        </footer>

    </div>
</template>
