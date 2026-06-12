<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { supabase } from '../../lib/supabase';
import { MASTER_CATEGORIES } from '../../../shared/engines/categories';
import type { CategoryRef, GameConfig } from '../../../shared/types';
import TButton from '../ui/TButton.vue';
import ModeSelector from './ModeSelector.vue';
import ClassicConfig from './ClassicConfig.vue';
import ImpostorConfig from './ImpostorConfig.vue';
import { useProfile } from '../../composables/useProfile';
import { useNavigation } from '../../composables/useNavigation';
import CoinIcon from '../ui/CoinIcon.vue';


const { t, locale } = useI18n();
const { unlockedFrames } = useProfile();

const props = defineProps<{
    config: GameConfig;
    categories: CategoryRef[];
    amIHost: boolean;
}>();

const emit = defineEmits<{
    (e: 'update-config', field: string, value: any): void;
    (e: 'update-mutator', mutator: string, value: boolean): void;
    (e: 'update-categories', categories: CategoryRef[]): void;
    (e: 'remove-category', name: string): void;
    (e: 'open-tutorial', mode: 'CLASSIC' | 'IMPOSTOR'): void;
}>();

// ── Tab Management ────────────────────────────────────────────────────────────
const activeTab = ref<'modes' | 'custom'>('modes');

// ── Steppers and Select Options ──────────────────────────────────────────────
const timeLimitOptions = [30, 45, 60, 90, 120, 180];
const votingOptions = [10, 15, 20, 30, 45, 60, 90, 120];
const impostorTypingOptions = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
const impostorVotingOptions = Array.from({ length: 22 }, (_, i) => 15 + i * 5); // [15,20,...,120]

// ── Presets Configuration ──────────────────────────────────────────────────
const PRESETS = {
    CLASSIC: {
        fast:  { rounds: 3, categoryCount: 3, timeLimit: 45, votingDuration: 15 },
        party: { rounds: 3, categoryCount: 4, timeLimit: 60, votingDuration: 20 },
        pro:   { rounds: 5, categoryCount: 5, timeLimit: 90, votingDuration: 30 }
    },
    IMPOSTOR: {
        fast:  { rounds: 2, categoryCount: 2, typingTime: 20, votingTime: 30 },
        party: { rounds: 3, categoryCount: 3, typingTime: 30, votingTime: 40 },
        pro:   { rounds: 5, categoryCount: 4, typingTime: 45, votingTime: 60 }
    }
} as const;

const activePreset = computed(() => {
    const mode = props.config.mode;
    if (mode !== 'CLASSIC' && mode !== 'IMPOSTOR') return null;
    const presets = mode === 'CLASSIC' ? PRESETS.CLASSIC : PRESETS.IMPOSTOR;
    
    for (const [key, values] of Object.entries(presets)) {
        const matches = mode === 'CLASSIC' 
            ? props.config.classic?.rounds === values.rounds &&
              (props.config.classic?.categories?.length > 0 ? true : props.config.classic?.categoryCount === values.categoryCount) &&
              props.config.classic?.timeLimit === values.timeLimit &&
              props.config.classic?.votingDuration === values.votingDuration
            : props.config.impostor?.rounds === values.rounds &&
              props.config.impostor?.categoryCount === values.categoryCount &&
              props.config.impostor?.typingTime === values.typingTime &&
              props.config.impostor?.votingTime === values.votingTime;
              
        if (matches) return key;
    }
    return null;
});

function applyPreset(presetKey: 'fast' | 'party' | 'pro') {
    if (!props.amIHost) return;
    const mode = props.config.mode;
    if (mode === 'CLASSIC') {
        emit('update-config', 'classic', PRESETS.CLASSIC[presetKey]);
    } else if (mode === 'IMPOSTOR') {
        emit('update-config', 'impostor', PRESETS.IMPOSTOR[presetKey]);
    }
}

// ── Categories Modal State (local confirmation) ──────────────────────────────
const showModal = ref(false);
const searchQuery = ref('');
const activeModalTab = ref<'base' | 'pack_futbol' | 'pack_musica' | 'pack_fun' | 'pack_gamer' | 'pack_cine' | 'selected'>('base');
const tempSelectedCategories = ref<CategoryRef[]>([]);

