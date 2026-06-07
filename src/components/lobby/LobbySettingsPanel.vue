<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { supabase } from '../../lib/supabase';
import { MASTER_CATEGORIES } from '../../../shared/engines/categories';
import type { CategoryRef, GameConfig } from '../../../shared/types';
import TButton from '../ui/TButton.vue';

const { t, locale } = useI18n();

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

// Generic numeric input handler
function handleNumericInput(field: string, rawValue: string, min: number, max: number, options?: number[]) {
    let val = parseInt(rawValue, 10);
    if (isNaN(val)) return;
    if (options && options.length > 0) {
        val = options.reduce((prev, curr) =>
            Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev
        );
    }
    val = Math.max(min, Math.min(max, val));
    emit('update-config', field, val);
}
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
const activeFilterTag = ref<string | null>(null);
const tempSelectedCategories = ref<CategoryRef[]>([]);

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

// Computed filtering for modal
const availableTags = computed(() => {
    if (props.config.mode === 'IMPOSTOR') return ['BASE DE DATOS', 'POPULAR'];
    const tags = new Set<string>();
    MASTER_CATEGORIES.forEach(c => c.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
});

const filteredCategories = computed(() => {
    const query = searchQuery.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    if (props.config.mode === 'IMPOSTOR') {
        return dbCategories.value.filter(cat => cat.normalizedName.includes(query));
    }

    return NORMALIZED_MASTER_CATEGORIES.filter(cat => {
        if (activeFilterTag.value && !cat.tags.includes(activeFilterTag.value)) return false;
        return cat.normalizedName.includes(query);
    });
});

function openModal() {
    tempSelectedCategories.value = [...props.categories];
    searchQuery.value = '';
    activeFilterTag.value = null;
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
            badge1: isEn ? "✍️ Fast Writing" : isPt ? "✍️ Escrita Veloz" : "✍️ Escritura Veloz",
            badge1Desc: isEn ? "Complete the categories before someone says STOP!" : isPt ? "Preencha as categorias antes que alguém diga STOP!" : "¡Completa las categorías antes de que alguien diga BASTA!",
            badge2: isEn ? "🗳️ Open Vote" : isPt ? "🗳️ Votação Aberta" : "🗳️ Votación Abierta",
            badge2Desc: isEn ? "Everyone judges answers. Beware of duplicates!" : isPt ? "Todos julgam as respostas. Cuidado com duplicatas!" : "Todos juzgan las respuestas. ¡Cuidado con las repetidas!",
            badge3: isEn ? "🏆 Classic Scoring" : isPt ? "🏆 Pontuação Clássica" : "🏆 Puntuación Clásica",
            badge3Desc: isEn ? "+10 for unique words, +5 for repeated ones." : isPt ? "+10 para palavras únicas, +5 para repetidas." : "+10 por palabras únicas, +5 por repetidas."
        },
        impostor: {
            title: isEn ? "The Impostor" : isPt ? "O Impostor" : "El Impostor",
            subtitle: isEn ? "Find the infiltrator" : isPt ? "Encontre o infiltrado" : "Encontrar al infiltrado",
            badge1: isEn ? "🕵️‍♂️ Infiltration" : isPt ? "🕵️‍♂️ Infiltração" : "🕵️‍♂️ Infiltración",
            badge1Desc: isEn ? "One player is the Impostor and doesn't know the secret word." : isPt ? "Um jogador é o Impostor e não conhece a palavra secreta." : "Un jugador es el Impostor y no conoce la palabra secreta.",
            badge2: isEn ? "🤫 Credible Bluff" : isPt ? "🤫 Blefe Crível" : "🤫 Farol Creíble",
            badge2Desc: isEn ? "Type a word that fits the theme to avoid suspicion." : isPt ? "Digite uma palavra que caiba no tema para evitar suspeitas." : "Escribe una palabra que encaje en el tema para camuflarte.",
            badge3: isEn ? "🗳️ Secret Judgment" : isPt ? "🗳️ Julgamento Secreto" : "🗳️ Juicio Secreto",
            badge3Desc: isEn ? "The Room debates and votes on who is lying." : isPt ? "A sala debate e vota em quem está mentindo." : "El Tribunal debate y vota quién es el impostor."
        },
        categories: isEn ? "Categories" : isPt ? "Categorias" : "Categorías",
        edit: isEn ? "✏️ Edit" : isPt ? "✏️ Editar" : "✏️ Editar",
        randomSelection: isEn ? "Random Categories" : isPt ? "Categorias Aleatórias" : "Categorías Aleatorias",
        randomSelectionDesc: isEn ? "4 categories will be picked randomly on start." : isPt ? "4 categorias serão sorteadas ao iniciar." : "4 categorías serán elegidas al azar al iniciar.",
        impostorDesc: isEn ? "Categories surprise of the catalogue" : isPt ? "Categorias surpresa do catálogo" : "Categorías sorpresa del catálogo",
        impostorDescSub: isEn ? "If empty, the game will pick randomly from our database." : isPt ? "Se estiver vazio, o jogo sorteará do nosso catálogo." : "Si no seleccionas ninguna, el juego elegirá al azar de la base de datos."
    };
});
</script>

