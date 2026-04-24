<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { generateRoomId, generateRandomName } from '../utils/random';
import { useGame } from '../composables/useGame';
import { useLobby } from '../composables/useLobby';
import { useAuth } from '../composables/useAuth';
import { useToast } from '../composables/useToast';
import { AVATARS } from '../constants/avatars';
import TCard from './ui/TCard.vue';
import TButton from './ui/TButton.vue';
import TInput from './ui/TInput.vue';
import PrivacyBanner from './ui/PrivacyBanner.vue';

const { joinGame, myUserName, myUserAvatar } = useGame();
const { filteredRooms, lobbyFilters, connect, refreshRooms, quickMatch } = useLobby();
const { user, isAuthenticated, isLoading, signInWithGoogle, signOut } = useAuth();
const { addToast } = useToast();

const showJoinInput = ref(false);
const joinCode = ref('');
const isPublicRoom = ref(false);
const isRefreshing = ref(false);
const isEditingProfile = ref(false);
const isQuickMatching = ref(false);

const playerName = computed({
    get: () => myUserName.value,
    set: (val: string) => { myUserName.value = val; },
});
const selectedAvatar = myUserAvatar;

onMounted(() => {
    connect();
    if (!myUserName.value.trim()) myUserName.value = generateRandomName();
    if (!myUserAvatar.value || myUserAvatar.value === '🦁') {
        selectedAvatar.value = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    }
});

watch(user, (newUser) => {
    if (newUser) {
        myUserName.value = newUser.user_metadata.full_name || newUser.user_metadata.name || myUserName.value;
    }
}, { immediate: true });

const handleCreateRoom = (asPublic = false) => {
    isPublicRoom.value = asPublic;
    const roomId = generateRoomId();
    joinGame(playerName.value, roomId, selectedAvatar.value, asPublic || undefined);
};

const handleJoinRoom = () => {
    if (!joinCode.value.trim() || joinCode.value.length !== 4) {
        addToast('Código de sala inválido', 'error');
        return;
    }
    joinGame(playerName.value, joinCode.value.toUpperCase(), selectedAvatar.value);
};

const handleJoinPublicRoom = (roomId: string) => {
    joinGame(playerName.value, roomId, selectedAvatar.value);
};

const handleClearData = () => {
    if (typeof localStorage !== 'undefined') {
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('tuti-')) localStorage.removeItem(key);
        }
    }
    window.location.reload();
};

const handleRefresh = () => {
    isRefreshing.value = true;
    refreshRooms();
    setTimeout(() => isRefreshing.value = false, 500);
};

const handleQuickMatch = async () => {
    isQuickMatching.value = true;
    await new Promise(r => setTimeout(r, 400));
    const room = quickMatch();
    isQuickMatching.value = false;
    if (room) {
        handleJoinPublicRoom(room.id);
    } else {
        addToast('No hay salas disponibles. ¡Crea una!', 'info');
    }
};

const REGION_LABELS: Record<string, string> = { SA:'🌎 LATAM', NA:'🇺🇸 Norteamérica', EU:'🇪🇺 Europa', AS:'🌏 APAC', AF:'🌍 África' };
const LANG_LABELS: Record<string, string> = { es:'🇪🇸 Español', en:'🇬🇧 Inglés', pt:'🇧🇷 Portugués' };
const MODE_LABELS: Record<string, string> = { CLASSIC:'🔤 Clásico', IMPOSTOR:'🕵️ Impostor' };