// Función para redirigir a la Tienda (el WS se mantiene activo en background)
const handleRedirectToStore = () => {
    const { setTab } = useNavigation();
    
    // 1. Cerrar el modal actual
    showModal.value = false;
    
    // 2. Cambiar pestaña global a 'store'
    setTab('store');
};

// Remote Categories State (Impostor Mode)
const dbCategories = ref<{ id: string; name: string; normalizedName: string }[]>([]);
const isLoadingDb = ref(false);

// Pre-normalizar categorías estáticas una sola vez al cargar el componente
const NORMALIZED_MASTER_CATEGORIES = MASTER_CATEGORIES.map(cat => ({
    ...cat,
    normalizedName: cat.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}));

async function fetchImpostorCategories() {
    if (props.config.mode !== 'IMPOSTOR') return;
    isLoadingDb.value = true;
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('id, name')
            .eq('game_mode', 'impostor');
        if (!error && data) {
            dbCategories.value = data.map(d => ({
                ...d,
                normalizedName: d.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            }));
        } else {
            throw error;
        }
    } catch (err) {
        console.warn('[ImpostorCategories] Failed to load remote categories, using local fallback.', err);
        const fallback = [
            { id: '1', name: 'Animales' },
            { id: '2', name: 'Comida' },
            { id: '3', name: 'Profesiones' },
            { id: '4', name: 'Objetos cotidianos' },
            { id: '5', name: 'Películas de Cine' },
            { id: '6', name: 'Marcas de Consumo' },
            { id: '7', name: 'Superhéroes' },
            { id: '8', name: 'Instrumentos Musicales' }
        ];
        dbCategories.value = fallback.map(d => ({
            ...d,
            normalizedName: d.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        }));
    } finally {
        isLoadingDb.value = false;
    }
}

onMounted(() => {
    fetchImpostorCategories();
});

watch(() => props.config.mode, () => {
    fetchImpostorCategories();
});

const filteredCategories = computed(() => {
    const query = searchQuery.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    if (props.config.mode === 'IMPOSTOR') {
        return dbCategories.value.filter(cat => cat.normalizedName.includes(query));
    }

    // Si hay una consulta de búsqueda activa, ignoramos el tab del modal y filtramos globalmente
    // de entre todos los paquetes que el anfitrión posee desbloqueados (o básico/gratis)
    if (query) {
        return NORMALIZED_MASTER_CATEGORIES.filter(cat => {
            const packId = cat.packId ?? null;
            if (packId && !unlockedFrames.value.includes(packId)) return false;
            return cat.normalizedName.includes(query);
        });
    }

    // Si está en el tab de categorías seleccionadas
    if (activeModalTab.value === 'selected') {
        return NORMALIZED_MASTER_CATEGORIES.filter(cat => 
            tempSelectedCategories.value.some(s => s.name === cat.name)
        );
    }

    // Filtrar por el paquete/tab activo en el modal
    return NORMALIZED_MASTER_CATEGORIES.filter(cat => {
        const packId = cat.packId ?? null;
        if (activeModalTab.value === 'base') {
            return packId === null;
        } else {
            return packId === activeModalTab.value;
        }
    });
});

function openModal() {
    tempSelectedCategories.value = [...props.categories];
    searchQuery.value = '';
    activeModalTab.value = 'base';
    showModal.value = true;
    if (props.config.mode === 'IMPOSTOR' && dbCategories.value.length === 0) {
        fetchImpostorCategories();
    }
}

function toggleCategory(cat: CategoryRef) {
    const idx = tempSelectedCategories.value.findIndex(s => s.id === cat.id);
    if (idx === -1) {
        tempSelectedCategories.value.push(cat);
    } else {
        tempSelectedCategories.value.splice(idx, 1);
    }
}

function saveAndClose() {
    emit('update-categories', [...tempSelectedCategories.value]);
    showModal.value = false;
}