<template>
    <div class="lg:col-span-8 bg-panel-base/30 border-2 border-white/10 rounded-2xl shadow-game-panel flex flex-col flex-1 h-full min-h-0 overflow-hidden relative z-10 backdrop-blur-md">
        
        <!-- Premium Gartic-Phone Tab Header -->
        <div class="flex-none p-1 border-b border-white/10 bg-panel-card/35 flex gap-1 shadow-md select-none">
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
                
                <!-- Gartic Phone style 2x2 grid of games -->
                <div class="grid grid-cols-2 gap-3.5">
                    <!-- Classic Card -->
                    <div
                        @click="props.amIHost && emit('update-config', 'mode', 'CLASSIC')"
                        class="relative p-4 rounded-2xl border-[3px] transition-all duration-300 text-center group min-h-[110px] flex flex-col items-center justify-center select-none"
                        :class="[
                            props.config.mode === 'CLASSIC'
                                ? 'border-action-primary bg-action-primary/10 shadow-[0_4px_16px_rgba(245,158,11,0.15)] scale-[1.01]'
                                : 'border-white/10 bg-panel-card/45 hover:border-action-primary/50 hover:bg-panel-input/50 hover:scale-[1.02]',
                            !props.amIHost ? 'cursor-not-allowed opacity-60 hover:scale-100' : 'cursor-pointer'
                        ]"
                    >
                        <!-- Top-Left Pencil/Edit button (Host-only, selected only) -->
                        <button v-if="props.amIHost && props.config.mode === 'CLASSIC'"
                            @click.stop="openModal"
                            class="absolute top-2 left-2 w-8 h-8 rounded-xl bg-panel-card/90 border border-white/10 hover:border-action-primary text-action-primary hover:bg-panel-input flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer z-20"
                            title="Editar Categorías"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                            </svg>
                        </button>

                        <!-- Top-Right Help/Tutorial button (selected only) -->
                        <button v-if="props.config.mode === 'CLASSIC'"
                            @click.stop="emit('open-tutorial', 'CLASSIC')"
                            class="absolute top-2 right-2 w-8 h-8 rounded-xl bg-panel-card/90 border border-white/10 hover:border-action-info text-action-info hover:bg-panel-input flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer z-20"
                            title="Cómo Jugar"
                        >
                            <span class="text-xs font-black">❓</span>
                        </button>

                        <div class="text-3xl mb-1 group-hover:scale-110 transition-transform drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">🎯</div>
                        <h4 class="text-ink-main font-black text-xs tracking-wider leading-none uppercase">{{ tSpec.classic.title }}</h4>
                        <p class="text-ink-soft text-[9px] font-bold mt-1.5 leading-none opacity-85">{{ tSpec.classic.subtitle }}</p>
                        
                        <!-- Compact category count status -->
                        <div class="mt-2.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-wider text-ink-soft select-none leading-none">
                            {{ props.categories.length > 0 ? `${props.categories.length} Categorías` : '4 Categorías (Al Azar)' }}
                        </div>
                    </div>
                    
                    <!-- Impostor Card -->
                    <div
                        @click="props.amIHost && emit('update-config', 'mode', 'IMPOSTOR')"
                        class="relative p-4 rounded-2xl border-[3px] transition-all duration-300 text-center group min-h-[110px] flex flex-col items-center justify-center select-none"
                        :class="[
                            props.config.mode === 'IMPOSTOR'
                                ? 'border-action-error bg-action-error/10 shadow-[0_4px_16px_rgba(239,68,68,0.15)] scale-[1.01]'
                                : 'border-white/10 bg-panel-card/45 hover:border-action-error/50 hover:bg-panel-input/50 hover:scale-[1.02]',
                            !props.amIHost ? 'cursor-not-allowed opacity-60 hover:scale-100' : 'cursor-pointer'
                        ]"
                    >
                        <!-- Top-Left Pencil/Edit button (Host-only, selected only) -->
                        <button v-if="props.amIHost && props.config.mode === 'IMPOSTOR'"
                            @click.stop="openModal"
                            class="absolute top-2 left-2 w-8 h-8 rounded-xl bg-panel-card/90 border border-white/10 hover:border-action-primary text-action-primary hover:bg-panel-input flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer z-20"
                            title="Editar Categorías"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                            </svg>
                        </button>

                        <!-- Top-Right Help/Tutorial button (selected only) -->
                        <button v-if="props.config.mode === 'IMPOSTOR'"
                            @click.stop="emit('open-tutorial', 'IMPOSTOR')"
                            class="absolute top-2 right-2 w-8 h-8 rounded-xl bg-panel-card/90 border border-white/10 hover:border-action-info text-action-info hover:bg-panel-input flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer z-20"
                            title="Cómo Jugar"
                        >
                            <span class="text-xs font-black">❓</span>
                        </button>

                        <div class="text-3xl mb-1 group-hover:scale-110 transition-transform drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">🕵️</div>
                        <h4 class="text-ink-main font-black text-xs tracking-wider leading-none uppercase">{{ tSpec.impostor.title }}</h4>
                        <p class="text-ink-soft text-[9px] font-bold mt-1.5 leading-none opacity-85">{{ tSpec.impostor.subtitle }}</p>
                        
                        <!-- Compact category status -->
                        <div class="mt-2.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-wider text-ink-soft select-none leading-none">
                            {{ props.categories.length > 0 ? `${props.categories.length} Temas` : 'Catálogo Aleatorio' }}
                        </div>
                    </div>

                    <!-- Locked/Mystery Card 1 -->
                    <div
                        class="relative p-3.5 rounded-2xl border-2 border-dashed border-white/5 bg-panel-card/5 opacity-45 saturate-50 select-none flex flex-col items-center justify-center min-h-[110px] group transition-all duration-300 hover:opacity-60"
                    >
                        <div class="text-2xl mb-1 drop-shadow-sm group-hover:animate-bounce">🔒</div>
                        <h4 class="text-ink-muted font-heading font-black text-[10px] tracking-widest leading-none uppercase">PRÓXIMAMENTE</h4>
                        <p class="text-ink-muted text-[8px] font-bold mt-1 leading-none">Nuevo Juego 🤫</p>
                    </div>

                    <!-- Locked/Mystery Card 2 -->
                    <div
                        class="relative p-3.5 rounded-2xl border-2 border-dashed border-white/5 bg-panel-card/5 opacity-45 saturate-50 select-none flex flex-col items-center justify-center min-h-[110px] group transition-all duration-300 hover:opacity-60"
                    >
                        <div class="text-2xl mb-1 drop-shadow-sm group-hover:animate-bounce">🤫</div>
                        <h4 class="text-ink-muted font-heading font-black text-[10px] tracking-widest leading-none uppercase">PRÓXIMAMENTE</h4>
                        <p class="text-ink-muted text-[8px] font-bold mt-1 leading-none">¿Qué se vendrá? 👀</p>
                    </div>
                </div>
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
                                class="flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wide border transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
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
                                class="flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wide border transition-all cursor-pointer"
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
                    <div class="flex flex-col gap-2 bg-panel-card/15 p-2 rounded-2xl border border-white/5">
                        
                        <!-- Category Count (only when no manual categories selected) -->
                        <div v-if="!(props.config.classic?.categories?.length > 0)" class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 bg-panel-input/35 border border-white/10 rounded-xl hover:border-white/20 transition-all">
                            <div class="flex items-start gap-3 min-w-0">
                                <span class="text-xl flex-none leading-none mt-0.5">🎲</span>
                                <div class="flex flex-col min-w-0">
                                    <span class="text-ink-main font-heading font-black text-xs uppercase tracking-wide leading-none">{{ t('lobby.settings.classic.randomCategories') }}</span>
                                    <span class="text-ink-muted text-[9px] font-bold mt-1 leading-normal max-w-sm">
                                        {{ locale === 'en' ? 'Amount of random categories' : locale === 'pt' ? 'Quantidade de categorias aleatórias' : 'Cantidad de categorías que se elegirán al azar' }}
                                    </span>
                                </div>
                            </div>
                            <div class="relative w-36 sm:w-40 flex-none">
                                <select
                                    :disabled="!props.amIHost"
                                    :value="props.config.classic?.categoryCount ?? 4"
                                    @change="handleNumericInput('classic.categoryCount', ($event.target as HTMLSelectElement).value, 1, 10)"
                                    class="w-full bg-panel-card border-[2px] border-white/10 text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner h-9 select-none"
                                >
                                    <option v-for="n in 10" :key="n" :value="n" class="bg-panel-card">{{ n }} {{ n === 1 ? 'Categoría' : 'Categorías' }}</option>
                                </select>
                                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[9px]">▼</span>
                            </div>
                        </div>

                        <!-- Rounds stepper -->
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 bg-panel-input/35 border border-white/10 rounded-xl hover:border-white/20 transition-all">
                            <div class="flex items-start gap-3 min-w-0">
                                <span class="text-xl flex-none leading-none mt-0.5">🔁</span>
                                <div class="flex flex-col min-w-0">
                                    <span class="text-ink-main font-heading font-black text-xs uppercase tracking-wide leading-none">{{ t('lobby.settings.classic.rounds') }}</span>
                                    <span class="text-ink-muted text-[9px] font-bold mt-1 leading-normal max-w-sm">
                                        {{ locale === 'en' ? 'Number of game rounds' : locale === 'pt' ? 'Número de rodadas do jogo' : 'Número de rondas de la partida' }}
                                    </span>
                                </div>
                            </div>
                            <div class="relative w-36 sm:w-40 flex-none">
                                <select
                                    :disabled="!props.amIHost"
                                    :value="props.config.classic?.rounds || 3"
                                    @change="handleNumericInput('classic.rounds', ($event.target as HTMLSelectElement).value, 1, 20)"
                                    class="w-full bg-panel-card border-[2px] border-white/10 text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner h-9 select-none"
                                >
                                    <option v-for="n in 10" :key="n" :value="n" class="bg-panel-card">{{ n }} {{ n === 1 ? 'Ronda' : 'Rondas' }}</option>
                                    <option :value="12" class="bg-panel-card">12 Rondas</option>
                                    <option :value="15" class="bg-panel-card">15 Rondas</option>
                                    <option :value="20" class="bg-panel-card">20 Rondas</option>
                                </select>
                                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[9px]">▼</span>
                            </div>
                        </div>

                        <!-- Time limit stepper -->
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 bg-panel-input/35 border border-white/10 rounded-xl hover:border-white/20 transition-all">
                            <div class="flex items-start gap-3 min-w-0">
                                <span class="text-xl flex-none leading-none mt-0.5">⏱️</span>
                                <div class="flex flex-col min-w-0">
                                    <span class="text-ink-main font-heading font-black text-xs uppercase tracking-wide leading-none">{{ t('lobby.settings.classic.timeLimit') }}</span>
                                    <span class="text-ink-muted text-[9px] font-bold mt-1 leading-normal max-w-sm">
                                        {{ locale === 'en' ? 'Time limit to write words per round' : locale === 'pt' ? 'Tempo para escrever palavras por rodada' : 'Tiempo para escribir palabras en cada ronda' }}
                                    </span>
                                </div>
                            </div>
                            <div class="relative w-36 sm:w-40 flex-none">
                                <select
                                    :disabled="!props.amIHost"
                                    :value="props.config.classic?.timeLimit || 60"
                                    @change="handleNumericInput('classic.timeLimit', ($event.target as HTMLSelectElement).value, 30, 180, timeLimitOptions)"
                                    class="w-full bg-panel-card border-[2px] border-white/10 text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner h-9 select-none"
                                >
                                    <option v-for="opt in timeLimitOptions" :key="opt" :value="opt" class="bg-panel-card">{{ opt }} Segundos</option>
                                </select>
                                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[9px]">▼</span>
                            </div>
                        </div>

                        <!-- Voting duration stepper -->
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 bg-panel-input/35 border border-white/10 rounded-xl hover:border-white/20 transition-all">
                            <div class="flex items-start gap-3 min-w-0">
                                <span class="text-xl flex-none leading-none mt-0.5">🗳️</span>
                                <div class="flex flex-col min-w-0">
                                    <span class="text-ink-main font-heading font-black text-xs uppercase tracking-wide leading-none">{{ t('lobby.settings.classic.votingTime') }}</span>
                                    <span class="text-ink-muted text-[9px] font-bold mt-1 leading-normal max-w-sm">
                                        {{ locale === 'en' ? 'Time to vote and validate answers' : locale === 'pt' ? 'Tempo para votar e qualificar respostas' : 'Tiempo para calificar y votar las respuestas' }}
                                    </span>
                                </div>
                            </div>
                            <div class="relative w-36 sm:w-40 flex-none">
                                <select
                                    :disabled="!props.amIHost"
                                    :value="props.config.classic?.votingDuration || 20"
                                    @change="handleNumericInput('classic.votingDuration', ($event.target as HTMLSelectElement).value, 10, 120, votingOptions)"
                                    class="w-full bg-panel-card border-[2px] border-white/10 text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner h-9 select-none"
                                >
                                    <option v-for="opt in votingOptions" :key="opt" :value="opt" class="bg-panel-card">{{ opt }} Segundos</option>
                                </select>
                                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[9px]">▼</span>
                            </div>
                        </div>

                        <!-- Suicidal Stop -->
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 bg-panel-input/35 border border-white/10 rounded-xl hover:border-white/20 transition-all">
                            <div class="flex items-start gap-3 min-w-0">
                                <span class="text-xl flex-none leading-none mt-0.5">💀</span>
                                <div class="flex flex-col min-w-0">
                                    <span class="text-ink-main font-heading font-black text-xs uppercase tracking-wide leading-none">{{ t('lobby.settings.classic.suicidalStop') }}</span>
                                    <span class="text-ink-muted text-[9px] font-bold mt-1 leading-normal max-w-sm">{{ t('lobby.settings.classic.suicidalStopDesc') }}</span>
                                </div>
                            </div>
                            <div class="relative w-36 sm:w-40 flex-none">
                                <select
                                    :disabled="!props.amIHost"
                                    :value="props.config.classic?.mutators?.suicidalStop ? 'true' : 'false'"
                                    @change="emit('update-mutator', 'suicidalStop', ($event.target as HTMLSelectElement).value === 'true')"
                                    class="w-full bg-panel-card border-[2px] border-white/10 text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner h-9 select-none"
                                >
                                    <option value="false" class="bg-panel-card">DESACTIVADO</option>
                                    <option value="true" class="bg-panel-card text-action-error font-black">ACTIVADO 💀</option>
                                </select>
                                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[9px]">▼</span>
                            </div>
                        </div>

                        <!-- Anonymous Voting -->
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 bg-panel-input/35 border border-white/10 rounded-xl hover:border-white/20 transition-all">
                            <div class="flex items-start gap-3 min-w-0">
                                <span class="text-xl flex-none leading-none mt-0.5">🎭</span>
                                <div class="flex flex-col min-w-0">
                                    <span class="text-ink-main font-heading font-black text-xs uppercase tracking-wide leading-none">{{ t('lobby.settings.classic.anonymousVoting') }}</span>
                                    <span class="text-ink-muted text-[9px] font-bold mt-1 leading-normal max-w-sm">{{ t('lobby.settings.classic.anonymousVotingDesc') }}</span>
                                </div>
                            </div>
                            <div class="relative w-36 sm:w-40 flex-none">
                                <select
                                    :disabled="!props.amIHost"
                                    :value="props.config.classic?.mutators?.anonymousVoting ? 'true' : 'false'"
                                    @change="emit('update-mutator', 'anonymousVoting', ($event.target as HTMLSelectElement).value === 'true')"
                                    class="w-full bg-panel-card border-[2px] border-white/10 text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner h-9 select-none"
                                >
                                    <option value="false" class="bg-panel-card">DESACTIVADO</option>
                                    <option value="true" class="bg-panel-card text-action-blue font-black">ACTIVADO 🎭</option>
                                </select>
                                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[9px]">▼</span>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- ── IMPOSTOR MODE SETTINGS PANEL ── -->
                <template v-else-if="props.config.mode === 'IMPOSTOR'">
                    <div class="flex flex-col gap-2 bg-panel-card/15 p-2 rounded-2xl border border-white/5">
                        
                        <!-- Category Count stepper -->
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 bg-panel-input/35 border border-white/10 rounded-xl hover:border-white/20 transition-all">
                            <div class="flex items-start gap-3 min-w-0">
                                <span class="text-xl flex-none leading-none mt-0.5">📦</span>
                                <div class="flex flex-col min-w-0">
                                    <span class="text-ink-main font-heading font-black text-xs uppercase tracking-wide leading-none">{{ t('lobby.settings.impostor.categories') }}</span>
                                    <span class="text-ink-muted text-[9px] font-bold mt-1 leading-normal max-w-sm">
                                        {{ locale === 'en' ? 'Number of secret categories' : locale === 'pt' ? 'Número de temas secretos' : 'Número de temas secretos por ronda' }}
                                    </span>
                                </div>
                            </div>
                            <div class="relative w-36 sm:w-40 flex-none">
                                <select
                                    :disabled="!props.amIHost"
                                    :value="props.config.impostor?.categoryCount ?? 3"
                                    @change="handleNumericInput('impostor.categoryCount', ($event.target as HTMLSelectElement).value, 1, 8)"
                                    class="w-full bg-panel-card border-[2px] border-white/10 text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner h-9 select-none"
                                >
                                    <option v-for="n in 8" :key="n" :value="n" class="bg-panel-card">{{ n }} {{ n === 1 ? 'Categoría' : 'Categorías' }}</option>
                                </select>
                                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[9px]">▼</span>
                            </div>
                        </div>

                        <!-- Rounds stepper -->
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 bg-panel-input/35 border border-white/10 rounded-xl hover:border-white/20 transition-all">
                            <div class="flex items-start gap-3 min-w-0">
                                <span class="text-xl flex-none leading-none mt-0.5">🔁</span>
                                <div class="flex flex-col min-w-0">
                                    <span class="text-ink-main font-heading font-black text-xs uppercase tracking-wide leading-none">{{ t('lobby.settings.impostor.rounds') }}</span>
                                    <span class="text-ink-muted text-[9px] font-bold mt-1 leading-normal max-w-sm">
                                        {{ locale === 'en' ? 'Number of impostor rounds' : locale === 'pt' ? 'Número de rodadas de impostor' : 'Número de rondas de la partida' }}
                                    </span>
                                </div>
                            </div>
                            <div class="relative w-36 sm:w-40 flex-none">
                                <select
                                    :disabled="!props.amIHost"
                                    :value="props.config.impostor?.rounds || 3"
                                    @change="handleNumericInput('impostor.rounds', ($event.target as HTMLSelectElement).value, 1, 10)"
                                    class="w-full bg-panel-card border-[2px] border-white/10 text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner h-9 select-none"
                                >
                                    <option v-for="n in 10" :key="n" :value="n" class="bg-panel-card">{{ n }} {{ n === 1 ? 'Ronda' : 'Rondas' }}</option>
                                </select>
                                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[9px]">▼</span>
                            </div>
                        </div>

                        <!-- Typing time stepper -->
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 bg-panel-input/35 border border-white/10 rounded-xl hover:border-white/20 transition-all">
                            <div class="flex items-start gap-3 min-w-0">
                                <span class="text-xl flex-none leading-none mt-0.5">⏱️</span>
                                <div class="flex flex-col min-w-0">
                                    <span class="text-ink-main font-heading font-black text-xs uppercase tracking-wide leading-none">{{ t('lobby.settings.impostor.typingTime') }}</span>
                                    <span class="text-ink-muted text-[9px] font-bold mt-1 leading-normal max-w-sm">
                                        {{ locale === 'en' ? 'Time limit to write your word' : locale === 'pt' ? 'Tempo para escrever sua palavra' : 'Tiempo para escribir tu palabra' }}
                                    </span>
                                </div>
                            </div>
                            <div class="relative w-36 sm:w-40 flex-none">
                                <select
                                    :disabled="!props.amIHost"
                                    :value="props.config.impostor?.typingTime || 30"
                                    @change="handleNumericInput('impostor.typingTime', ($event.target as HTMLSelectElement).value, 10, 60, impostorTypingOptions)"
                                    class="w-full bg-panel-card border-[2px] border-white/10 text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner h-9 select-none"
                                >
                                    <option v-for="opt in impostorTypingOptions" :key="opt" :value="opt" class="bg-panel-card">{{ opt }} Segundos</option>
                                </select>
                                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[9px]">▼</span>
                            </div>
                        </div>

                        <!-- Voting time stepper -->
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 bg-panel-input/35 border border-white/10 rounded-xl hover:border-white/20 transition-all">
                            <div class="flex items-start gap-3 min-w-0">
                                <span class="text-xl flex-none leading-none mt-0.5">🗳️</span>
                                <div class="flex flex-col min-w-0">
                                    <span class="text-ink-main font-heading font-black text-xs uppercase tracking-wide leading-none">{{ t('lobby.settings.impostor.votingTime') }}</span>
                                    <span class="text-ink-muted text-[9px] font-bold mt-1 leading-normal max-w-sm">
                                        {{ locale === 'en' ? 'Time limit for discussion and voting' : locale === 'pt' ? 'Tempo para debate e votação' : 'Tiempo para debate y votación en el tribunal' }}
                                    </span>
                                </div>
                            </div>
                            <div class="relative w-36 sm:w-40 flex-none">
                                <select
                                    :disabled="!props.amIHost"
                                    :value="props.config.impostor?.votingTime || 40"
                                    @change="handleNumericInput('impostor.votingTime', ($event.target as HTMLSelectElement).value, 15, 120, impostorVotingOptions)"
                                    class="w-full bg-panel-card border-[2px] border-white/10 text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner h-9 select-none"
                                >
                                    <option v-for="opt in impostorVotingOptions" :key="opt" :value="opt" class="bg-panel-card">{{ opt }} Segundos</option>
                                </select>
                                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[9px]">▼</span>
                            </div>
                        </div>
                    </div>
                </template>
            </div>
        </div>
    </div>

    <!-- Category Editor Modal (Teleport to body for z-index isolation) -->
    <Teleport to="body">
        <div v-if="showModal"
             class="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-ink-main/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div class="bg-panel-base border-[3px] border-white/50 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
                <!-- Modal Header -->
                <div class="p-4 border-b-2 border-white/50 flex items-center justify-between bg-panel-card/80 flex-none">
                    <h3 class="text-lg font-black text-ink-main uppercase tracking-widest">
                        {{ props.config.mode === 'IMPOSTOR' ? 'Categorías de Impostor' : t('lobby.categoriesSelector.modalTitle') }}
                    </h3>
                    <div class="text-xs font-bold text-ink-main bg-panel-input px-3 py-1 rounded-full border-2 border-white/10 shadow-sm">
                        {{ tempSelectedCategories.length }}
                    </div>
                </div>

                <!-- Search + Tag Filters -->
                <div class="p-4 bg-panel-card/30 space-y-3 flex-none border-b-2 border-white/30">
                    <div class="relative">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
                        <input v-model="searchQuery" type="text" placeholder="Buscar categoría..."
                               class="w-full bg-panel-input border-2 border-white/10 pl-[3.25rem] pr-4 py-3 text-ink-main placeholder-ink-muted focus:border-action-primary outline-none transition-colors font-bold text-sm rounded-xl shadow-inner">
                    </div>
                    <!-- Tag filters scrollbar -->
                    <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
                        <button @click="activeFilterTag = null"
                            :class="['px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-all border-2 whitespace-nowrap',
                                !activeFilterTag ? 'bg-action-blue border-action-blue text-white shadow-sm' : 'border-white/10 bg-panel-input text-ink-soft hover:text-ink-main hover:bg-panel-card']">
                            Todo
                        </button>
                        <button v-for="tag in availableTags" :key="tag"
                            @click="activeFilterTag = activeFilterTag === tag ? null : tag"
                            :class="['px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-all border-2 whitespace-nowrap',
                                activeFilterTag === tag ? 'bg-action-primary border-action-primary text-panel-base shadow-sm' : 'border-white/10 bg-panel-input text-ink-soft hover:text-ink-main hover:bg-panel-card']">
                            {{ tag }}
                        </button>
                    </div>
                </div>

                <!-- Category Grid -->
                <div class="flex-1 overflow-y-auto p-4 content-start bg-panel-input min-h-0 shadow-inner">
                    <div v-if="isLoadingDb" class="flex flex-col items-center justify-center py-20 gap-3 text-ink-muted font-bold">
                        <div class="w-10 h-10 rounded-full border-4 border-white/10 border-t-action-primary animate-spin"></div>
                        <span>Cargando catálogo...</span>
                    </div>
                    <div v-else class="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <button v-for="cat in filteredCategories" :key="cat.name"
                            @click="toggleCategory({ id: cat.id || cat.name.toLowerCase(), name: cat.name })"
                            class="text-left px-4 py-4 rounded-2xl text-xs font-bold border-[3px] transition-all duration-200 flex items-center justify-between active:scale-95 shadow-sm"
                            :class="tempSelectedCategories.some(s => s.name === cat.name)
                                ? 'bg-action-blue border-blue-400 text-white'
                                : 'bg-panel-card border-white/10 text-ink-main hover:bg-panel-input hover:border-action-primary'"
                        >
                            {{ cat.name }}
                            <span v-if="tempSelectedCategories.some(s => s.name === cat.name)" class="text-lg font-black leading-none">✓</span>
                        </button>
                    </div>
                    <div v-if="!isLoadingDb && filteredCategories.length === 0" class="text-center py-16 text-ink-muted font-black uppercase tracking-widest text-sm flex flex-col items-center gap-3">
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
</style>