const getStatusInfo = (room: any) => {
    const inGame = !['LOBBY'].includes(room.status);
    if (!room.joinable) return { label: 'LLENA', color: 'text-red-400 bg-red-400/10 border-red-400/30' };
    if (inGame) return { label: `En Juego · R${room.currentRound}/${room.roundsTotal}`, color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' };
    return { label: 'Disponible', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' };
};

const fillPercent = (room: any) => Math.round((room.currentPlayers / room.maxPlayers) * 100);
</script>

<template>
    <div class="w-full flex flex-col items-center justify-start sm:justify-center p-4 min-h-full overflow-y-auto">

        <!-- AUTH BANNER -->
        <div class="w-full max-w-5xl mx-auto mb-6">
            <div v-if="isLoading" class="flex justify-center h-10 items-center">
                <span class="animate-pulse text-ink-muted text-xs font-bold tracking-widest uppercase">Cargando Identidad...</span>
            </div>
            <div v-else-if="!isAuthenticated" class="bg-panel-card/40 border-2 border-white/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl backdrop-blur-sm">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-panel-base border-2 border-action-primary flex items-center justify-center text-xl shadow-inner bg-gradient-to-br from-action-primary/20 to-panel-input/20">⭐</div>
                    <div class="text-left hidden sm:block">
                        <h4 class="text-white font-black text-sm tracking-tight drop-shadow-md">Únete al Metajuego</h4>
                        <p class="text-ink-muted text-[10px] font-bold uppercase tracking-wider">Inicia sesión para reclamar tu nombre y beneficios</p>
                    </div>
                </div>
                <button @click="signInWithGoogle" class="w-full sm:w-auto bg-white hover:bg-white/90 text-panel-base px-4 py-2.5 rounded-xl font-bold uppercase tracking-wide text-xs shadow-glow-primary active:scale-95 transition-all flex items-center justify-center gap-2 border-[3px] border-white">
                    <svg class="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z" /></svg>
                    Iniciar con Google
                </button>
            </div>
            <div v-else class="bg-panel-card border-2 border-white/10 rounded-2xl p-3 flex items-center justify-between gap-4 shadow-lg">
                <div class="flex items-center gap-3">
                    <img v-if="user?.user_metadata.avatar_url" :src="user.user_metadata.avatar_url" class="w-10 h-10 rounded-xl border-2 border-action-primary shadow-sm" alt="Avatar">
                    <div v-else class="w-10 h-10 rounded-xl bg-panel-base border-2 border-action-primary flex items-center justify-center text-lg shadow-inner">👤</div>
                    <div class="text-left">
                        <p class="text-ink-soft text-[9px] font-black uppercase tracking-widest text-action-primary flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 text-action-primary"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>
                            Verificado
                        </p>
                        <h4 class="text-white font-black text-sm tracking-tight truncate max-w-[150px] sm:max-w-none">{{ user?.user_metadata.full_name || user?.email }}</h4>
                    </div>
                </div>
                <button @click="signOut" class="text-ink-muted hover:text-red-400 bg-white/5 hover:bg-red-400/10 px-3 py-2 rounded-lg font-bold text-xs transition-colors">Cerrar sesión</button>
            </div>
        </div>

        <div class="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-7 gap-6 lg:gap-8 min-h-0">

            <!-- LEFT: Consola -->
            <div class="lg:col-span-4 flex flex-col gap-5 justify-center">
                <TCard padding="lg" class="shadow-2xl border-[3px] border-white/10 relative overflow-hidden">
                    <div class="absolute -top-24 -right-24 w-64 h-64 bg-action-blue/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div class="relative z-10">
                        <h1 class="text-6xl sm:text-7xl lg:text-[5rem] font-display text-center mb-1 tracking-wider uppercase leading-none">
                            <span class="text-transparent bg-clip-text bg-gradient-to-br from-action-primary via-action-warning to-action-error drop-shadow-md">TUTI GAMES</span>
                        </h1>
                        <p class="text-center font-ui tracking-widest uppercase text-[10px] sm:text-xs text-ink-muted mb-8 font-black">
                            <span v-if="filteredRooms.length > 0" class="text-action-success px-3 py-1 bg-action-success/10 rounded-full border border-action-success/20 shadow-glow-success animate-pulse">🟢 {{ filteredRooms.length }} sala{{ filteredRooms.length !== 1 ? 's' : '' }} activa{{ filteredRooms.length !== 1 ? 's' : '' }}</span>
                            <span v-else class="text-ink-soft">El juego de palabras más rápido</span>
                        </p>
                    </div>
                    <div class="flex flex-col sm:grid sm:grid-cols-2 gap-3">
                        <TButton variant="primary" size="lg" @click="handleCreateRoom(true)"><span class="text-xl">🔥</span> Sala Pública</TButton>
                        <TButton variant="secondary" size="lg" @click="handleCreateRoom(false)"><span class="text-xl">🔒</span> Sala Privada</TButton>
                    </div>
                    <TButton variant="secondary" size="md" class="w-full mt-4" @click="showJoinInput = !showJoinInput">
                        <span class="text-base">🔑</span> Tengo un Código de Sala
                    </TButton>
                    <div v-if="showJoinInput" class="mt-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                        <div>
                            <label class="block text-xs font-bold text-ink-soft mb-2 text-left uppercase tracking-widest">Código de Sala</label>
                            <TInput v-model="joinCode" variant="code" placeholder="ABCD" :maxlength="4" @keyup.enter="handleJoinRoom" aria-label="Código de sala" />
                        </div>
                        <div class="flex gap-3">
                            <TButton variant="ghost" size="md" class="flex-1" @click="showJoinInput = false">Cancelar</TButton>
                            <TButton variant="primary" size="md" class="flex-1" @click="handleJoinRoom">Unirse</TButton>
                        </div>
                    </div>
                </TCard>

                <TCard padding="md">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xs font-black text-ink-main uppercase tracking-widest flex items-center gap-1">
                            Tu Identidad
                            <span v-if="!isAuthenticated" title="Inicia sesión para editar tu nombre" class="cursor-help w-4 h-4 rounded-full bg-panel-input flex items-center justify-center text-[10px] font-bold ml-1 border border-white/5">?</span>
                        </h3>
                        <button v-if="isAuthenticated" @click="isEditingProfile = !isEditingProfile" class="text-[10px] font-bold text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/10 transition-colors uppercase">{{ isEditingProfile ? 'Guardar' : 'Editar' }}</button>
                        <button v-else @click="signInWithGoogle" class="text-[10px] font-bold text-action-blue opacity-80 hover:opacity-100 uppercase underline">Personalizar</button>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="relative group flex-none">
                            <div class="w-16 h-16 sm:w-20 sm:h-20 bg-panel-input border-[3px] border-white/10 rounded-2xl flex items-center justify-center text-4xl shadow-sm transition-transform group-hover:scale-105 overflow-hidden">{{ selectedAvatar }}</div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-ink-soft text-[10px] font-bold tracking-wider uppercase mb-1">Nombre Público</p>
                            <div v-if="!isAuthenticated" class="group flex items-center justify-between bg-panel-base/50 p-3 rounded-xl border-2 border-transparent">
                                <span class="text-2xl sm:text-3xl font-black text-ink-muted truncate tracking-tight">{{ playerName }}</span>
                                <span class="text-[10px] text-action-error font-bold uppercase ml-2 opacity-80 select-none hidden sm:inline-block">Requiere Login</span>
                            </div>
                            <TInput v-else-if="isEditingProfile" v-model="playerName" placeholder="Tu nombre..." :maxlength="20" input-class="rounded-lg py-2 text-lg" aria-label="Tu nombre público" />
                            <div v-else class="flex flex-col">
                                <p class="text-2xl sm:text-3xl font-black text-ink-main truncate tracking-tight">{{ playerName }}</p>
                            </div>
                        </div>
                    </div>
                    <div v-show="isEditingProfile" class="mt-4 pt-4 border-t border-white/10 grid grid-cols-6 gap-2 animate-in fade-in slide-in-from-top-2">
                        <button v-for="avatar in AVATARS" :key="avatar" @click="selectedAvatar = avatar"
                            class="aspect-square flex items-center justify-center text-2xl rounded-xl transition-all border-2"
                            :class="selectedAvatar === avatar ? 'bg-panel-card border-action-primary scale-110 shadow-sm' : 'bg-panel-input border-transparent hover:border-white/10 opacity-60 hover:opacity-100'"
                            :aria-label="`Seleccionar avatar ${avatar}`">{{ avatar }}</button>
                    </div>
                    <div v-if="!isAuthenticated" class="mt-4 pt-4 border-t border-white/10 flex justify-end">
                        <button @click="handleClearData" class="text-[10px] font-bold text-action-error/70 hover:text-action-error uppercase transition-colors">Limpiar mis datos locales</button>
                    </div>
                </TCard>
            </div>

            <!-- RIGHT: Server Browser -->
            <div class="lg:col-span-3 flex flex-col min-h-0">
                <TCard padding="none" class="flex flex-col overflow-hidden flex-1 min-h-[400px] max-h-[min(700px,80vh)] border-[3px] border-white/10 shadow-game-panel">

                    <!-- Header & Quick Match -->
                    <div class="p-4 border-b-2 border-white/10 bg-panel-card/90 flex-none relative overflow-hidden">
                        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-action-primary/5 to-transparent pointer-events-none"></div>
                        <button
                            id="quick-match-btn"
                            @click="handleQuickMatch"
                            :disabled="isQuickMatching"
                            class="w-full relative group overflow-hidden rounded-2xl p-4 font-black uppercase tracking-widest transition-all active:scale-95 border-[3px]"
                            :class="isQuickMatching
                                ? 'bg-panel-input border-white/10 text-ink-muted cursor-not-allowed'
                                : 'bg-action-primary border-action-warning text-panel-base hover:brightness-110 shadow-glow-primary hover:shadow-glow-warning'"
                        >
                            <div v-if="!isQuickMatching" class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-30"></div>
                            <div class="relative flex items-center justify-center gap-3">
                                <span class="text-3xl" :class="{ 'animate-pulse': isQuickMatching }">{{ isQuickMatching ? '⏳' : '⚡' }}</span>
                                <span class="text-lg">{{ isQuickMatching ? 'Buscando Partida...' : 'Partida Rápida' }}</span>
                            </div>
                        </button>
                    </div>

                    <!-- Filter Bar (Segmented Controls) -->
                    <div class="p-4 border-b-2 border-white/10 bg-panel-base/80 flex-none space-y-4">
                        <div class="flex items-center justify-between">
                            <h3 class="text-[10px] font-black text-ink-main uppercase tracking-widest flex items-center gap-2">
                                📡 Servidores Públicos
                                <span class="bg-action-blue/20 text-action-blue border border-action-blue/30 px-2 py-0.5 rounded-md text-[9px]">{{ filteredRooms.length }}</span>
                            </h3>
                            <button @click="handleRefresh" class="text-ink-muted hover:text-white transition-colors flex items-center gap-1 text-[9px] font-bold uppercase bg-white/5 px-2 py-1 rounded-md" :class="{ 'opacity-50 cursor-not-allowed': isRefreshing }">
                                <span :class="{ 'animate-spin': isRefreshing }">↻</span> Recargar
                            </button>
                        </div>

                        <!-- Ocultar llenas -->
                        <div class="flex items-center justify-between bg-panel-card p-2 rounded-xl border border-white/5">
                            <span class="text-[9px] font-black uppercase text-ink-soft tracking-wider pl-2">Mostrar solo disponibles</span>
                            <button @click="lobbyFilters.onlyJoinable = !lobbyFilters.onlyJoinable" 
                                class="relative w-10 h-5 rounded-full transition-colors border"
                                :class="lobbyFilters.onlyJoinable ? 'bg-emerald-500 border-emerald-400' : 'bg-panel-input border-white/10'">
                                <div class="absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform"
                                    :class="lobbyFilters.onlyJoinable ? 'translate-x-5' : 'translate-x-0'"></div>
                            </button>
                        </div>

                        <!-- Modo -->
                        <div>
                            <span class="text-[8px] font-black text-ink-muted uppercase tracking-widest mb-1.5 block">Modo de Juego</span>
                            <div class="flex gap-1 bg-panel-input p-1 rounded-xl border border-white/5">
                                <button v-for="m in ['ALL','CLASSIC','IMPOSTOR']" :key="m"
                                    @click="lobbyFilters.mode = m as any"
                                    class="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                                    :class="lobbyFilters.mode === m ? 'bg-panel-card text-white shadow-sm border border-white/10' : 'text-ink-muted hover:text-ink-soft'"
                                >{{ m === 'ALL' ? 'Cualquiera' : MODE_LABELS[m] }}</button>
                            </div>
                        </div>

                        <!-- Región & Idioma (Grid) -->
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <span class="text-[8px] font-black text-ink-muted uppercase tracking-widest mb-1.5 block">Región</span>
                                <select v-model="lobbyFilters.region" class="w-full bg-panel-input border border-white/10 rounded-xl px-2 py-2 text-[10px] font-bold text-ink-main uppercase tracking-wider outline-none focus:border-action-blue appearance-none">
                                    <option value="ALL">🌐 Cualquiera</option>
                                    <option v-for="r in ['SA','NA','EU','AS']" :key="r" :value="r">{{ REGION_LABELS[r] }}</option>
                                </select>
                            </div>
                            <div>
                                <span class="text-[8px] font-black text-ink-muted uppercase tracking-widest mb-1.5 block">Idioma</span>
                                <select v-model="lobbyFilters.lang" class="w-full bg-panel-input border border-white/10 rounded-xl px-2 py-2 text-[10px] font-bold text-ink-main uppercase tracking-wider outline-none focus:border-action-blue appearance-none">
                                    <option value="ALL">💬 Cualquiera</option>
                                    <option v-for="l in ['es','en','pt']" :key="l" :value="l">{{ LANG_LABELS[l] }}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Room List -->
                    <div class="flex-1 overflow-y-auto p-4 space-y-3 relative min-h-[200px] bg-panel-base/50 scrollbar-thin">
                        <div v-if="filteredRooms.length === 0" class="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                            <div class="w-16 h-16 mb-4 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxwYXRoIGQ9Im0xNSA5LTMgM20wIDAgMyAzbS0zLTN2OG0wLTh2LTgiLz48L3N2Zz4=')] bg-contain bg-center bg-no-repeat"></div>
                            <p class="text-ink-soft font-black text-sm uppercase tracking-wider">Sin Resultados</p>
                            <p class="text-ink-muted text-[10px] font-bold mt-2">Ajusta los filtros o crea tu propia sala.</p>
                        </div>

                        <!-- Room Card (Arcade Ticket Style) -->
                        <div
                            v-for="room in filteredRooms" :key="room.id"
                            class="relative rounded-2xl border-[3px] p-1 transition-all overflow-hidden"
                            :class="room.joinable ? 'bg-panel-card border-white/10 hover:border-action-primary/50 group' : 'bg-panel-card/30 border-white/5 opacity-75'"
                        >
                            <!-- Inner Content -->
                            <div class="flex flex-col sm:flex-row bg-panel-base rounded-xl overflow-hidden h-full">
                                
                                <!-- Identidad y Datos -->
                                <div class="flex-1 p-3 flex items-center gap-3">
                                    <!-- Avatar -->
                                    <div class="w-12 h-12 rounded-xl bg-panel-input border-2 border-white/10 flex items-center justify-center text-2xl shadow-inner flex-none">
                                        {{ room.hostAvatar || '👑' }}
                                    </div>
                                    
                                    <div class="flex-1 min-w-0">
                                        <h4 class="text-white font-black text-sm sm:text-base tracking-tight truncate">{{ room.hostName }}</h4>
                                        <div class="flex flex-wrap gap-1.5 mt-1">
                                            <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-md"
                                                :class="room.mode === 'CLASSIC' ? 'text-action-blue bg-action-blue/10 border border-action-blue/20' : 'text-red-400 bg-red-400/10 border border-red-400/20'">
                                                {{ MODE_LABELS[room.mode] || room.mode }}
                                            </span>
                                            <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-md text-violet-400 bg-violet-400/10 border border-violet-400/20">
                                                {{ REGION_LABELS[room.region] || room.region }}
                                            </span>
                                            <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-md text-action-warning bg-action-warning/10 border border-action-warning/20">
                                                {{ LANG_LABELS[room.lang] || room.lang }}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Ocupación y Botón -->
                                <div class="flex sm:flex-col items-center justify-between sm:justify-center p-3 sm:w-32 bg-panel-card/50 border-t sm:border-t-0 sm:border-l border-white/5 gap-2 relative">
                                    
                                    <!-- Ocupación Integrada -->
                                    <div class="w-full text-center relative group-hover:scale-105 transition-transform origin-bottom">
                                        <div class="text-[10px] font-black uppercase tracking-widest mb-1" :class="getStatusInfo(room).color.split(' ')[0]">
                                            {{ getStatusInfo(room).label }}
                                        </div>
                                        <div class="h-6 bg-panel-input rounded-lg overflow-hidden border border-white/10 relative">
                                            <div class="absolute inset-y-0 left-0 transition-all duration-500 ease-out"
                                                :class="fillPercent(room) >= 100 ? 'bg-red-500/80' : fillPercent(room) >= 75 ? 'bg-amber-500/80' : 'bg-emerald-500/80'"
                                                :style="`width: ${fillPercent(room)}%`">
                                            </div>
                                            <div class="absolute inset-0 flex items-center justify-center text-[11px] font-black text-white drop-shadow-md">
                                                {{ room.currentPlayers }} / {{ room.maxPlayers }}
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Acción: Botón superpuesto en hover (solo escritorio) / Visible en móvil -->
                                    <div v-if="room.joinable" class="sm:absolute sm:inset-0 sm:bg-panel-base/90 sm:backdrop-blur-[2px] sm:flex sm:items-center sm:justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-all z-10 p-2 sm:p-0">
                                        <button @click="handleJoinPublicRoom(room.id)" class="w-full sm:w-auto px-4 py-2 bg-action-primary text-panel-base rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-glow-primary active:scale-95 transition-transform flex items-center justify-center gap-2">
                                            <span>Entrar</span>
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
                                        </button>
                                    </div>
                                    
                                    <div v-if="!room.joinable" class="absolute inset-0 bg-panel-base/60 backdrop-blur-[1px] z-10 flex items-center justify-center pointer-events-none overflow-hidden">
                                        <div class="border-2 border-red-500/50 text-red-500/80 font-black text-[10px] sm:text-xs uppercase tracking-widest px-3 py-1 rounded-lg transform -rotate-12 bg-panel-base/90 shadow-lg">
                                            {{ room.currentPlayers >= room.maxPlayers ? 'LLENA' : 'EN JUEGO' }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </TCard>
            </div>
        </div>

        <PrivacyBanner />
    </div>
</template>
