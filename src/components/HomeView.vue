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
import GlobalLanguageSelector from './ui/GlobalLanguageSelector.vue';
import { useI18n } from 'vue-i18n';
import { useMeta } from '../composables/useMeta';
import { useAnalytics } from '../composables/useAnalytics';
import AdBanner from './ui/AdBanner.vue';
import { useAds } from '../composables/useAds';
import { useSound } from '../composables/useSound';
import { useProfile } from '../composables/useProfile';
import { usePlayerHistory } from '../composables/usePlayerHistory';
import AvatarWrapper from './ui/AvatarWrapper.vue';
import CoinIcon from './ui/CoinIcon.vue';


const { joinGame, myUserName, myUserAvatar } = useGame();
const { filteredRooms, lobbyFilters, connect, refreshRooms } = useLobby();
const { user, isAuthenticated, isLoading, signInWithGoogle, signOut } = useAuth();
const { addToast } = useToast();
const { t } = useI18n();
const { coins, equippedFrame } = useProfile();
const { getStats } = usePlayerHistory();
const { resetMeta } = useMeta();

const stats = ref<any>(null);
const coinDifference = ref<number>(0);
const triggerCoinAnim = ref(false);

const playerLevel = computed(() => {
    if (!stats.value) return 1;
    return 1 + Math.floor(((stats.value.wins || 0) * 3 + (stats.value.gamesPlayed || 0)) / 5);
});

const levelTier = computed(() => {
    const lvl = playerLevel.value;
    if (lvl >= 10) return 'gold';
    if (lvl >= 5) return 'silver';
    return 'bronze';
});

const ringClass = computed(() => {
    const tier = levelTier.value;
    if (tier === 'gold') return 'ring-tier-gold';
    if (tier === 'silver') return 'ring-tier-silver';
    return 'ring-tier-bronze';
});

watch(coins, async (newVal, oldVal) => {
    if (oldVal !== undefined && newVal !== undefined && newVal > oldVal) {
        coinDifference.value = newVal - oldVal;
        triggerCoinAnim.value = true;
        setTimeout(() => {
            triggerCoinAnim.value = false;
        }, 1200);
    }
    stats.value = await getStats();
}, { immediate: true });

const { trackHomeView, trackRoomCreated, trackRoomJoined } = useAnalytics();
const { initAds } = useAds();
const { isMuted, toggleMute } = useSound();

const showJoinInput = ref(false);
const joinCode = ref('');
const isPublicRoom = ref(false);
const isRefreshing = ref(false);
const isEditingProfile = ref(false);

const playerName = computed({
    get: () => myUserName.value,
    set: (val: string) => { myUserName.value = val; },
});
const selectedAvatar = myUserAvatar;

onMounted(() => {
    initAds(); // Inicializar el módulo publicitario y el Kill Switch
    connect();
    if (!myUserName.value.trim()) myUserName.value = generateRandomName();
    if (!myUserAvatar.value || myUserAvatar.value === '🦁') {
        selectedAvatar.value = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    }
    // Restaurar metadatos de la página de inicio al volver desde una sala
    resetMeta();
    // [PostHog] Evento de inicio del funnel
    trackHomeView();
});

watch(user, (newUser) => {
    if (newUser) {
        myUserName.value = newUser.user_metadata.full_name || newUser.user_metadata.name || myUserName.value;
    }
}, { immediate: true });

const handleCreateRoom = (asPublic = false) => {
    isPublicRoom.value = asPublic;
    const roomId = generateRoomId();
    // [PostHog] Primer paso del funnel de conversión
    trackRoomCreated({ mode: 'CLASSIC', is_public: asPublic });
    joinGame(playerName.value, roomId, selectedAvatar.value, asPublic || undefined);
};

const handleJoinRoom = () => {
    if (!joinCode.value.trim() || joinCode.value.length !== 4) {
        addToast(t('system.invalidCode'), 'error');
        return;
    }
    // [PostHog] Intento de unión por código
    trackRoomJoined({ method: 'code' });
    joinGame(playerName.value, joinCode.value.toUpperCase(), selectedAvatar.value);
};

