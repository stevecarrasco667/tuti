<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useNavigation } from '../../composables/useNavigation';
import { useAuth } from '../../composables/useAuth';
import { useToast } from '../../composables/useToast';
import { useI18n } from 'vue-i18n';
import { useSound } from '../../composables/useSound';
import { useAppSettings } from '../../composables/useAppSettings';
import { usePlayerHistory } from '../../composables/usePlayerHistory';
import { setLanguage } from '../../i18n';
import { useProfile, STORE_ITEMS } from '../../composables/useProfile';
import AvatarWrapper from '../ui/AvatarWrapper.vue';
import TModal from '../ui/TModal.vue';

const { currentTab, isMenuVisible, setTab } = useNavigation();
const { user, isAuthenticated, signInWithGoogle } = useAuth();
const { addToast } = useToast();
const { t, locale } = useI18n();
const { isMuted, toggleMute } = useSound();
const {
    sfxEnabled,
    bgmEnabled,
    vibrationEnabled,
    bgAnimationsEnabled,
    autoFocusEnabled,
    particlesEnabled,
    colorblindMode,
    largeTextEnabled
} = useAppSettings();

const { getHistory, getStats } = usePlayerHistory();
const {
    coins,
    unlockedFrames,
    equippedFrame,
    fetchProfile,
    purchaseFrame,
    equipFrame,
    addTestCoins
} = useProfile();

const storeFrames = computed(() => STORE_ITEMS.value.filter(item => item.type === 'FRAME'));
const storeExpansions = computed(() => STORE_ITEMS.value.filter(item => item.type === 'EXPANSION'));
const storeEmojis = computed(() => STORE_ITEMS.value.filter(item => item.type === 'EMOJI'));

// Sub-pestaña activa dentro de la tienda
const activeStoreTab = ref<'frames' | 'expansions' | 'emojis'>('frames');

// Modal de detalles de artículo
const selectedItem = ref<any | null>(null);
const isDetailModalOpen = ref(false);

const handleShowDetails = (item: any) => {
    selectedItem.value = item;
    isDetailModalOpen.value = true;
};

const historyList = ref<any[]>([]);
const statsList = ref<any>(null);

const loadHistory = async () => {
    historyList.value = await getHistory();
};

const loadStats = async () => {
    statsList.value = await getStats();
};

watch(currentTab, (newTab) => {
    if (newTab === 'profile') {
        loadHistory();
        loadStats();
        fetchProfile();
    } else if (newTab === 'store') {
        fetchProfile();
    }
}, { immediate: true });

const handleBuyFrame = async (itemId: string, price: number) => {
    const res = await purchaseFrame(itemId, price);
    if (res.success) {
        addToast('Artículo adquirido con éxito.', 'success');
        isDetailModalOpen.value = false;
    } else {
        if (res.error === 'insufficient_funds') {
            addToast('No tienes suficientes monedas.', 'error');
        } else if (res.error === 'item_already_owned') {
            addToast('Ya tienes este artículo.', 'info');
        } else {
            addToast('Error al realizar la compra.', 'error');
        }
    }
};

const handleMockAction = (actionName: string) => {
    if (actionName.includes('+100 Monedas') || actionName.includes('Monedas')) {
        addTestCoins(100);
        addToast('🪙 +100 monedas de prueba añadidas.', 'success');
    } else if (actionName.includes('Compra VIP')) {
        addToast('👑 ¡Pase VIP Premium activado con éxito! (Simulado)', 'success');
    } else {
        addToast(`Acción: ${actionName} (Simulado)`, 'info');
    }
};

const formatDate = (dateStr: string) => {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateStr;
    }
};

const setLanguageCode = (code: string) => {
    setLanguage(code as any);
};

const isCapacitor = computed(() => {
    return !!(window as any).Capacitor?.isNativePlatform?.();
});

const triggerClearCache = () => {
    if (confirm('¿Estás seguro de que deseas restablecer todos los datos? Esto borrará tu historial, nombre de jugador y monedas virtuales.')) {
        if (typeof localStorage !== 'undefined') {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('tuti-') || key.startsWith('tuti_'))) {
                    localStorage.removeItem(key);
                }
            }
        }
        window.location.reload();
    }
};

</script>