// ── Game mechanics descriptions & translation computed ──────────────────────
const tSpec = computed(() => {
    const isEn = locale.value === 'en';
    const isPt = locale.value === 'pt';
    
    return {
        classic: {
            title: isEn ? "Classic Tuti" : isPt ? "Tuti Clássico" : "Tuti Clásico",
            subtitle: isEn ? "Fill category columns" : isPt ? "Preencha as categorias" : "Llenar columnas de categorías",
        },
        impostor: {
            title: isEn ? "The Impostor" : isPt ? "O Impostor" : "El Impostor",
            subtitle: isEn ? "Find the infiltrator" : isPt ? "Encontre o infiltrado" : "Encontrar al infiltrado",
        },
    };
});
</script>

<template>
    <div class="lg:col-span-8 bg-panel-base/30 border-2 border-white/10 rounded-2xl shadow-game-panel flex flex-col lg:h-full lg:min-h-0 lg:overflow-hidden relative z-10 backdrop-blur-md">
        
        <!-- Premium Gartic-Phone Tab Header -->
        <div class="sticky top-0 z-20 p-1 border-b border-white/10 bg-panel-base flex gap-1 shadow-md select-none rounded-t-2xl">
            <button
                @click="activeTab = 'modes'"
                class="flex-1 py-2.5 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 border cursor-pointer"
                :class="activeTab === 'modes'
                    ? 'bg-action-primary/10 border-action-primary text-action-primary shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                    : 'border-transparent text-ink-soft hover:text-ink-main hover:bg-white/5'"
            >
                🎮 {{ t('lobby.gameMode.title', 'Modos de Juego') }}
            </button>
            <button
                @click="activeTab = 'custom'"
                class="flex-1 py-2.5 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 border cursor-pointer"
                :class="activeTab === 'custom'
                    ? 'bg-action-blue/10 border-action-blue text-action-blue shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                    : 'border-transparent text-ink-soft hover:text-ink-main hover:bg-white/5'"
            >
                ⚙️ {{ t('lobby.settings.title', 'Ajustes Personalizados') }}
            </button>
        </div>

        <!-- Tab Body Container -->
        <div class="flex-1 overflow-y-auto p-4 space-y-2.5 lg:scrollbar-thin min-h-0 relative z-10">

            <!-- ───── TAB 1: MODOS DE JUEGO (Preestablecidos) ───── -->
            <div v-if="activeTab === 'modes'" class="space-y-4 animate-in fade-in duration-300">
                <ModeSelector
                    :config="props.config"
                    :categories="props.categories"
                    :amIHost="props.amIHost"
                    :tSpec="tSpec"
                    @update-config="(field, value) => emit('update-config', field, value)"
                    @open-modal="openModal"
                    @open-tutorial="(mode) => emit('open-tutorial', mode)"
                />
            </div>

            <!-- ───── TAB 2: CONFIGURACIÓN (Ajustes Personalizados) ───── -->
            <div v-else class="space-y-3.5 animate-in fade-in duration-300" :class="{ 'opacity-85 pointer-events-none select-none': !props.amIHost }">
                
                <!-- Opciones Globales Sub-grid: Presets + Lang -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <!-- Lobby Presets -->
                    <div class="bg-panel-input/35 rounded-2xl border border-white/10 shadow-inner p-3">
                        <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2">⚡ {{ t('lobby.settings.presets.title', 'Ajustes Rápidos') }}</label>
                        <div class="flex gap-2">
                            <button v-for="preset in [
                                { key: 'fast', label: t('lobby.settings.presets.fast', '⚡ Rápido') },
                                { key: 'party', label: t('lobby.settings.presets.party', '🎉 Fiesta') },
                                { key: 'pro', label: t('lobby.settings.presets.pro', '🧠 Pro') }
                            ]" :key="preset.key"
                                :disabled="!props.amIHost"
                                @click="applyPreset(preset.key as 'fast' | 'party' | 'pro')"
                                class="flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wide border transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm min-h-[44px]"
                                :class="[
                                    activePreset === preset.key
                                        ? preset.key === 'fast'
                                            ? 'bg-action-blue/20 border-action-blue text-action-blue shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                                            : preset.key === 'party'
                                                ? 'bg-action-primary/20 border-action-primary text-action-primary shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                                                : 'bg-action-warning/20 border-action-warning text-action-warning shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                                        : 'bg-panel-card/65 border-white/10 text-ink-soft hover:bg-panel-card hover:text-ink-main hover:border-white/30'
                                ]"
                            >
                                {{ preset.label }}
                            </button>
                        </div>
                    </div>

                    <!-- Lang selector -->
                    <div class="bg-panel-input/35 rounded-2xl border border-white/10 shadow-inner p-3">
                        <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2">💬 {{ t('lobby.settings.language') }}</label>
                        <div class="flex gap-2">
                            <button v-for="lang in [{ code:'es', label:'🇪🇸 Español' }, { code:'en', label:'🇬🇧' }, { code:'pt', label:'🇧🇷' }]" :key="lang.code"
                                :disabled="!props.amIHost"
                                @click="emit('update-config', 'lang', lang.code)"
                                class="flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wide border transition-all cursor-pointer min-h-[44px]"
                                :class="[
                                    props.config.lang === lang.code || (!props.config.lang && lang.code === 'es')
                                        ? 'bg-action-warning/20 border-action-warning text-action-warning shadow-sm'
                                        : 'bg-panel-card/65 border-white/10 text-ink-soft hover:bg-panel-card hover:text-ink-main hover:border-white/30'
                                ]"
                            >{{ lang.label }}</button>
                        </div>
                    </div>
                </div>

                <!-- ── CLASSIC MODE SETTINGS PANEL ── -->
                <template v-if="props.config.mode === 'CLASSIC'">
                    <ClassicConfig
                        :config="props.config"
                        :amIHost="props.amIHost"
                        :timeLimitOptions="timeLimitOptions"
                        :votingOptions="votingOptions"
                        @update-config="(field, value) => emit('update-config', field, value)"
                        @update-mutator="(mutator, value) => emit('update-mutator', mutator, value)"
                    />
                </template>

                <!-- ── IMPOSTOR MODE SETTINGS PANEL ── -->
                <template v-else-if="props.config.mode === 'IMPOSTOR'">
                    <ImpostorConfig
                        :config="props.config"
                        :amIHost="props.amIHost"
                        :impostorTypingOptions="impostorTypingOptions"
                        :impostorVotingOptions="impostorVotingOptions"
                        @update-config="(field, value) => emit('update-config', field, value)"
                    />
                </template>
            </div>
        </div>
    </div>

    <!-- Category Editor Modal (Teleport to body for z-index isolation) -->
    <Teleport to="body">
        <div v-if="showModal"
             class="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-ink-main/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div class="bg-panel-base border-[3px] border-white/50 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <!-- Modal Header -->
                <div class="p-4 border-b-2 border-white/50 flex items-center justify-between bg-panel-card/80 flex-none">
                    <h3 class="text-lg font-black text-ink-main uppercase tracking-widest">
                        {{ props.config.mode === 'IMPOSTOR' ? 'Categorías de Impostor' : t('lobby.categoriesSelector.modalTitle') }}
                    </h3>
                    <div class="text-xs font-bold text-ink-main bg-panel-input px-3 py-1 rounded-full border-2 border-white/10 shadow-sm">
                        {{ tempSelectedCategories.length }}
                    </div>
                </div>

                <!-- Search + Package Tabs (Classic Mode only) -->
                <div class="p-4 bg-panel-card/30 space-y-3 flex-none border-b-2 border-white/30">
                    <div class="relative">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
                        <input v-model="searchQuery" type="text" placeholder="Buscar categoría..."
                               class="w-full bg-panel-input border-2 border-white/10 pl-[3.25rem] pr-4 py-3 text-ink-main placeholder-ink-muted focus:border-action-primary outline-none transition-colors font-bold text-sm rounded-xl shadow-inner">
                    </div>
                    
                    <!-- Pestañas de Paquetes en modo clásico -->
                    <div v-if="props.config.mode === 'CLASSIC'" class="flex gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
                        <button @click="activeModalTab = 'base'; searchQuery = ''"
                            :class="['px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all border-2 whitespace-nowrap cursor-pointer',
                                activeModalTab === 'base' && !searchQuery ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-sm' : 'border-white/10 bg-panel-input text-ink-soft hover:text-ink-main hover:bg-panel-card']">
                            📦 Base (Gratis)
                        </button>

                        <button @click="activeModalTab = 'pack_futbol'; searchQuery = ''"
                            :class="['px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all border-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer',
                                activeModalTab === 'pack_futbol' && !searchQuery ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-sm' : 'border-white/10 bg-panel-input text-ink-soft hover:text-ink-main hover:bg-panel-card']">
                            ⚽ Fútbol
                            <span v-if="!unlockedFrames.includes('pack_futbol')" class="text-[8px] opacity-75">🔒</span>
                        </button>

                        <button @click="activeModalTab = 'pack_musica'; searchQuery = ''"
                            :class="['px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all border-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer',
                                activeModalTab === 'pack_musica' && !searchQuery ? 'bg-violet-500/20 border-violet-500 text-violet-300 shadow-sm' : 'border-white/10 bg-panel-input text-ink-soft hover:text-ink-main hover:bg-panel-card']">
                            🎵 Música
                            <span v-if="!unlockedFrames.includes('pack_musica')" class="text-[8px] opacity-75">🔒</span>
                        </button>

                        <button @click="activeModalTab = 'pack_fun'; searchQuery = ''"
                            :class="['px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all border-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer',
                                activeModalTab === 'pack_fun' && !searchQuery ? 'bg-orange-500/20 border-orange-500 text-orange-300 shadow-sm' : 'border-white/10 bg-panel-input text-ink-soft hover:text-ink-main hover:bg-panel-card']">
                            🎉 Fun
                            <span v-if="!unlockedFrames.includes('pack_fun')" class="text-[8px] opacity-75">🔒</span>
                        </button>

                        <button @click="activeModalTab = 'pack_gamer'; searchQuery = ''"
                            :class="['px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all border-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer',
                                activeModalTab === 'pack_gamer' && !searchQuery ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm' : 'border-white/10 bg-panel-input text-ink-soft hover:text-ink-main hover:bg-panel-card']">
                            🎮 Gamer
                            <span v-if="!unlockedFrames.includes('pack_gamer')" class="text-[8px] opacity-75">🔒</span>
                        </button>

                        <button @click="activeModalTab = 'pack_cine'; searchQuery = ''"
                            :class="['px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all border-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer',
                                activeModalTab === 'pack_cine' && !searchQuery ? 'bg-pink-500/20 border-pink-500 text-pink-300 shadow-sm' : 'border-white/10 bg-panel-input text-ink-soft hover:text-ink-main hover:bg-panel-card']">
                            🍿 Cine/TV
                            <span v-if="!unlockedFrames.includes('pack_cine')" class="text-[8px] opacity-75">🔒</span>
                        </button>

                        <button @click="activeModalTab = 'selected'; searchQuery = ''"
                            :class="['px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all border-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ml-auto',
                                activeModalTab === 'selected' && !searchQuery ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm' : 'border-white/10 bg-panel-input text-ink-soft hover:text-ink-main hover:bg-panel-card']">
                            ⭐ Seleccionadas ({{ tempSelectedCategories.length }})
                        </button>
                    </div>
                </div>

                <!-- Category Grid / Locked Preview -->
                <div class="flex-1 overflow-y-auto content-start bg-panel-input min-h-0 shadow-inner">
                    <div v-if="isLoadingDb" class="flex flex-col items-center justify-center py-20 gap-3 text-ink-muted font-bold">
                        <div class="w-10 h-10 rounded-full border-4 border-white/10 border-t-action-primary animate-spin"></div>
                        <span>Cargando catálogo...</span>
                    </div>

                    <!-- CASO: PAQUETE BLOQUEADO — DISEÑO DOS COLUMNAS -->
                    <div v-else-if="props.config.mode === 'CLASSIC' && activeModalTab !== 'base' && activeModalTab !== 'selected' && !unlockedFrames.includes(activeModalTab) && !searchQuery"
                         class="h-full flex flex-col sm:flex-row animate-in">

                        <!-- Columna Izquierda: Identidad del Pack + CTA -->
                        <div class="flex flex-col items-center justify-center gap-5 p-8 sm:w-[42%] sm:border-r border-white/10 text-center"
                             :class="{
                                 'bg-blue-900/15':   activeModalTab === 'pack_futbol',
                                 'bg-violet-900/15': activeModalTab === 'pack_musica',
                                 'bg-orange-900/15': activeModalTab === 'pack_fun',
                                 'bg-emerald-900/15':activeModalTab === 'pack_gamer',
                                 'bg-pink-900/15':   activeModalTab === 'pack_cine',
                             }">
                            <!-- Ícono -->
                            <div class="text-7xl pack-icon-bounce">
                                <template v-if="activeModalTab === 'pack_futbol'">⚽</template>
                                <template v-else-if="activeModalTab === 'pack_musica'">🎵</template>
                                <template v-else-if="activeModalTab === 'pack_fun'">🎉</template>
                                <template v-else-if="activeModalTab === 'pack_gamer'">🎮</template>
                                <template v-else-if="activeModalTab === 'pack_cine'">🍿</template>
                            </div>
                            <!-- Nombre -->
                            <div class="space-y-1">
                                <h4 class="text-lg font-black text-white uppercase tracking-wider">
                                    <template v-if="activeModalTab === 'pack_futbol'">Expansión Fútbol</template>
                                    <template v-else-if="activeModalTab === 'pack_musica'">Pack Música</template>
                                    <template v-else-if="activeModalTab === 'pack_fun'">Pack Fun</template>
                                    <template v-else-if="activeModalTab === 'pack_gamer'">Pack Gamer</template>
                                    <template v-else-if="activeModalTab === 'pack_cine'">Pack Cine y TV</template>
                                </h4>
                                <p class="text-ink-soft text-[11px] font-bold leading-snug max-w-[200px] mx-auto">
                                    <template v-if="activeModalTab === 'pack_futbol'">Deporte, atletas y equipos del mundo del fútbol.</template>
                                    <template v-else-if="activeModalTab === 'pack_musica'">Instrumentos, reggaeton y bandas de rock.</template>
                                    <template v-else-if="activeModalTab === 'pack_fun'">Categorías creativas y de humor para animar la partida.</template>
                                    <template v-else-if="activeModalTab === 'pack_gamer'">Videojuegos, streamers, apps y tecnología.</template>
                                    <template v-else-if="activeModalTab === 'pack_cine'">Películas, series, actores, villanos y personajes icónicos.</template>
                                </p>
                            </div>
                            <!-- Precio + CTA -->
                            <div class="w-full pt-2 space-y-2">
                                <span class="text-[9px] font-black text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                                    <CoinIcon class="w-3.5 h-3.5" /> {{ activeModalTab === 'pack_gamer' ? 250 : activeModalTab === 'pack_cine' ? 300 : 150 }} monedas
                                </span>
                                <button @click="handleRedirectToStore"
                                        class="w-full py-3.5 bg-amber-500 text-zinc-950 rounded-xl font-black uppercase text-[11px] tracking-wider hover:bg-amber-400 transition-colors shadow-lg cursor-pointer">
                                    Ir a la Tienda 🛒
                                </button>
                            </div>
                        </div>

                        <!-- Columna Derecha: Categorías incluidas -->
                        <div class="p-6 sm:w-[58%] overflow-y-auto">
                            <h5 class="text-[10px] font-black text-ink-muted uppercase tracking-widest mb-4">Incluye estas categorías:</h5>
                            <div class="grid grid-cols-1 gap-2">
                                <!-- Fut -->
                                <template v-if="activeModalTab === 'pack_futbol'">
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>⚽</span> Deporte</div>
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>🏅</span> Atleta/Deportista</div>
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>🏆</span> Equipo Deportivo</div>
                                </template>
                                <!-- Música -->
                                <template v-else-if="activeModalTab === 'pack_musica'">
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>🎸</span> Instrumento Musical</div>
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>🎤</span> Título de Canción de Reggaeton</div>
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>🤘</span> Nombre de banda de rock</div>
                                </template>
                                <!-- Fun -->
                                <template v-else-if="activeModalTab === 'pack_fun'">
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>😅</span> Excusa para llegar tarde</div>
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>💔</span> Motivo de ruptura</div>
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>🤑</span> Lo primero que harías si ganas la lotería</div>
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>😠</span> Insulto (suave)</div>
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>🫦</span> Palabra que rime con “Amor”</div>
                                </template>
                                <!-- Gamer -->
                                <template v-else-if="activeModalTab === 'pack_gamer'">
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>🎮</span> Videojuego</div>
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>📺</span> Youtuber/Streamer</div>
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>💻</span> Marca de Tecnología</div>
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>📱</span> App Móvil</div>
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>🌐</span> Sitio Web</div>
                                </template>
                                <!-- Cine -->
                                <template v-else-if="activeModalTab === 'pack_cine'">
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>🎬</span> Película</div>
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>📡</span> Serie de TV</div>
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>🌟</span> Actor/Actriz</div>
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>😈</span> Villano</div>
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>🦸</span> Superhéroe</div>
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>🧙</span> Personaje Ficticio</div>
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>🧑‍🍳</span> Ingrediente de Cocina</div>
                                    <div class="bg-panel-base/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 text-xs font-bold text-white/80"><span>🍰</span> Postre</div>
                                </template>
                            </div>
                        </div>
                    </div>

                    <!-- CASO NORMAL: LISTA DE CATEGORÍAS DISPONIBLES -->
                    <div v-else class="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
                        <button v-for="cat in filteredCategories" :key="cat.name"
                            @click="toggleCategory({ id: cat.id || cat.name.toLowerCase(), name: cat.name })"
                            class="text-left px-4 py-4 rounded-2xl text-xs font-bold border-[3px] transition-all duration-200 flex items-center justify-between active:scale-95 shadow-sm min-h-[44px] cursor-pointer"
                            :class="tempSelectedCategories.some(s => s.name === cat.name)
                                ? 'bg-action-blue border-blue-400 text-white'
                                : 'bg-panel-card border-white/10 text-ink-main hover:bg-panel-input hover:border-action-primary'"
                        >
                            {{ cat.name }}
                            <span v-if="tempSelectedCategories.some(s => s.name === cat.name)" class="text-lg font-black leading-none">✓</span>
                        </button>
                    </div>

                    <div v-if="!isLoadingDb && filteredCategories.length === 0 && (activeModalTab === 'base' || activeModalTab === 'selected' || unlockedFrames.includes(activeModalTab) || searchQuery)" 
                         class="text-center py-16 text-ink-muted font-black uppercase tracking-widest text-sm flex flex-col items-center gap-3">
                        <span class="text-5xl">👻</span>
                        Sin resultados
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="p-4 border-t-2 border-white/50 bg-panel-base flex gap-3 flex-none">
                    <TButton variant="secondary" size="md" class="flex-1 py-4" @click="showModal = false">{{ t('lobby.categoriesSelector.cancel') }}</TButton>
                    <TButton variant="primary" size="md" class="flex-1 py-4" @click="saveAndClose">{{ t('lobby.categoriesSelector.save') }}</TButton>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
.animate-in {
  animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── Locked Pack Two-Column Layout ── */
.pack-category-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.875rem;
  border-width: 1px;
  border-style: solid;
  background-color: rgba(255, 255, 255, 0.04);
  transition: border-color 0.2s ease, background-color 0.2s ease;
  cursor: default;
}
.pack-category-card:hover {
  background-color: rgba(255, 255, 255, 0.07);
}
.pack-category-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  flex-shrink: 0;
}

.pack-icon-bounce {
  animation: iconFloat 3s ease-in-out infinite;
}
@keyframes iconFloat {
  0%, 100% { transform: translateY(0px);  }
  50%       { transform: translateY(-8px); }
}
</style>