const handleJoinPublicRoom = (roomId: string) => {
    // [PostHog] Unión desde lista pública
    trackRoomJoined({ method: 'public_list' });
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

const REGION_LABELS = computed<Record<string, string>>(() => ({ SA:`🌎 ${t('common.regions.sa')}`, NA:`🇺🇸 ${t('common.regions.na')}`, EU:`🇪🇺 ${t('common.regions.eu')}`, AS:`🌏 ${t('common.regions.as')}`, AF:`🌍 ${t('common.regions.af')}` }));
const LANG_LABELS = computed<Record<string, string>>(() => ({ es:`🇪🇸 ${t('common.languages.es')}`, en:`🇬🇧 ${t('common.languages.en')}`, pt:`🇧🇷 ${t('common.languages.pt')}` }));
const MODE_LABELS = computed<Record<string, string>>(() => ({ CLASSIC:`🔤 ${t('common.modes.classic')}`, IMPOSTOR:`🕵️ ${t('common.modes.impostor')}` }));

const getStatusInfo = (room: any) => {
    const inGame = !['LOBBY'].includes(room.status);
    if (!room.joinable) return { label: t('home.full'), color: 'text-red-400 bg-red-400/10 border-red-400/30' };
    if (inGame) return { label: `${t('home.inGame')} · R${room.currentRound}/${room.roundsTotal}`, color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' };
    return { label: t('home.available'), color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' };
};

</script>

<template>
    <!-- main original con scroll y centrado perfectos (sin wrappers que alteren el flexbox) -->
    <!-- Agregamos relative para servir de ancla al posicionamiento absoluto de banners -->
    <main class="w-full flex flex-col items-center justify-start p-4 min-h-full overflow-y-auto relative z-20"
          aria-label="Página principal de TutiGame — Jugar Tutti Frutti Online Gratis">

        <!-- HUD de Configuración Rápida en Móviles -->
        <div class="md:hidden w-full flex justify-end gap-3 px-4 pt-2 pb-0 z-30 select-none">
            <!-- Botón Mute móvil -->
            <button
                @click="toggleMute"
                class="w-10 h-10 flex items-center justify-center rounded-xl bg-panel-card/80 border border-white/10 text-white active:scale-95 shadow-sm"
                :title="isMuted ? t('app.unmuteSound') : t('app.muteSound')"
            >
                <svg v-if="!isMuted" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 opacity-85">
                    <path d="M9.348 14.651l-2.853-2.852H4V8.201h2.495l2.853-2.852v9.302zM15.536 10a5.002 5.002 0 00-2.316-4.195v8.39A5.002 5.002 0 0015.536 10z" />
                    <path d="M12.22 3.102v13.796A7.003 7.003 0 0018.5 10a7.003 7.003 0 00-6.28-6.898z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 opacity-50 text-red-400">
                    <path fill-rule="evenodd" d="M9.383 3.076a.75.75 0 011.066.079l.067.086 5.86 8.371a.75.75 0 01-1.127.949l-.067-.086-1.503-2.148H12v3.633a.75.75 0 01-1.077.677l-4.14-2.192H4a2 2 0 01-2-2V9.5a2 2 0 011.66-1.972l.34-.028h1.841l4.14-2.192a.75.75 0 011.402.399l.001 5.863L9.304 3.14a.75.75 0 01.079-1.064zM16.53 4.47a.75.75 0 011.06 0l1.94 1.94 1.94-1.94a.75.75 0 111.06 1.06L20.59 7.47l1.94 1.94a.75.75 0 11-1.06 1.06l-1.94-1.94-1.94 1.94a.75.75 0 01-1.06-1.06l1.94-1.94-1.94-1.94a.75.75 0 010-1.06z" clip-rule="evenodd" />
                </svg>
            </button>
            <GlobalLanguageSelector />
        </div>

        <div class="max-w-[960px] mx-auto w-full grid grid-cols-1 lg:grid-cols-7 gap-10 lg:gap-16 min-h-0 mt-6 sm:mt-8 transform transition-transform duration-300">

            <!-- LEFT: Consola -->
            <div class="lg:col-span-4 flex flex-col gap-5 justify-center">
                <TCard padding="lg" class="shadow-3d-panel relative overflow-hidden">
                    <div class="absolute -top-24 -right-24 w-64 h-64 bg-action-info/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div class="relative z-10">
                        <h1 class="animate-float text-6xl sm:text-7xl lg:text-[5rem] font-display text-center mb-1 tracking-wider uppercase leading-none">
                            <span class="text-transparent bg-clip-text bg-gradient-to-br from-game-yellow via-game-red to-action-info drop-shadow-md">TUTI GAMES</span>
                        </h1>
                        <!-- Texto para bots de Google: invisible visualmente, rico en keywords -->
                        <p class="sr-only">
                            Juega Tutti Frutti Online gratis con tus amigos. El clásico juego de basta en línea,
                            multijugador en tiempo real. Crea una sala privada o únete a una pública sin registro.
                            Perfecto para jugar en Discord, WhatsApp o en cualquier videollamada.
                            Alternativa gratuita a Stopots y BastaOnline.
                        </p>
                        <p class="text-center font-ui tracking-widest uppercase text-[10px] sm:text-xs text-ink-muted mb-8 font-black">
                            <span v-if="filteredRooms.length > 0" class="text-action-success px-3 py-1 bg-action-success/10 rounded-full border border-action-success/20 shadow-glow-success animate-pulse">🟢 {{ t('home.activeRooms', { count: filteredRooms.length }, filteredRooms.length) }}</span>
                            <span v-else class="text-ink-soft">{{ t('home.slogan') }}</span>
                        </p>
                    </div>
                    <div class="flex flex-col sm:grid sm:grid-cols-2 gap-3">
                        <TButton variant="primary" size="lg" @click="handleCreateRoom(true)"><span class="text-xl">🔥</span> {{ t('home.publicRoom') }}</TButton>
                        <TButton variant="secondary" size="lg" @click="handleCreateRoom(false)"><span class="text-xl">🔒</span> {{ t('home.privateRoom') }}</TButton>
                    </div>
                    <TButton variant="secondary" size="md" class="w-full mt-4" @click="showJoinInput = !showJoinInput">
                        <span class="text-base">🔑</span> {{ t('home.haveCode') }}
                    </TButton>
                    <div v-if="showJoinInput" class="mt-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                        <div>
                            <label class="block text-xs font-bold text-ink-soft mb-2 text-left uppercase tracking-widest">{{ t('home.roomCode') }}</label>
                            <TInput v-model="joinCode" variant="code" placeholder="ABCD" :maxlength="4" @keyup.enter="handleJoinRoom" aria-label="Código de sala" />
                        </div>
                        <div class="flex gap-3">
                            <TButton variant="ghost" size="md" class="flex-1" @click="showJoinInput = false">{{ t('home.cancel') }}</TButton>
                            <TButton variant="primary" size="md" class="flex-1" @click="handleJoinRoom">{{ t('home.join') }}</TButton>
                        </div>
                    </div>
                </TCard>

                <TCard padding="md">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xs font-black text-ink-main uppercase tracking-widest flex items-center gap-1">
                            {{ t('home.yourIdentity') }}
                            <span v-if="!isAuthenticated" :title="t('home.guestIdentityHint')" class="cursor-help w-4 h-4 rounded-full bg-panel-input flex items-center justify-center text-[10px] font-bold ml-1 border border-white/5">?</span>
                        </h3>
                        <button v-if="isAuthenticated" @click="isEditingProfile = !isEditingProfile" class="text-[10px] font-bold text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg border border-white/10 transition-colors uppercase">{{ isEditingProfile ? t('home.save') : t('home.edit') }}</button>
                        <button v-else @click="signInWithGoogle" class="text-[10px] font-bold text-action-info opacity-80 hover:opacity-100 uppercase underline">{{ t('home.customize') }}</button>
                    </div>
                    <div class="flex items-center gap-5">
                        <div class="relative group flex-none pb-2">
                            <AvatarWrapper :frameId="equippedFrame">
                                <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-5xl shadow-inner transition-transform group-hover:scale-105 overflow-hidden ring-4 bg-gradient-to-br from-panel-card to-panel-input" :class="ringClass">
                                    {{ selectedAvatar }}
                                </div>
                            </AvatarWrapper>
                            <!-- Level badge under the avatar, absolutely centered -->
                            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white text-panel-card text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border border-white/20 shadow-[0_2px_4px_rgba(0,0,0,0.3)] flex items-center gap-0.5 whitespace-nowrap z-20">
                                <span class="text-panel-card/75">{{ t('home.levelLabel') }}</span> <span class="text-action-info">{{ playerLevel }}</span>
                            </div>
                        </div>
                        <div class="flex-1 min-w-0 flex flex-col gap-2">
                            <div>
                                <p class="text-ink-soft text-[9px] font-bold tracking-wider uppercase mb-1">{{ t('home.publicName') }}</p>
                                <div v-if="!isAuthenticated" class="group flex items-center justify-between bg-panel-base/50 p-2.5 rounded-xl border border-white/5">
                                    <span class="text-xl sm:text-2xl font-black text-ink-muted truncate tracking-tight">{{ playerName }}</span>
                                    <span class="text-[9px] text-action-error font-bold uppercase ml-2 opacity-80 select-none hidden sm:inline-block">{{ t('home.requiresLogin') }}</span>
                                </div>
                                <TInput v-else-if="isEditingProfile" v-model="playerName" placeholder="Tu nombre..." :maxlength="20" input-class="rounded-lg py-1.5 text-base" aria-label="Tu nombre público" />
                                <div v-else class="flex items-center gap-2">
                                    <p class="text-xl sm:text-2xl font-black text-ink-main truncate tracking-tight">{{ playerName }}</p>
                                    <span v-if="isAuthenticated" class="inline-flex items-center gap-0.5 text-[8px] bg-action-success/10 text-action-success border border-action-success/20 px-1.5 py-0.5 rounded font-black uppercase tracking-wider select-none">
                                        <span class="text-[7px]">✔</span> {{ t('home.verified') }}
                                    </span>
                                </div>
                            </div>

                            <!-- Coins Display Badge -->
                            <div class="relative flex items-center gap-2 select-none">
                                <div 
                                    class="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full transition-all"
                                    :class="{ 'animate-coin-pulse border-yellow-400 bg-yellow-400/20': triggerCoinAnim }"
                                >
                                    <CoinIcon class="w-3.5 h-3.5" />
                                    <span class="text-[11px] font-black text-yellow-400 font-mono tracking-wide">{{ coins }}</span>
                                </div>
                                <span 
                                    v-if="triggerCoinAnim && coinDifference > 0" 
                                    class="absolute left-16 top-0 text-[10px] font-black text-yellow-400 animate-float-up-fade"
                                >
                                    +{{ coinDifference }}
                                </span>
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
                        <button @click="handleClearData" class="text-[10px] font-bold text-action-error/70 hover:text-action-error uppercase transition-colors">{{ t('home.clearLocalData') }}</button>
                    </div>
                </TCard>
            </div>

            <!-- RIGHT: Server Browser -->
            <div class="lg:col-span-3 flex flex-col min-h-0">
                <TCard padding="none" class="flex flex-col overflow-hidden flex-1 min-h-[400px] max-h-[min(700px,80vh)] shadow-3d-panel">


                    <!-- Filter Bar (Segmented Controls) -->
                    <div class="p-4 border-b-2 border-white/10 bg-panel-base/80 flex-none space-y-4">
                        <div class="flex items-center justify-between">
                            <h3 class="text-[10px] font-black text-ink-main uppercase tracking-widest flex items-center gap-2">
                                📡 {{ t('home.publicRooms') }}
                                <span class="bg-action-blue/20 text-action-blue border border-action-blue/30 px-2 py-0.5 rounded-md text-[9px]">{{ filteredRooms.length }}</span>
                            </h3>
                            <button @click="handleRefresh" class="text-ink-soft hover:text-white transition-colors flex items-center gap-1 text-[9px] font-bold uppercase bg-white/5 px-3 py-2 rounded-lg" :class="{ 'opacity-50 cursor-not-allowed': isRefreshing }">
                                <span :class="{ 'animate-spin': isRefreshing }">↻</span> {{ t('home.refresh') }}
                            </button>
                        </div>

                        <!-- Modo -->
                        <div>
                            <span class="text-[9px] font-black text-ink-soft uppercase tracking-widest mb-1.5 block">{{ t('home.gameMode') }}</span>
                            <div class="flex gap-1 bg-panel-input p-1 rounded-xl border border-white/5">
                                <button v-for="m in ['ALL','CLASSIC','IMPOSTOR']" :key="m"
                                    @click="lobbyFilters.mode = m as any"
                                    class="flex-1 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all"
                                    :class="lobbyFilters.mode === m ? 'bg-panel-card text-white shadow-3d-panel border border-white/20' : 'text-ink-soft hover:text-white'"
                                >{{ m === 'ALL' ? t('home.any') : MODE_LABELS[m] }}</button>
                            </div>
                        </div>

                        <!-- Región & Idioma (Grid) -->
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <span class="text-[9px] font-black text-ink-soft uppercase tracking-widest mb-1.5 block">{{ t('home.region') }}</span>
                                <select v-model="lobbyFilters.region" class="w-full bg-panel-input border border-white/10 rounded-xl px-2 py-2 text-[10px] font-bold text-ink-main uppercase tracking-wider outline-none focus:border-action-secondary appearance-none">
                                    <option value="ALL">🌐 {{ t('home.any') }}</option>
                                    <option v-for="r in ['SA','NA','EU','AS']" :key="r" :value="r">{{ REGION_LABELS[r] }}</option>
                                </select>
                            </div>
                            <div>
                                <span class="text-[9px] font-black text-ink-soft uppercase tracking-widest mb-1.5 block">{{ t('home.language') }}</span>
                                <select v-model="lobbyFilters.lang" class="w-full bg-panel-input border border-white/10 rounded-xl px-2 py-2 text-[10px] font-bold text-ink-main uppercase tracking-wider outline-none focus:border-action-secondary appearance-none">
                                    <option value="ALL">💬 {{ t('home.any') }}</option>
                                    <option v-for="l in ['es','en','pt']" :key="l" :value="l">{{ LANG_LABELS[l] }}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Room List -->
                    <div class="flex-1 overflow-y-auto p-4 space-y-3 relative min-h-[200px] bg-panel-base/50 scrollbar-thin">
                        <div v-if="filteredRooms.length === 0" class="absolute inset-0 flex flex-col items-center justify-center text-center p-6 gap-3">
                            <div class="animate-float text-6xl select-none">👾</div>
                            <p class="text-ink-soft font-black text-sm uppercase tracking-wider">{{ t('home.noResults') }}</p>
                            <p class="text-ink-muted text-[10px] font-bold">{{ t('home.adjustFilters') }}</p>
                        </div>

                        <!-- Room Card (Arcade Ticket Style) -->
                        <div
                            v-for="room in filteredRooms" :key="room.id"
                            class="relative rounded-2xl p-px transition-all overflow-hidden"
                            :class="room.joinable ? `shadow-3d-panel hover:scale-[1.01] ${room.mode === 'CLASSIC' ? 'bg-action-info/40' : 'bg-game-red/40'}` : 'bg-panel-card/30 opacity-75'"
                        >
                            <!-- Inner Content -->
                            <div class="bg-panel-card rounded-xl p-3 flex flex-col gap-2.5 relative overflow-hidden">
                                
                                <!-- Row 1: Header (Avatar, Name + Players, Enter Button / Closed Badge) -->
                                <div class="flex items-center gap-2.5 w-full">
                                    <!-- Avatar -->
                                    <div class="w-9 h-9 rounded-xl bg-panel-input flex items-center justify-center text-xl shadow-inner flex-none">
                                        {{ room.hostAvatar || '👑' }}
                                    </div>
                                    
                                    <!-- Host Name & Player count -->
                                    <div class="flex items-baseline gap-2 flex-1 min-w-0">
                                        <h4 class="text-white font-black text-sm tracking-tight truncate">
                                            {{ room.hostName }}
                                        </h4>
                                        <span class="text-ink-muted text-xs font-bold flex-none">
                                            {{ room.currentPlayers }}/{{ room.maxPlayers }}
                                        </span>
                                    </div>

                                    <!-- Action Button / Unjoinable Badge on the Right -->
                                    <div class="flex-none">
                                        <button v-if="room.joinable" @click="handleJoinPublicRoom(room.id)" class="px-4 py-1.5 bg-action-primary text-panel-base rounded-xl font-black uppercase tracking-wider text-[10px] sm:text-xs shadow-glow-primary active:scale-95 hover:scale-105 transition-transform flex items-center justify-center gap-1">
                                            <span>{{ t('home.enter') }}</span>
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
                                        </button>
                                        <span v-else class="px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest block text-center"
                                            :class="room.currentPlayers >= room.maxPlayers ? 'text-game-red border-game-red/20 bg-game-red/10' : 'text-amber-400 border-amber-400/20 bg-amber-400/10'">
                                            {{ room.currentPlayers >= room.maxPlayers ? t('home.full') : t('home.inGame') }}
                                        </span>
                                    </div>
                                </div>

                                <!-- Row 2: Badges (Status [if not lobby], Mode, Region, Lang) -->
                                <div class="flex flex-wrap gap-1.5 w-full items-center">
                                    <!-- Round Status Badge (only if game is in progress) -->
                                    <span v-if="room.status !== 'LOBBY'" class="text-[9px] font-black uppercase px-2 py-0.5 rounded-md border"
                                        :class="getStatusInfo(room).color">
                                        {{ getStatusInfo(room).label }}
                                    </span>

                                    <!-- Mode Badge -->
                                    <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-md"
                                        :class="room.mode === 'CLASSIC' ? 'text-action-blue bg-action-blue/10 border border-action-blue/20' : 'text-red-400 bg-red-400/10 border border-red-400/20'">
                                        {{ MODE_LABELS[room.mode] || room.mode }}
                                    </span>

                                    <!-- Region Badge -->
                                    <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-md text-action-info bg-action-info/10 border border-action-info/20">
                                        {{ REGION_LABELS[room.region] || room.region }}
                                    </span>

                                    <!-- Lang Badge -->
                                    <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-md text-action-warning bg-action-warning/10 border border-action-warning/20">
                                        {{ LANG_LABELS[room.lang] || room.lang }}
                                    </span>
                                </div>

                            </div>
                        </div>
                    </div>
                </TCard>

                <!-- AUTH BANNER (RIGHT COLUMN) -->
                <div class="w-full mt-2">
                    <div v-if="isLoading" class="flex justify-center h-10 items-center">
                        <span class="animate-pulse text-ink-muted text-xs font-bold tracking-widest uppercase">{{ t('home.loadingIdentity') }}</span>
                    </div>
                    <div v-else-if="!isAuthenticated" class="relative rounded-2xl p-px overflow-hidden" style="background: linear-gradient(120deg, #fbbf24, #fb7185, #7dd3fc, #fbbf24); background-size: 200% auto; animation: border-glow 3s linear infinite;">
                    <div class="bg-panel-card/95 backdrop-blur-sm rounded-2xl p-4 flex flex-col items-center gap-3">
                        <div class="flex items-center gap-3 w-full">
                            <div class="w-10 h-10 rounded-xl bg-panel-base border-2 border-action-primary flex items-center justify-center text-xl shadow-inner bg-gradient-to-br from-action-primary/20 to-panel-input/20 flex-none">⭐</div>
                            <div class="text-left flex-1 min-w-0">
                                <h4 class="text-white font-black text-sm tracking-tight drop-shadow-md">{{ t('home.joinMetaGame') }}</h4>
                                <p class="text-ink-muted text-[9px] font-bold uppercase tracking-wider truncate">{{ t('home.claimName') }}</p>
                            </div>
                        </div>
                        <button @click="signInWithGoogle" class="w-full bg-white hover:bg-white/90 text-panel-base px-4 py-2.5 rounded-xl font-bold uppercase tracking-wide text-[10px] sm:text-xs shadow-glow-primary active:scale-95 transition-all flex items-center justify-center gap-2 border-[3px] border-white">
                            <svg class="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z" /></svg>
                            {{ t('home.signInGoogle') }}
                        </button>
                    </div></div>
                    <div v-else class="bg-panel-card border-2 border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-lg">
                        <div class="flex items-center gap-2 min-w-0">
                            <img v-if="user?.user_metadata.avatar_url" :src="user.user_metadata.avatar_url" class="w-10 h-10 rounded-xl border-2 border-action-primary shadow-sm flex-none" alt="Avatar">
                            <div v-else class="w-10 h-10 rounded-xl bg-panel-base border-2 border-action-primary flex items-center justify-center text-lg shadow-inner flex-none">👤</div>
                            <div class="text-left min-w-0">
                                <p class="text-ink-soft text-[8px] font-black uppercase tracking-widest text-action-primary flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 text-action-primary"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>
                                    {{ t('home.verified') }}
                                </p>
                                <h4 class="text-white font-black text-xs tracking-tight truncate">{{ user?.user_metadata.full_name || user?.email }}</h4>
                            </div>
                        </div>
                        <button @click="signOut" class="text-ink-muted hover:text-red-400 bg-white/5 hover:bg-red-400/10 px-2 py-2 rounded-lg font-bold text-[10px] transition-colors flex-none">{{ t('home.signOut') }}</button>
                    </div>
                </div>

                <!-- Banner publicitario: siempre al final, justo debajo del bloque de Iniciar Sesión -->
                <div class="xl:hidden w-full flex justify-center mt-4 select-none">
                    <AdBanner position="mobile-inline" />
                </div>
            </div>
        </div>

        <!-- (Banner movido dentro de la columna derecha, justo debajo de Iniciar Sesión) -->

        <div class="mt-8">
            <PrivacyBanner />
        </div>
    </main>
</template>