<template>
    <div class="w-full h-full flex flex-col md:flex-row relative overflow-hidden">
        
        <!-- SIDEBAR DE PC / BOTTOM BAR DE MÓVIL -->
        <Transition name="nav-slide">
            <nav 
                v-if="isMenuVisible"
                class="fixed z-40 bg-[#130a2f]/50 md:bg-[#11092c]/40 backdrop-blur-xl border-purple-500/20 transition-all duration-300
                       bottom-0 left-0 w-full pb-[env(safe-area-inset-bottom)] border-t h-[calc(64px+env(safe-area-inset-bottom))] flex flex-row items-center justify-around px-2
                       md:left-0 md:top-0 md:h-screen md:w-20 lg:w-64 md:border-r md:border-t-0 md:flex-col md:justify-start md:items-stretch md:py-6 md:px-4 md:pb-6"
                aria-label="Navegación del Juego"
            >
                <!-- Logo del juego para Desktop -->
                <div class="hidden md:flex flex-col items-center lg:items-start lg:px-4 mb-10 select-none">
                    <h1 class="font-display text-2xl lg:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-game-yellow to-game-red tracking-wider uppercase font-black">
                        TUTI
                    </h1>
                    <span class="text-[9px] text-white/30 tracking-[0.3em] font-bold uppercase hidden lg:inline">Arena Cósmica</span>
                </div>

                <!-- Botones de Navegación -->
                <div class="flex flex-row md:flex-col gap-2 md:gap-3 w-full md:flex-1 justify-around md:justify-start">
                    
                    <!-- BOTÓN: INICIO (JUGAR) -->
                    <button 
                        @click="setTab('home')"
                        class="flex flex-col md:flex-row items-center gap-1 md:gap-4 px-3 py-1.5 md:py-3.5 md:px-4 rounded-xl font-bold uppercase tracking-wider text-[9px] md:text-xs transition-all duration-300 w-20 md:w-full select-none"
                        :class="currentTab === 'home' 
                            ? 'text-white bg-action-primary/20 border border-action-primary/30 shadow-[0_0_15px_rgba(236,72,153,0.15)]' 
                            : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'"
                    >
                        <span class="text-xl md:text-2xl filter drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">🎮</span>
                        <span class="md:inline" :class="currentTab === 'home' ? 'font-black' : 'font-bold'">Inicio</span>
                    </button>

                    <!-- BOTÓN: TIENDA -->
                    <button 
                        @click="setTab('store')"
                        class="flex flex-col md:flex-row items-center gap-1 md:gap-4 px-3 py-1.5 md:py-3.5 md:px-4 rounded-xl font-bold uppercase tracking-wider text-[9px] md:text-xs transition-all duration-300 w-20 md:w-full select-none"
                        :class="currentTab === 'store' 
                            ? 'text-white bg-game-yellow/20 border border-game-yellow/30 shadow-[0_0_15px_rgba(251,191,36,0.15)]' 
                            : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'"
                    >
                        <span class="text-xl md:text-2xl filter drop-shadow-[0_0_5px_rgba(251,191,36,0.2)]">🛒</span>
                        <span class="md:inline" :class="currentTab === 'store' ? 'font-black' : 'font-bold'">Tienda</span>
                    </button>

                    <!-- BOTÓN: PERFIL -->
                    <button 
                        @click="setTab('profile')"
                        class="flex flex-col md:flex-row items-center gap-1 md:gap-4 px-3 py-1.5 md:py-3.5 md:px-4 rounded-xl font-bold uppercase tracking-wider text-[9px] md:text-xs transition-all duration-300 w-20 md:w-full select-none"
                        :class="currentTab === 'profile' 
                            ? 'text-white bg-action-success/20 border border-action-success/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                            : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'"
                    >
                        <span class="text-xl md:text-2xl filter drop-shadow-[0_0_5px_rgba(16,185,129,0.2)]">👤</span>
                        <span class="md:inline" :class="currentTab === 'profile' ? 'font-black' : 'font-bold'">Perfil</span>
                    </button>

                    <!-- BOTÓN: AJUSTES -->
                    <button 
                        @click="setTab('settings')"
                        class="flex flex-col md:flex-row items-center gap-1 md:gap-4 px-3 py-1.5 md:py-3.5 md:px-4 rounded-xl font-bold uppercase tracking-wider text-[9px] md:text-xs transition-all duration-300 w-20 md:w-full select-none"
                        :class="currentTab === 'settings' 
                            ? 'text-white bg-action-info/20 border border-action-info/30 shadow-[0_0_15px_rgba(14,165,233,0.15)]' 
                            : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'"
                    >
                        <span class="text-xl md:text-2xl filter drop-shadow-[0_0_5px_rgba(14,165,233,0.2)]">⚙️</span>
                        <span class="md:inline" :class="currentTab === 'settings' ? 'font-black' : 'font-bold'">Ajustes</span>
                    </button>

                </div>

                <!-- Controles de Identidad (Solo Desktop) -->
                <div class="hidden md:flex flex-col gap-3 mt-auto w-full">
                    <!-- Tarjeta de Cuenta -->
                    <div class="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                        <img v-if="isAuthenticated && user?.user_metadata.avatar_url" :src="user.user_metadata.avatar_url" class="w-8 h-8 rounded-lg border border-white/10 shadow-sm flex-none" alt="Avatar">
                        <div v-else class="w-8 h-8 rounded-lg bg-panel-base border border-white/10 flex items-center justify-center text-sm shadow-inner flex-none">👤</div>
                        <div class="min-w-0 flex-1 lg:block hidden">
                            <p class="text-[8px] font-bold text-action-primary uppercase tracking-widest leading-none mb-1">Verificado</p>
                            <h4 class="text-white font-black text-xs truncate leading-none">{{ isAuthenticated ? (user?.user_metadata.full_name || user?.email) : 'Invitado' }}</h4>
                        </div>
                    </div>
                </div>
            </nav>
        </Transition>

        <!-- ÁREA CENTRAL DE CONTENIDO DINÁMICO -->
        <main class="flex-1 w-full relative flex flex-col min-h-0 overflow-y-auto transition-all duration-300"
              :class="{ 'pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0 md:pl-20 lg:pl-64': isMenuVisible }">
            
            <div v-if="currentTab === 'home'" class="w-full h-full flex flex-col min-h-0">
                <slot />
            </div>

            <!-- TIENDA CÓSMICA — Layout Premium Rediseñado -->
            <div v-else-if="currentTab === 'store'" class="w-full max-w-[960px] mx-auto p-4 md:p-6 flex flex-col gap-4 animate-fade-in pb-12">

                <!-- ── Header: Título + Monedas ───────────────────────── -->
                <div class="flex items-center justify-between pt-2">
                    <div>
                        <h2 class="text-2xl md:text-3xl font-display text-transparent bg-clip-text bg-gradient-to-r from-game-yellow to-amber-500 uppercase tracking-widest font-black filter drop-shadow-[0_0_12px_rgba(251,191,36,0.3)] leading-none">
                            🛒 Tienda Cósmica
                        </h2>
                        <p class="text-ink-muted text-[10px] font-bold uppercase tracking-widest mt-1">Personaliza tu aspecto y expansiones</p>
                    </div>
                    <div class="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1.5 rounded-full text-yellow-400 font-black text-xs uppercase tracking-wider shadow-[0_0_10px_rgba(234,179,8,0.12)] flex-none">
                        🪙 {{ coins }}
                    </div>
                </div>

                <!-- ── Banners compactos: VIP + Simulador de monedas ──── -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <!-- Banner VIP (fila compacta) -->
                    <div class="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-amber-600/5 border border-yellow-500/25 hover:border-yellow-500/40 transition-all">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="text-xl flex-none">👑</span>
                            <div class="min-w-0">
                                <p class="text-white font-black text-xs uppercase tracking-wide leading-none">Pase VIP Sin Anuncios</p>
                                <p class="text-yellow-400/60 text-[9px] font-bold uppercase tracking-wider mt-0.5">Interfaz limpia y transiciones premium</p>
                            </div>
                        </div>
                        <button @click="handleMockAction('Compra VIP Ad-Free')"
                            class="flex-none px-4 py-1.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-zinc-950 rounded-xl font-black uppercase text-[10px] tracking-wider hover:scale-[1.03] active:scale-95 transition-transform shadow-md">
                            Activar
                        </button>
                    </div>

                    <!-- Banner Simulador de Monedas (fila compacta) -->
                    <div class="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="text-xl flex-none">🪙</span>
                            <div class="min-w-0">
                                <p class="text-white font-black text-xs uppercase tracking-wide leading-none">+100 Monedas de Prueba</p>
                                <p class="text-ink-muted text-[9px] font-bold uppercase tracking-wider mt-0.5">Para probar la tienda en desarrollo</p>
                            </div>
                        </div>
                        <button @click="handleMockAction('+100 Monedas virtuales')"
                            class="flex-none px-4 py-1.5 bg-white/10 border border-white/15 hover:bg-white/20 text-white rounded-xl font-black uppercase text-[10px] tracking-wider transition-all">
                            +100
                        </button>
                    </div>
                </div>

                <!-- ── Sub-pestañas del catálogo ─────────────────────── -->
                <div class="flex gap-2 p-1 bg-white/5 border border-white/5 rounded-2xl">
                    <button
                        @click="activeStoreTab = 'frames'"
                        class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all"
                        :class="activeStoreTab === 'frames'
                            ? 'bg-purple-500/25 border border-purple-500/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                            : 'text-white/40 hover:text-white/70 hover:bg-white/5'"
                    >
                        🌌 {{ t('store.framesTitle') || 'Marcos' }}
                    </button>
                    <button
                        @click="activeStoreTab = 'expansions'"
                        class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all"
                        :class="activeStoreTab === 'expansions'
                            ? 'bg-blue-500/25 border border-blue-500/40 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                            : 'text-white/40 hover:text-white/70 hover:bg-white/5'"
                    >
                        📦 {{ t('store.expansionsTitle') || 'Expansiones' }}
                    </button>
                    <button
                        @click="activeStoreTab = 'emojis'"
                        class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all"
                        :class="activeStoreTab === 'emojis'
                            ? 'bg-pink-500/25 border border-pink-500/40 text-pink-300 shadow-[0_0_12px_rgba(236,72,153,0.2)]'
                            : 'text-white/40 hover:text-white/70 hover:bg-white/5'"
                    >
                        🎭 {{ t('store.emojisTitle') || 'Emojis' }}
                    </button>
                </div>

                <!-- ── Catálogo: Marcos de Avatar ─────────────────────── -->
                <div v-if="activeStoreTab === 'frames'" class="animate-fade-in">
                    <div v-if="storeFrames.length === 0" class="text-center py-10 text-ink-muted text-xs font-bold uppercase tracking-wider">
                        No hay marcos disponibles todavía.
                    </div>
                    <div v-else class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div v-for="item in storeFrames" :key="item.id"
                             @click="handleShowDetails(item)"
                             class="bg-white/5 border border-white/5 hover:border-purple-500/30 rounded-2xl p-4 flex flex-col items-center gap-3 text-center transition-all group relative cursor-pointer hover:scale-[1.02]">
                            <div class="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner relative">
                                <AvatarWrapper :frameId="item.id">
                                    <div class="w-14 h-14 bg-panel-base rounded-full flex items-center justify-center text-2xl">😎</div>
                                </AvatarWrapper>
                            </div>
                            <div class="w-full">
                                <h4 class="text-white font-black text-xs uppercase tracking-wide truncate">{{ t(item.name) || item.name }}</h4>
                                <p class="text-ink-soft text-[9px] font-medium leading-tight my-1 truncate w-full px-1">{{ t(item.description) || item.description }}</p>
                                <span class="text-[10px] font-bold text-game-yellow">🪙 {{ item.price }}</span>
                            </div>
                            <button
                                v-if="!unlockedFrames.includes(item.id)"
                                class="w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer
                                       bg-white/5 hover:bg-purple-500/20 hover:border-purple-500/30 hover:text-purple-300
                                       text-white/70 border-white/5"
                            >
                                {{ t('store.buyButton') || 'Adquirir' }}
                            </button>
                            <button
                                v-else-if="equippedFrame !== item.id"
                                @click.stop="equipFrame(item.id)"
                                class="w-full bg-action-primary/20 hover:bg-action-primary/30 text-action-primary py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors border border-action-primary/30 cursor-pointer"
                            >
                                {{ t('store.equipButton') || 'Equipar' }}
                            </button>
                            <button
                                v-else
                                @click.stop="equipFrame(null)"
                                class="w-full bg-action-success/20 hover:bg-action-success/30 text-action-success py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors border border-action-success/30 cursor-pointer"
                            >
                                {{ t('store.equippedButton') || 'Equipado ✓' }}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- ── Catálogo: Expansiones ──────────────────────────── -->
                <div v-else-if="activeStoreTab === 'expansions'" class="animate-fade-in">
                    <div v-if="storeExpansions.length === 0" class="text-center py-10 text-ink-muted text-xs font-bold uppercase tracking-wider">
                        No hay expansiones disponibles todavía.
                    </div>
                    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div v-for="item in storeExpansions" :key="item.id"
                             @click="handleShowDetails(item)"
                             class="bg-white/5 border border-white/5 hover:border-blue-500/30 rounded-2xl p-5 flex items-center justify-between gap-4 transition-all group cursor-pointer hover:scale-[1.02]">
                            <div class="flex items-center gap-4 min-w-0">
                                <span class="text-4xl filter drop-shadow-md flex-none">
                                    {{ item.id === 'pack_futbol' ? '⚽' : item.id === 'pack_cine' ? '🎬' : '🎮' }}
                                </span>
                                <div class="text-left min-w-0">
                                    <h4 class="text-white font-black text-sm uppercase tracking-wide truncate">{{ t(item.name) || item.name }}</h4>
                                    <p class="text-ink-soft text-xs font-medium leading-tight mt-1 line-clamp-2">{{ t(item.description) || item.description }}</p>
                                    <span class="text-xs font-bold text-game-yellow mt-1 block">🪙 {{ item.price }}</span>
                                </div>
                            </div>
                            <button
                                v-if="!unlockedFrames.includes(item.id)"
                                class="flex-none px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white
                                       rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
                            >
                                {{ t('store.buyButton') || 'Comprar' }}
                            </button>
                            <span
                                v-else
                                class="flex-none px-4 py-2.5 bg-white/5 border border-white/10 text-white/50 rounded-xl text-xs font-black uppercase tracking-wider"
                            >
                                {{ t('store.ownedButton') || 'Adquirido ✓' }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- ── Catálogo: Packs de Emojis ──────────────────────── -->
                <div v-else-if="activeStoreTab === 'emojis'" class="animate-fade-in">
                    <p class="text-ink-muted text-[10px] font-bold uppercase tracking-wider mb-4">
                        Los emojis comprados estarán disponibles como reacciones extra durante las votaciones.
                    </p>
                    <div v-if="storeEmojis.length === 0" class="text-center py-10 text-ink-muted text-xs font-bold uppercase tracking-wider">
                        No hay packs de emojis disponibles todavía.
                    </div>
                    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div v-for="item in storeEmojis" :key="item.id"
                             @click="handleShowDetails(item)"
                             class="bg-white/5 border border-white/5 hover:border-pink-500/30 rounded-2xl p-5 flex flex-col gap-4 transition-all group cursor-pointer hover:scale-[1.02]">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <h4 class="text-white font-black text-sm uppercase tracking-wide">{{ t(item.name) || item.name }}</h4>
                                    <p class="text-ink-soft text-xs font-medium leading-tight mt-1 line-clamp-2">{{ t(item.description) || item.description }}</p>
                                    <span class="text-xs font-bold text-game-yellow mt-2 block">🪙 {{ item.price }}</span>
                                </div>
                                <span class="text-3xl flex-none pt-0.5">🎭</span>
                            </div>

                            <!-- Preview de emojis del pack -->
                            <div v-if="item.metadata?.emojis?.length" class="flex flex-wrap gap-2 p-3 bg-black/20 rounded-xl border border-white/5">
                                <span v-for="emj in item.metadata.emojis" :key="emj"
                                      class="text-xl leading-none hover:scale-125 transition-transform cursor-default"
                                      :title="emj">{{ emj }}</span>
                            </div>

                            <button
                                v-if="!unlockedFrames.includes(item.id)"
                                class="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer
                                       bg-pink-500/15 hover:bg-pink-500/25 hover:border-pink-500/40 hover:text-pink-300
                                       text-white/70 border-white/10"
                            >
                                {{ t('store.buyButton') || 'Desbloquear Pack' }}
                            </button>
                            <span
                                v-else
                                class="w-full py-2.5 text-center bg-white/5 border border-white/10 text-white/50 rounded-xl text-xs font-black uppercase tracking-wider"
                            >
                                {{ t('store.ownedButton') || 'Desbloqueado ✓' }}
                            </span>
                        </div>
                    </div>
                </div>

            </div>

            <!-- PLACEHOLDER: PERFIL DEL JUGADOR -->
            <div v-else-if="currentTab === 'profile'" class="w-full max-w-[960px] mx-auto p-6 flex flex-col gap-6 animate-fade-in pb-12">
                <div class="text-center py-6">
                    <h2 class="text-5xl font-display text-transparent bg-clip-text bg-gradient-to-r from-action-success via-emerald-400 to-emerald-500 uppercase tracking-widest font-black filter drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        👤 MI PERFIL
                    </h2>
                    <p class="text-ink-muted text-xs font-bold uppercase tracking-widest mt-2">Tu identidad y estadísticas en TutiGames</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    <!-- Tarjeta de Identidad -->
                    <div class="md:col-span-1 bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center relative overflow-hidden h-fit">
                        <div class="absolute -top-12 -right-12 w-28 h-28 bg-action-success/5 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div class="w-24 h-24 rounded-3xl bg-white/5 border-2 border-action-success flex items-center justify-center text-5xl mb-4 shadow-inner">
                            🦁
                        </div>

                        <h3 class="text-xl font-black text-white leading-none mb-1 truncate max-w-full">
                            {{ isAuthenticated ? (user?.user_metadata.full_name || 'Jugador Verificado') : 'Invitado' }}
                        </h3>
                        <p class="text-[10px] font-bold text-action-success uppercase tracking-widest mb-6">Nivel 12 · Iniciado</p>

                        <div v-if="!isAuthenticated" class="w-full space-y-3">
                            <p class="text-[10px] text-ink-muted font-bold uppercase leading-relaxed">Inicia sesión con Google para guardar tus monedas e historial permanentemente.</p>
                            <button @click="signInWithGoogle" class="w-full bg-white text-zinc-950 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform">
                                <svg class="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z" /></svg>
                                Vincular Cuenta
                            </button>
                        </div>
                        <div v-else class="w-full">
                            <div class="px-4 py-2.5 bg-action-success/10 border border-action-success/20 rounded-xl text-action-success text-[10px] font-bold uppercase tracking-wider inline-block">
                                🔒 Datos Guardados en Cloud
                            </div>
                        </div>
                    </div>

                    <!-- Estadísticas e Historial -->
                    <div class="md:col-span-2 flex flex-col gap-6">
                        <!-- Estadísticas -->
                        <div class="bg-white/5 border border-white/10 rounded-3xl p-6">
                            <h3 class="text-xs font-black text-white uppercase tracking-widest mb-4">🏆 Estadísticas de Juego</h3>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div class="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p class="text-ink-muted text-[10px] font-bold uppercase tracking-wider mb-1">Partidas Jugadas</p>
                                    <span class="text-3xl font-display font-black text-white">42</span>
                                </div>
                                <div class="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p class="text-ink-muted text-[10px] font-bold uppercase tracking-wider mb-1">Victorias Totales</p>
                                    <span class="text-3xl font-display font-black text-action-success">18</span>
                                </div>
                                <div class="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p class="text-ink-muted text-[10px] font-bold uppercase tracking-wider mb-1">Win Rate</p>
                                    <span class="text-3xl font-display font-black text-action-info">43%</span>
                                </div>
                                <div class="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p class="text-ink-muted text-[10px] font-bold uppercase tracking-wider mb-1">Récord de Puntuación</p>
                                    <span class="text-3xl font-display font-black text-game-yellow">140</span>
                                </div>
                            </div>
                        </div>

                        <!-- Historial de Partidas -->
                        <div class="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col">
                            <h3 class="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center justify-between">
                                <span>📋 Historial de Partidas</span>
                                <span class="text-[10px] font-bold text-ink-muted uppercase">(Últimas 20)</span>
                            </h3>

                            <div v-if="historyList.length === 0" class="text-center py-6 text-ink-muted text-xs font-bold uppercase tracking-wider">
                                No hay partidas registradas todavía.
                            </div>
                            <div v-else class="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                                <div v-for="(entry, index) in historyList" :key="index"
                                     class="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl hover:border-white/10 transition-colors">
                                    <div class="flex items-center gap-3 min-w-0">
                                        <span class="text-xl">
                                            {{ entry.myRank === 1 ? '🥇' : entry.myRank === 2 ? '🥈' : entry.myRank === 3 ? '🥉' : '🎮' }}
                                        </span>
                                        <div class="min-w-0">
                                            <p class="text-white font-black text-xs uppercase">{{ entry.mode === 'CLASSIC' ? 'Tuti Clásico' : 'Modo Impostor' }}</p>
                                            <p class="text-ink-muted text-[9px] font-bold">{{ formatDate(entry.date) }}</p>
                                        </div>
                                    </div>
                                    <div class="text-right flex-none">
                                        <span class="text-xs font-black" :class="entry.won ? 'text-action-success' : 'text-ink-soft'">
                                            Puesto #{{ entry.myRank }}/{{ entry.totalPlayers }}
                                        </span>
                                        <p class="text-[9px] font-bold text-game-yellow">{{ entry.myScore }} pts</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TAB: AJUSTES / CONFIGURACIÓN -->
            <div v-else-if="currentTab === 'settings'" class="w-full max-w-[960px] mx-auto p-6 flex flex-col gap-6 animate-fade-in pb-12">
                <div class="text-center py-6">
                    <h2 class="text-5xl font-display text-transparent bg-clip-text bg-gradient-to-r from-action-info via-cyan-400 to-sky-500 uppercase tracking-widest font-black filter drop-shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                        ⚙️ CONFIGURACIÓN
                    </h2>
                    <p class="text-ink-muted text-xs font-bold uppercase tracking-widest mt-2">Ajusta tu experiencia de juego en TutiGames</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <!-- Tarjeta: AUDIO & SONIDO -->
                    <div class="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
                        <h3 class="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                            🔊 Audio y Sonido
                        </h3>
                        <div class="flex flex-col gap-3">
                            <!-- Toggle: Mute -->
                            <div class="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                                <div>
                                    <p class="text-white font-black text-xs uppercase">Silenciar Sonidos</p>
                                    <p class="text-ink-muted text-[9px] font-bold uppercase">Apaga todos los efectos del juego</p>
                                </div>
                                <button @click="toggleMute" class="w-12 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none"
                                        :class="isMuted ? 'bg-action-error' : 'bg-zinc-700'">
                                    <div class="bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200"
                                         :class="isMuted ? 'translate-x-6' : 'translate-x-0'"></div>
                                </button>
                            </div>
                            
                            <!-- Toggle: SFX -->
                            <div class="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5" :class="{ 'opacity-50': isMuted }">
                                <div>
                                    <p class="text-white font-black text-xs uppercase">Efectos Especiales (SFX)</p>
                                    <p class="text-ink-muted text-[9px] font-bold uppercase">Sonidos al escribir y pulsar botones</p>
                                </div>
                                <button @click="sfxEnabled = !sfxEnabled" :disabled="isMuted" class="w-12 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none"
                                        :class="sfxEnabled && !isMuted ? 'bg-action-success' : 'bg-zinc-700'">
                                    <div class="bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200"
                                         :class="sfxEnabled && !isMuted ? 'translate-x-6' : 'translate-x-0'"></div>
                                </button>
                            </div>

                            <!-- Toggle: BGM -->
                            <div class="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5" :class="{ 'opacity-50': isMuted }">
                                <div>
                                    <p class="text-white font-black text-xs uppercase">Música de Fondo (BGM)</p>
                                    <p class="text-ink-muted text-[9px] font-bold uppercase">Música ambiental en lobby y salas</p>
                                </div>
                                <button @click="bgmEnabled = !bgmEnabled" :disabled="isMuted" class="w-12 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none"
                                        :class="bgmEnabled && !isMuted ? 'bg-action-success' : 'bg-zinc-700'">
                                    <div class="bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200"
                                         :class="bgmEnabled && !isMuted ? 'translate-x-6' : 'translate-x-0'"></div>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Tarjeta: SELECCIÓN DE IDIOMA -->
                    <div class="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
                        <h3 class="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                            🌎 Idioma del Juego
                        </h3>
                        <p class="text-ink-muted text-[9px] font-bold uppercase">Selecciona el idioma de la interfaz y categorías:</p>
                        <div class="grid grid-cols-3 gap-2">
                            <button v-for="lang in [
                                { code: 'es', flag: '🇪🇸', label: 'Español' },
                                { code: 'en', flag: '🇬🇧', label: 'English' },
                                { code: 'pt', flag: '🇧🇷', label: 'Português' }
                            ]" :key="lang.code"
                                    @click="setLanguageCode(lang.code)"
                                    class="flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all"
                                    :class="locale === lang.code 
                                        ? 'bg-action-info/10 border-action-info text-white shadow-lg' 
                                        : 'bg-white/5 border-transparent text-ink-muted hover:bg-white/10 hover:text-white'">
                                <span class="text-3xl filter drop-shadow-sm">{{ lang.flag }}</span>
                                <span class="text-[10px] font-black uppercase tracking-wider">{{ lang.label }}</span>
                            </button>
                        </div>
                    </div>

                    <!-- Tarjeta: RENDIMIENTO & GRÁFICOS -->
                    <div class="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
                        <h3 class="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                            ⚡ Rendimiento y Gráficos
                        </h3>
                        <div class="flex flex-col gap-3">
                            <!-- Toggle: Fondo Animado -->
                            <div class="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                                <div>
                                    <p class="text-white font-black text-xs uppercase">Fondo Cósmico Animado</p>
                                    <p class="text-ink-muted text-[9px] font-bold uppercase">Nebulosas y estrellas flotantes de fondo</p>
                                </div>
                                <button @click="bgAnimationsEnabled = !bgAnimationsEnabled" class="w-12 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none"
                                        :class="bgAnimationsEnabled ? 'bg-action-success' : 'bg-zinc-700'">
                                    <div class="bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200"
                                         :class="bgAnimationsEnabled ? 'translate-x-6' : 'translate-x-0'"></div>
                                </button>
                            </div>
                            
                            <!-- Toggle: Partículas -->
                            <div class="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                                <div>
                                    <p class="text-white font-black text-xs uppercase">Efectos de Partículas (VFX)</p>
                                    <p class="text-ink-muted text-[9px] font-bold uppercase">Chispas y destellos de botones y clics</p>
                                </div>
                                <button @click="particlesEnabled = !particlesEnabled" class="w-12 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none"
                                        :class="particlesEnabled ? 'bg-action-success' : 'bg-zinc-700'">
                                    <div class="bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200"
                                         :class="particlesEnabled ? 'translate-x-6' : 'translate-x-0'"></div>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Tarjeta: ACCESIBILIDAD -->
                    <div class="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
                        <h3 class="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                            ♿ Accesibilidad
                        </h3>
                        <div class="flex flex-col gap-3">
                            <!-- Toggle: Modo Daltónicos -->
                            <div class="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                                <div>
                                    <p class="text-white font-black text-xs uppercase">Modo Daltónicos / Alto Contraste</p>
                                    <p class="text-ink-muted text-[9px] font-bold uppercase">Colores alternativos optimizados para UI</p>
                                </div>
                                <button @click="colorblindMode = !colorblindMode" class="w-12 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none"
                                        :class="colorblindMode ? 'bg-action-success' : 'bg-zinc-700'">
                                    <div class="bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200"
                                         :class="colorblindMode ? 'translate-x-6' : 'translate-x-0'"></div>
                                </button>
                            </div>
                            
                            <!-- Toggle: Letra Grande -->
                            <div class="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                                <div>
                                    <p class="text-white font-black text-xs uppercase">Texto Grande</p>
                                    <p class="text-ink-muted text-[9px] font-bold uppercase">Incrementa el tamaño de la letra de la app</p>
                                </div>
                                <button @click="largeTextEnabled = !largeTextEnabled" class="w-12 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none"
                                        :class="largeTextEnabled ? 'bg-action-success' : 'bg-zinc-700'">
                                    <div class="bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200"
                                         :class="largeTextEnabled ? 'translate-x-6' : 'translate-x-0'"></div>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Tarjeta: JUGABILIDAD -->
                    <div class="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
                        <h3 class="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                            🎮 Jugabilidad
                        </h3>
                        <div class="flex flex-col gap-3">
                            <!-- Toggle: Auto Focus -->
                            <div class="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                                <div>
                                    <p class="text-white font-black text-xs uppercase">Foco de Entrada Automático</p>
                                    <p class="text-ink-muted text-[9px] font-bold uppercase">Abre el teclado al iniciar la ronda de Tuti</p>
                                </div>
                                <button @click="autoFocusEnabled = !autoFocusEnabled" class="w-12 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none"
                                        :class="autoFocusEnabled ? 'bg-action-success' : 'bg-zinc-700'">
                                    <div class="bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200"
                                         :class="autoFocusEnabled ? 'translate-x-6' : 'translate-x-0'"></div>
                                </button>
                            </div>
                            
                            <!-- Toggle: Vibración -->
                            <div class="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                                <div>
                                    <p class="text-white font-black text-xs uppercase">Vibración Háptica</p>
                                    <p class="text-ink-muted text-[9px] font-bold uppercase">Respuesta física al presionar botones (móvil)</p>
                                </div>
                                <button @click="vibrationEnabled = !vibrationEnabled" class="w-12 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none"
                                        :class="vibrationEnabled ? 'bg-action-success' : 'bg-zinc-700'">
                                    <div class="bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200"
                                         :class="vibrationEnabled ? 'translate-x-6' : 'translate-x-0'"></div>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Tarjeta: MANTENIMIENTO & SISTEMA -->
                    <div class="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between gap-4">
                        <h3 class="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                            🛠️ Mantenimiento y Sistema
                        </h3>
                        <div class="flex flex-col gap-3">
                            <div class="flex items-center justify-between">
                                <span class="text-ink-muted text-[9px] font-bold uppercase">Versión de Aplicación</span>
                                <span class="text-white font-black text-xs">v1.2.0 - Cosmic Edition</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-ink-muted text-[9px] font-bold uppercase">Plataforma</span>
                                <span class="text-white font-black text-xs uppercase">{{ isCapacitor ? 'Capacitor Nativo' : 'Navegador Web' }}</span>
                            </div>
                        </div>
                        <button @click="triggerClearCache" class="w-full bg-action-error/20 border border-action-error/40 hover:bg-action-error/30 text-white py-3 rounded-2xl font-black uppercase text-xs tracking-wider transition-all">
                            ⚠️ Restablecer Datos de la App
                        </button>
                    </div>
                </div>
            </div>

            <!-- Modal de Detalles del Paquete -->
            <TModal v-model="isDetailModalOpen" :title="selectedItem ? t(selectedItem.name) || selectedItem.name : ''" maxWidth="md">
                <div v-if="selectedItem" class="flex flex-col gap-6 text-center">
                    <!-- Icono o preview del tipo -->
                    <div class="flex flex-col items-center justify-center py-4">
                        <!-- PREVIEW: MARCOS -->
                        <div v-if="selectedItem.type === 'FRAME'" class="w-32 h-32 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner relative scale-110">
                            <AvatarWrapper :frameId="selectedItem.id">
                                <div class="w-28 h-28 bg-panel-base rounded-full flex items-center justify-center text-5xl">😎</div>
                            </AvatarWrapper>
                        </div>

                        <!-- PREVIEW: EMOJIS -->
                        <div v-else-if="selectedItem.type === 'EMOJI'" class="text-6xl filter drop-shadow-lg animate-bounce">
                            🎭
                        </div>

                        <!-- PREVIEW: EXPANSIONES -->
                        <div v-else-if="selectedItem.type === 'EXPANSION'" class="text-6xl filter drop-shadow-lg">
                            {{ selectedItem.id === 'pack_futbol' ? '⚽' : selectedItem.id === 'pack_cine' ? '🍿' : '🎮' }}
                        </div>
                    </div>

                    <!-- Detalles e información de contenido -->
                    <div class="space-y-2">
                        <p class="text-white text-sm font-medium leading-relaxed px-4">
                            {{ t(selectedItem.description) || selectedItem.description }}
                        </p>
                        
                        <div class="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                            Tipo: {{ selectedItem.type === 'FRAME' ? 'Marco de Avatar' : selectedItem.type === 'EMOJI' ? 'Paquete de Emojis' : 'Expansión de Categorías' }}
                        </div>
                    </div>

                    <!-- CONTENIDO DETALLADO DEL PAQUETE -->
                    <div class="bg-black/20 border border-white/5 rounded-2xl p-4 text-left space-y-3">
                        <h4 class="text-xs font-black text-white uppercase tracking-wider border-b border-white/5 pb-1.5 flex items-center gap-1.5">
                            📦 Contenido del Paquete:
                        </h4>

                        <!-- Contenido de Emojis -->
                        <div v-if="selectedItem.type === 'EMOJI' && selectedItem.metadata?.emojis?.length" class="flex flex-wrap justify-center gap-3 py-2">
                            <span v-for="emj in selectedItem.metadata.emojis" :key="emj"
                                  class="text-3xl leading-none hover:scale-125 transition-transform cursor-default filter drop-shadow-sm"
                                  :title="emj">
                                {{ emj }}
                            </span>
                        </div>

                        <!-- Contenido de Expansiones -->
                        <div v-else-if="selectedItem.type === 'EXPANSION' && selectedItem.metadata?.categories?.length" class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs py-1">
                            <div v-for="cat in selectedItem.metadata.categories" :key="cat" class="flex items-center gap-2 text-white font-bold bg-white/5 border border-white/5 px-3 py-2 rounded-xl">
                                <span class="text-sm">📌</span>
                                <span>{{ cat }}</span>
                            </div>
                        </div>

                        <!-- Contenido de Marcos -->
                        <div v-else-if="selectedItem.type === 'FRAME'" class="text-xs text-ink-soft leading-normal space-y-1 py-1">
                            <p class="flex items-start gap-1.5">
                                <span class="text-action-success flex-none">✓</span>
                                <span>Efecto visual premium alrededor de tu avatar.</span>
                            </p>
                            <p class="flex items-start gap-1.5">
                                <span class="text-action-success flex-none">✓</span>
                                <span>Visible para todos los jugadores en la sala y votaciones.</span>
                            </p>
                            <p class="flex items-start gap-1.5">
                                <span class="text-action-success flex-none">✓</span>
                                <span>Efecto dinámico animado sin pérdidas de rendimiento.</span>
                            </p>
                        </div>
                    </div>

                    <!-- Botón de acción y precio -->
                    <div class="pt-2 flex flex-col gap-3">
                        <!-- Si no lo ha comprado -->
                        <div v-if="!unlockedFrames.includes(selectedItem.id)" class="space-y-3">
                            <div class="flex items-center justify-center gap-2">
                                <span class="text-sm font-bold text-ink-muted uppercase tracking-wider">Precio:</span>
                                <span class="text-lg font-black text-game-yellow">🪙 {{ selectedItem.price }}</span>
                            </div>
                            <button
                                @click="handleBuyFrame(selectedItem.id, selectedItem.price)"
                                :disabled="coins < selectedItem.price"
                                class="w-full py-3 bg-gradient-to-r from-game-yellow via-amber-500 to-amber-600 text-zinc-950 disabled:opacity-40 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-white/40 rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-lg shadow-amber-500/10 cursor-pointer disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                            >
                                {{ coins < selectedItem.price ? 'Monedas Insuficientes' : 'Comprar y Desbloquear' }}
                            </button>
                        </div>

                        <!-- Si ya lo tiene -->
                        <div v-else class="space-y-3">
                            <div class="text-xs font-black text-action-success uppercase tracking-widest flex items-center justify-center gap-1.5">
                                <span>✓</span> Ya posees este artículo
                            </div>
                            
                            <!-- Si es un Marco, se puede equipar/desequipar -->
                            <div v-if="selectedItem.type === 'FRAME'" class="w-full">
                                <button
                                    v-if="equippedFrame !== selectedItem.id"
                                    @click="equipFrame(selectedItem.id); isDetailModalOpen = false;"
                                    class="w-full bg-action-primary/20 hover:bg-action-primary/30 text-action-primary py-3 rounded-2xl font-black uppercase text-xs tracking-wider transition-all border border-action-primary/30 cursor-pointer"
                                >
                                    {{ t('store.equipButton') || 'Equipar Marco' }}
                                </button>
                                <button
                                    v-else
                                    @click="equipFrame(null); isDetailModalOpen = false;"
                                    class="w-full bg-action-success/20 hover:bg-action-success/30 text-action-success py-3 rounded-2xl font-black uppercase text-xs tracking-wider transition-all border border-action-success/30 cursor-pointer"
                                >
                                    {{ t('store.equippedButton') || 'Desequipar Marco' }}
                                </button>
                            </div>

                            <!-- Si es Emoji o Expansión, ya está activo permanentemente -->
                            <div v-else class="w-full">
                                <button
                                    @click="isDetailModalOpen = false"
                                    class="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white py-3 rounded-2xl font-black uppercase text-xs tracking-wider transition-all cursor-pointer"
                                >
                                    {{ t('store.ownedButton') || 'Cerrar (Ya Activo)' }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </TModal>

        </main>
    </div>
</template>

<style scoped>
/* Transiciones de pestañas */
.animate-fade-in {
    animation: fadeIn 0.25s ease-out forwards;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Desplazamiento del menú adaptativo */
.nav-slide-enter-active, .nav-slide-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
@media (max-width: 767px) {
    .nav-slide-enter-from, .nav-slide-leave-to {
        transform: translateY(100%);
    }
}
@media (min-width: 768px) {
    .nav-slide-enter-from, .nav-slide-leave-to {
        transform: translateX(-100%);
    }
}
</style>
