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

const REGION_LABELS: Record<string, string> = { SA:'🌎 LATAM', NA:'🇺🇸 NA', EU:'🇪🇺 EU', AS:'🌏 APAC', AF:'🌍 AF' };
const LANG_LABELS: Record<string, string> = { es:'🇪🇸 ES', en:'🇬🇧 EN', pt:'🇧🇷 PT' };
const MODE_LABELS: Record<string, string> = { CLASSIC:'🔤 Classic', IMPOSTOR:'🕵️ Impostor' };

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
                <TCard padding="none" class="flex flex-col overflow-hidden flex-1 min-h-[300px] max-h-[min(700px,80vh)]">

                    <!-- Header -->
                    <div class="p-3 border-b border-white/10 bg-panel-card/90 flex-none">
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center gap-2">
                                <h3 class="text-xs font-black text-ink-main uppercase tracking-widest">Salas Públicas</h3>
                                <span class="text-[9px] font-black bg-white/10 text-ink-muted px-1.5 py-0.5 rounded-full">{{ filteredRooms.length }}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <!-- Partida Rápida -->
                                <button
                                    id="quick-match-btn"
                                    @click="handleQuickMatch"
                                    :disabled="isQuickMatching"
                                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 border-2 shadow-lg"
                                    :class="isQuickMatching
                                        ? 'bg-action-primary/20 border-action-primary/30 text-action-primary/60 cursor-not-allowed'
                                        : 'bg-action-primary border-action-primary text-panel-base hover:brightness-110 shadow-glow-primary'"
                                >
                                    <span class="text-sm">{{ isQuickMatching ? '⏳' : '⚡' }}</span>
                                    {{ isQuickMatching ? 'Buscando...' : 'Partida Rápida' }}
                                </button>
                                <button @click="handleRefresh" class="text-action-blue hover:text-blue-400 transition-colors p-1.5 rounded-lg hover:bg-white/5" :class="{ 'animate-spin': isRefreshing }">↻</button>
                            </div>
                        </div>

                        <!-- Filter Bar -->
                        <div class="flex flex-wrap gap-1.5">
                            <!-- Disponibles toggle -->
                            <button
                                @click="lobbyFilters.onlyJoinable = !lobbyFilters.onlyJoinable"
                                class="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all"
                                :class="lobbyFilters.onlyJoinable
                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                    : 'bg-white/5 border-white/10 text-ink-muted hover:border-white/20'"
                            >
                                <span>{{ lobbyFilters.onlyJoinable ? '✓' : '○' }}</span> Disponibles
                            </button>

                            <!-- Modo -->
                            <div class="flex gap-1">
                                <button v-for="m in ['ALL','CLASSIC','IMPOSTOR']" :key="m"
                                    @click="lobbyFilters.mode = m as any"
                                    class="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all"
                                    :class="lobbyFilters.mode === m
                                        ? 'bg-action-blue/20 border-action-blue/40 text-action-blue'
                                        : 'bg-white/5 border-white/10 text-ink-muted hover:border-white/20'"
                                >{{ m === 'ALL' ? 'Modo' : m === 'CLASSIC' ? '🔤' : '🕵️' }}</button>
                            </div>

                            <!-- Región -->
                            <div class="flex gap-1">
                                <button v-for="r in ['ALL','SA','NA','EU','AS']" :key="r"
                                    @click="lobbyFilters.region = r"
                                    class="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all"
                                    :class="lobbyFilters.region === r
                                        ? 'bg-violet-500/20 border-violet-500/40 text-violet-400'
                                        : 'bg-white/5 border-white/10 text-ink-muted hover:border-white/20'"
                                >{{ r === 'ALL' ? '🌐' : REGION_LABELS[r]?.split(' ')[1] || r }}</button>
                            </div>

                            <!-- Idioma -->
                            <div class="flex gap-1">
                                <button v-for="l in ['ALL','es','en','pt']" :key="l"
                                    @click="lobbyFilters.lang = l"
                                    class="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all"
                                    :class="lobbyFilters.lang === l
                                        ? 'bg-action-warning/20 border-action-warning/40 text-action-warning'
                                        : 'bg-white/5 border-white/10 text-ink-muted hover:border-white/20'"
                                >{{ l === 'ALL' ? '💬' : LANG_LABELS[l] || l }}</button>
                            </div>
                        </div>
                    </div>

                    <!-- Room List -->
                    <div class="flex-1 overflow-y-auto p-3 space-y-2 relative min-h-[150px]">
                        <div v-if="filteredRooms.length === 0" class="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                            <span class="text-4xl mb-3 opacity-20">👻</span>
                            <p class="text-ink-soft font-bold text-sm">No hay salas que coincidan.</p>
                            <p class="text-ink-muted text-[10px] font-bold mt-1">Ajusta los filtros o ¡crea una sala!</p>
                        </div>

                        <!-- Room Card -->
                        <button
                            v-for="room in filteredRooms" :key="room.id"
                            @click="handleJoinPublicRoom(room.id)"
                            :disabled="!room.joinable"
                            class="w-full rounded-2xl border-2 p-3 text-left transition-all group"
                            :class="room.joinable
                                ? 'bg-panel-card hover:bg-panel-input border-white/10 hover:border-action-primary cursor-pointer'
                                : 'bg-panel-card/50 border-white/5 opacity-60 cursor-not-allowed'"
                        >
                            <div class="flex items-start gap-3">
                                <!-- Avatar -->
                                <div class="w-11 h-11 rounded-xl bg-panel-base border-2 border-white/10 flex items-center justify-center text-xl shadow-inner flex-none transition-transform"
                                    :class="{ 'group-hover:scale-110': room.joinable }">
                                    {{ room.hostAvatar || '👑' }}
                                </div>

                                <div class="flex-1 min-w-0">
                                    <!-- Row 1: name + players -->
                                    <div class="flex items-center justify-between gap-2">
                                        <h4 class="text-ink-main font-black text-sm tracking-tight truncate">{{ room.hostName }}</h4>
                                        <span class="text-[10px] font-black bg-panel-input px-2 py-0.5 rounded-lg text-ink-muted border border-white/10 flex-none">
                                            {{ room.currentPlayers }}/{{ room.maxPlayers }}
                                        </span>
                                    </div>

                                    <!-- Row 2: badges -->
                                    <div class="flex items-center gap-1 mt-1 flex-wrap">
                                        <span class="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border"
                                            :class="room.mode === 'CLASSIC' ? 'text-action-blue border-action-blue/30 bg-action-blue/10' : 'text-red-400 border-red-400/30 bg-red-400/10'">
                                            {{ MODE_LABELS[room.mode] || room.mode }}
                                        </span>
                                        <span class="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border text-violet-400 border-violet-400/30 bg-violet-400/10">
                                            {{ REGION_LABELS[room.region] || room.region }}
                                        </span>
                                        <span class="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border text-action-warning border-action-warning/30 bg-action-warning/10">
                                            {{ LANG_LABELS[room.lang] || room.lang }}
                                        </span>
                                    </div>

                                    <!-- Row 3: status -->
                                    <div class="flex items-center justify-between mt-1.5">
                                        <span class="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border"
                                            :class="getStatusInfo(room).color">
                                            {{ getStatusInfo(room).label }}
                                        </span>
                                        <span v-if="room.joinable" class="text-action-primary opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 text-sm">→</span>
                                    </div>

                                    <!-- Row 4: fill bar -->
                                    <div class="mt-2 h-1 bg-panel-input rounded-full overflow-hidden">
                                        <div class="h-full rounded-full transition-all duration-500"
                                            :class="fillPercent(room) >= 100 ? 'bg-red-500' : fillPercent(room) >= 75 ? 'bg-amber-500' : 'bg-emerald-500'"
                                            :style="`width: ${fillPercent(room)}%`">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </button>
                    </div>
                </TCard>
            </div>
        </div>

        <PrivacyBanner />
    </div>
</template>
