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

// Classic Rules Steppers
const incrementRounds = () => {
    const val = props.config.classic?.rounds || 3;
    if (val < 20) emit('update-config', 'classic.rounds', val + 1);
};
const decrementRounds = () => {
    const val = props.config.classic?.rounds || 3;
    if (val > 1) emit('update-config', 'classic.rounds', val - 1);
};
const incrementTimeLimit = () => {
    const current = props.config.classic?.timeLimit || 60;
    const idx = timeLimitOptions.indexOf(current);
    if (idx < timeLimitOptions.length - 1) emit('update-config', 'classic.timeLimit', timeLimitOptions[idx + 1]);
};
const decrementTimeLimit = () => {
    const current = props.config.classic?.timeLimit || 60;
    const idx = timeLimitOptions.indexOf(current);
    if (idx > 0) emit('update-config', 'classic.timeLimit', timeLimitOptions[idx - 1]);
};
const incrementVotingDuration = () => {
    const current = props.config.classic?.votingDuration || 20;
    const idx = votingOptions.indexOf(current);
    if (idx < votingOptions.length - 1) emit('update-config', 'classic.votingDuration', votingOptions[idx + 1]);
};
const decrementVotingDuration = () => {
    const current = props.config.classic?.votingDuration || 20;
    const idx = votingOptions.indexOf(current);
    if (idx > 0) emit('update-config', 'classic.votingDuration', votingOptions[idx - 1]);
};
const incrementCategoryCount = () => {
    const val = props.config.classic?.categoryCount ?? 4;
    if (val < 10) emit('update-config', 'classic.categoryCount', val + 1);
};
const decrementCategoryCount = () => {
    const val = props.config.classic?.categoryCount ?? 4;
    if (val > 1) emit('update-config', 'classic.categoryCount', val - 1);
};

// Impostor Rules Steppers
const incrementImpostorRounds = () => {
    const val = props.config.impostor?.rounds || 3;
    if (val < 10) emit('update-config', 'impostor.rounds', val + 1);
};
const decrementImpostorRounds = () => {
    const val = props.config.impostor?.rounds || 3;
    if (val > 1) emit('update-config', 'impostor.rounds', val - 1);
};
const incrementImpostorTypingTime = () => {
    const val = props.config.impostor?.typingTime || 30;
    if (val < 60) emit('update-config', 'impostor.typingTime', val + 5);
};
const decrementImpostorTypingTime = () => {
    const val = props.config.impostor?.typingTime || 30;
    if (val > 10) emit('update-config', 'impostor.typingTime', val - 5);
};
const incrementImpostorVotingTime = () => {
    const val = props.config.impostor?.votingTime || 40;
    if (val < 120) emit('update-config', 'impostor.votingTime', val + 5);
};
const decrementImpostorVotingTime = () => {
    const val = props.config.impostor?.votingTime || 40;
    if (val > 15) emit('update-config', 'impostor.votingTime', val - 5);
};
const incrementImpostorCategoryCount = () => {
    const val = props.config.impostor?.categoryCount || 3;
    if (val < 8) emit('update-config', 'impostor.categoryCount', val + 1);
};
const decrementImpostorCategoryCount = () => {
    const val = props.config.impostor?.categoryCount || 3;
    if (val > 1) emit('update-config', 'impostor.categoryCount', val - 1);
};

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
const dbCategories = ref<{ id: string; name: string }[]>([]);
const isLoadingDb = ref(false);

async function fetchImpostorCategories() {
    if (props.config.mode !== 'IMPOSTOR') return;
    isLoadingDb.value = true;
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('id, name')
            .eq('game_mode', 'impostor');
        if (!error && data) {
            dbCategories.value = data;
        } else {
            throw error;
        }
    } catch (err) {
        console.warn('[ImpostorCategories] Failed to load remote categories, using local fallback.', err);
        dbCategories.value = [
            { id: '1', name: 'Animales' },
            { id: '2', name: 'Comida' },
            { id: '3', name: 'Profesiones' },
            { id: '4', name: 'Objetos cotidianos' },
            { id: '5', name: 'Películas de Cine' },
            { id: '6', name: 'Marcas de Consumo' },
            { id: '7', name: 'Superhéroes' },
            { id: '8', name: 'Instrumentos Musicales' }
        ];
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
        return dbCategories.value.filter(cat => {
            const normalized = cat.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return normalized.includes(query);
        });
    }

    return MASTER_CATEGORIES.filter(cat => {
        if (activeFilterTag.value && !cat.tags.includes(activeFilterTag.value)) return false;
        const normalized = cat.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return normalized.includes(query);
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
    <div class="lg:col-span-8 bg-panel-base/30 border-2 border-white/10 rounded-2xl shadow-game-panel flex flex-col lg:h-full lg:min-h-0 lg:overflow-hidden relative z-10 backdrop-blur-md">
        
        <!-- Premium Gartic-Phone Tab Header -->
        <div class="flex-none p-1 border-b border-white/10 bg-panel-card/35 flex gap-1 shadow-md select-none">
            <button
                @click="activeTab = 'modes'"
                class="flex-1 py-3.5 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 border cursor-pointer"
                :class="activeTab === 'modes'
                    ? 'bg-action-primary/10 border-action-primary text-action-primary shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                    : 'border-transparent text-ink-soft hover:text-ink-main hover:bg-white/5'"
            >
                🎮 {{ t('lobby.gameMode.title', 'Modos de Juego') }}
            </button>
            <button
                @click="activeTab = 'custom'"
                class="flex-1 py-3.5 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 border cursor-pointer"
                :class="activeTab === 'custom'
                    ? 'bg-action-blue/10 border-action-blue text-action-blue shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                    : 'border-transparent text-ink-soft hover:text-ink-main hover:bg-white/5'"
            >
                ⚙️ {{ t('lobby.settings.title', 'Ajustes Personalizados') }}
            </button>
        </div>

        <!-- Tab Body Container -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4 lg:scrollbar-thin min-h-0 relative z-10">

            <!-- ───── TAB 1: MODOS DE JUEGO (Preestablecidos) ───── -->
            <div v-if="activeTab === 'modes'" class="space-y-4 animate-in fade-in duration-300">
                
                <!-- Gartic Phone Grid of 2 active games -->
                <div class="grid grid-cols-2 gap-3.5">
                    <!-- Classic Card -->
                    <div
                        @click="props.amIHost && emit('update-config', 'mode', 'CLASSIC')"
                        class="relative p-3.5 rounded-2xl border-[3px] transition-all duration-300 text-center group min-h-[105px] flex flex-col items-center justify-center select-none"
                        :class="[
                            props.config.mode === 'CLASSIC'
                                ? 'border-action-primary bg-action-primary/10 shadow-[0_4px_16px_rgba(245,158,11,0.15)] scale-[1.01]'
                                : 'border-white/10 bg-panel-card/45 hover:border-action-primary/50 hover:bg-panel-input/50 hover:scale-[1.02]',
                            !props.amIHost ? 'cursor-not-allowed opacity-60 hover:scale-100' : 'cursor-pointer'
                        ]"
                    >
                        <div class="text-3xl mb-1.5 group-hover:scale-110 transition-transform drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">🎯</div>
                        <h4 class="text-ink-main font-black text-xs tracking-wider leading-none uppercase">{{ tSpec.classic.title }}</h4>
                        <p class="text-ink-soft text-[9px] font-bold mt-1.5 leading-none opacity-85">{{ tSpec.classic.subtitle }}</p>
                        <div v-if="props.config.mode === 'CLASSIC'" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-action-primary text-panel-base flex items-center justify-center text-[10px] font-black shadow-md border border-white/20">✓</div>
                    </div>
                    
                    <!-- Impostor Card -->
                    <div
                        @click="props.amIHost && emit('update-config', 'mode', 'IMPOSTOR')"
                        class="relative p-3.5 rounded-2xl border-[3px] transition-all duration-300 text-center group min-h-[105px] flex flex-col items-center justify-center select-none"
                        :class="[
                            props.config.mode === 'IMPOSTOR'
                                ? 'border-action-error bg-action-error/10 shadow-[0_4px_16px_rgba(239,68,68,0.15)] scale-[1.01]'
                                : 'border-white/10 bg-panel-card/45 hover:border-action-error/50 hover:bg-panel-input/50 hover:scale-[1.02]',
                            !props.amIHost ? 'cursor-not-allowed opacity-60 hover:scale-100' : 'cursor-pointer'
                        ]"
                    >
                        <div class="text-3xl mb-1.5 group-hover:scale-110 transition-transform drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">🕵️</div>
                        <h4 class="text-ink-main font-black text-xs tracking-wider leading-none uppercase">{{ tSpec.impostor.title }}</h4>
                        <p class="text-ink-soft text-[9px] font-bold mt-1.5 leading-none opacity-85">{{ tSpec.impostor.subtitle }}</p>
                        <div v-if="props.config.mode === 'IMPOSTOR'" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-action-error text-white flex items-center justify-center text-[10px] font-black shadow-md border border-white/20">✓</div>
                    </div>
                </div>

                <!-- Specs Sheet & Category Previews -->
                <div class="bg-panel-input/30 border border-white/10 rounded-2xl shadow-inner flex flex-col overflow-hidden min-h-[240px]">
                    <!-- Card Header -->
                    <div class="p-3 border-b border-white/5 bg-panel-card/40 flex items-center justify-between">
                        <p class="text-ink-main text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 select-none">
                            <span class="text-action-primary animate-pulse">📋</span> 
                            <span>Ficha de Juego — {{ props.config.mode === 'CLASSIC' ? tSpec.classic.title : tSpec.impostor.title }}</span>
                        </p>
                        <span class="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-ink-muted">
                            {{ props.config.mode }} Mode
                        </span>
                    </div>

                    <!-- 3 Core Mechanics Badges -->
                    <div class="grid grid-cols-3 gap-2.5 p-3 bg-panel-card/15 border-b border-white/5 select-none">
                        <template v-if="props.config.mode === 'CLASSIC'">
                            <div class="bg-panel-input/40 border border-white/5 rounded-xl p-2.5 text-center group cursor-help" :title="tSpec.classic.badge1Desc">
                                <span class="text-xl block mb-1 transition-transform group-hover:scale-125 duration-300">✍️</span>
                                <span class="text-ink-main text-[8px] font-black uppercase tracking-wider block">{{ tSpec.classic.badge1 }}</span>
                            </div>
                            <div class="bg-panel-input/40 border border-white/5 rounded-xl p-2.5 text-center group cursor-help" :title="tSpec.classic.badge2Desc">
                                <span class="text-xl block mb-1 transition-transform group-hover:scale-125 duration-300">🗳️</span>
                                <span class="text-ink-main text-[8px] font-black uppercase tracking-wider block">{{ tSpec.classic.badge2 }}</span>
                            </div>
                            <div class="bg-panel-input/40 border border-white/5 rounded-xl p-2.5 text-center group cursor-help" :title="tSpec.classic.badge3Desc">
                                <span class="text-xl block mb-1 transition-transform group-hover:scale-125 duration-300">🏆</span>
                                <span class="text-ink-main text-[8px] font-black uppercase tracking-wider block">{{ tSpec.classic.badge3 }}</span>
                            </div>
                        </template>
                        <template v-else-if="props.config.mode === 'IMPOSTOR'">
                            <div class="bg-panel-input/40 border border-white/5 rounded-xl p-2.5 text-center group cursor-help" :title="tSpec.impostor.badge1Desc">
                                <span class="text-xl block mb-1 transition-transform group-hover:scale-125 duration-300">🕵️‍♂️</span>
                                <span class="text-ink-main text-[8px] font-black uppercase tracking-wider block">{{ tSpec.impostor.badge1 }}</span>
                            </div>
                            <div class="bg-panel-input/40 border border-white/5 rounded-xl p-2.5 text-center group cursor-help" :title="tSpec.impostor.badge2Desc">
                                <span class="text-xl block mb-1 transition-transform group-hover:scale-125 duration-300">🤫</span>
                                <span class="text-ink-main text-[8px] font-black uppercase tracking-wider block">{{ tSpec.impostor.badge2 }}</span>
                            </div>
                            <div class="bg-panel-input/40 border border-white/5 rounded-xl p-2.5 text-center group cursor-help" :title="tSpec.impostor.badge3Desc">
                                <span class="text-xl block mb-1 transition-transform group-hover:scale-125 duration-300">🗳️</span>
                                <span class="text-ink-main text-[8px] font-black uppercase tracking-wider block">{{ tSpec.impostor.badge3 }}</span>
                            </div>
                        </template>
                    </div>

                    <!-- Category Previews Block -->
                    <div class="p-3 flex-1">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-ink-soft text-[9px] font-black uppercase tracking-widest">{{ tSpec.categories }} ({{ props.categories.length }})</span>
                            <TButton v-if="props.amIHost" variant="secondary" size="sm" class="!px-3 !py-1 !min-h-0" @click="openModal">
                                {{ tSpec.edit }}
                            </TButton>
                        </div>
                        
                        <!-- List of Custom Tags -->
                        <div v-if="props.categories.length > 0" class="flex flex-wrap gap-1.5 content-start max-h-[140px] overflow-y-auto pr-1">
                            <div v-for="cat in props.categories" :key="cat.id"
                                 class="group flex items-center pl-2.5 pr-1.5 py-1 bg-panel-card hover:bg-panel-input rounded-lg text-[10px] font-black text-ink-main border border-white/10 transition-all shadow-sm uppercase tracking-wide">
                                <span>{{ cat.name }}</span>
                                <button v-if="props.amIHost" @click.stop="emit('remove-category', cat.name)"
                                    class="ml-1.5 w-4 h-4 flex items-center justify-center rounded bg-panel-input border border-panel-card text-ink-muted hover:text-white hover:bg-action-error transition-colors text-[9px] font-black">
                                    &times;
                                </button>
                            </div>
                        </div>

                        <!-- Fallback illustrations if empty selection -->
                        <div v-else class="py-6 flex flex-col items-center justify-center text-center gap-1">
                            <template v-if="props.config.mode === 'CLASSIC'">
                                <span class="text-3xl mb-1 opacity-45 animate-bounce select-none">🎲</span>
                                <p class="text-ink-main font-black text-[10px] uppercase tracking-wider">{{ tSpec.randomSelection }}</p>
                                <p class="text-ink-muted text-[8px] font-bold px-4 leading-normal max-w-sm">{{ tSpec.randomSelectionDesc }}</p>
                            </template>
                            <template v-else-if="props.config.mode === 'IMPOSTOR'">
                                <span class="text-3xl mb-1 opacity-45 animate-bounce select-none">🕵️</span>
                                <p class="text-ink-main font-black text-[10px] uppercase tracking-wider">{{ tSpec.randomSelection }} ({{ tSpec.impostorDesc }})</p>
                                <p class="text-ink-muted text-[8px] font-bold px-4 leading-normal max-w-sm">{{ tSpec.impostorDescSub }}</p>
                            </template>
                        </div>
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
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-panel-card/15 p-3 rounded-2xl border border-white/5">
                        
                        <!-- Category Count (only when no manual categories selected) -->
                        <div v-if="!(props.config.classic?.categories?.length > 0)" class="bg-panel-input/35 rounded-2xl border border-white/10 p-3 md:col-span-2">
                            <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2 text-center">🎲 {{ t('lobby.settings.classic.randomCategories') }}</label>
                            <div class="flex items-center justify-between max-w-xs mx-auto">
                                <button :disabled="!props.amIHost" @click="decrementCategoryCount" class="w-9 h-9 rounded-xl bg-panel-card border border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm transition-all text-lg cursor-pointer hover:bg-panel-input active:scale-90">-</button>
                                <input
                                    type="number"
                                    :disabled="!props.amIHost"
                                    :value="props.config.classic?.categoryCount ?? 4"
                                    :min="1" :max="10"
                                    @change="handleNumericInput('classic.categoryCount', ($event.target as HTMLInputElement).value, 1, 10)"
                                    @keydown.enter="($event.target as HTMLInputElement).blur()"
                                    @focus="($event.target as HTMLInputElement).select()"
                                    class="w-14 text-center text-xl font-black text-ink-main bg-transparent border-b border-white/20 focus:border-action-primary outline-none appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                                />
                                <button :disabled="!props.amIHost" @click="incrementCategoryCount" class="w-9 h-9 rounded-xl bg-panel-card border border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm transition-all text-lg cursor-pointer hover:bg-panel-input active:scale-90">+</button>
                            </div>
                            <p class="text-ink-muted text-[8px] font-bold mt-1.5 text-center leading-none">{{ t('lobby.settings.classic.randomCategoriesDesc') }}</p>
                        </div>

                        <!-- Rounds stepper -->
                        <div class="bg-panel-input/35 rounded-2xl border border-white/10 p-3">
                            <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2 text-center">🔁 {{ t('lobby.settings.classic.rounds') }}</label>
                            <div class="flex items-center justify-between">
                                <button :disabled="!props.amIHost" @click="decrementRounds" class="w-9 h-9 rounded-xl bg-panel-card border border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm transition-all text-lg cursor-pointer hover:bg-panel-input active:scale-90">-</button>
                                <input
                                    type="number"
                                    :disabled="!props.amIHost"
                                    :value="props.config.classic?.rounds || 3"
                                    :min="1" :max="20"
                                    @change="handleNumericInput('classic.rounds', ($event.target as HTMLInputElement).value, 1, 20)"
                                    @keydown.enter="($event.target as HTMLInputElement).blur()"
                                    @focus="($event.target as HTMLInputElement).select()"
                                    class="w-14 text-center text-xl font-black text-ink-main bg-transparent border-b border-white/20 focus:border-action-primary outline-none appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                                />
                                <button :disabled="!props.amIHost" @click="incrementRounds" class="w-9 h-9 rounded-xl bg-panel-card border border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm transition-all text-lg cursor-pointer hover:bg-panel-input active:scale-90">+</button>
                            </div>
                        </div>

                        <!-- Time limit stepper -->
                        <div class="bg-panel-input/35 rounded-2xl border border-white/10 p-3">
                            <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2 text-center">⏱️ {{ t('lobby.settings.classic.timeLimit') }}</label>
                            <div class="flex items-center justify-between">
                                <button :disabled="!props.amIHost" @click="decrementTimeLimit" class="w-9 h-9 rounded-xl bg-panel-card border border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm transition-all text-lg cursor-pointer hover:bg-panel-input active:scale-90">-</button>
                                <div class="text-center flex flex-col items-center">
                                    <input
                                        type="number"
                                        :disabled="!props.amIHost"
                                        :value="props.config.classic?.timeLimit || 60"
                                        :min="30" :max="180"
                                        @change="handleNumericInput('classic.timeLimit', ($event.target as HTMLInputElement).value, 30, 180, timeLimitOptions)"
                                        @keydown.enter="($event.target as HTMLInputElement).blur()"
                                        @focus="($event.target as HTMLInputElement).select()"
                                        class="w-14 text-center text-xl font-black text-ink-main bg-transparent border-b border-white/20 focus:border-action-primary outline-none appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                                    />
                                    <span class="text-ink-muted text-[8px] font-black uppercase leading-none mt-1">{{ t('lobby.settings.classic.sec') }}</span>
                                </div>
                                <button :disabled="!props.amIHost" @click="incrementTimeLimit" class="w-9 h-9 rounded-xl bg-panel-card border border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm transition-all text-lg cursor-pointer hover:bg-panel-input active:scale-90">+</button>
                            </div>
                        </div>

                        <!-- Voting duration stepper -->
                        <div class="bg-panel-input/35 rounded-2xl border border-white/10 p-3 md:col-span-2">
                            <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2 text-center">🗳️ {{ t('lobby.settings.classic.votingTime') }}</label>
                            <div class="flex items-center justify-between max-w-xs mx-auto">
                                <button :disabled="!props.amIHost" @click="decrementVotingDuration" class="w-9 h-9 rounded-xl bg-panel-card border border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm transition-all text-lg cursor-pointer hover:bg-panel-input active:scale-90">-</button>
                                <div class="text-center flex flex-col items-center">
                                    <input
                                        type="number"
                                        :disabled="!props.amIHost"
                                        :value="props.config.classic?.votingDuration || 20"
                                        :min="10" :max="120"
                                        @change="handleNumericInput('classic.votingDuration', ($event.target as HTMLInputElement).value, 10, 120, votingOptions)"
                                        @keydown.enter="($event.target as HTMLInputElement).blur()"
                                        @focus="($event.target as HTMLInputElement).select()"
                                        class="w-14 text-center text-xl font-black text-ink-main bg-transparent border-b border-white/20 focus:border-action-primary outline-none appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                                    />
                                    <span class="text-ink-muted text-[8px] font-black uppercase leading-none mt-1">{{ t('lobby.settings.classic.sec') }}</span>
                                </div>
                                <button :disabled="!props.amIHost" @click="incrementVotingDuration" class="w-9 h-9 rounded-xl bg-panel-card border border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm transition-all text-lg cursor-pointer hover:bg-panel-input active:scale-90">+</button>
                            </div>
                        </div>

                        <!-- Mutators block -->
                        <div class="md:col-span-2 space-y-2 mt-1">
                            <p class="text-ink-main text-[8px] font-black uppercase tracking-[0.2em] mb-1.5">⚡ {{ t('lobby.settings.classic.mutators') }}</p>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                <!-- Suicidal Stop -->
                                <div class="bg-panel-input/30 rounded-xl border border-white/10 p-2.5 flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <span class="text-base">💀</span>
                                        <div class="flex flex-col">
                                            <span class="text-ink-main font-black text-[10px] uppercase leading-none">{{ t('lobby.settings.classic.suicidalStop') }}</span>
                                            <span class="text-ink-muted text-[8px] font-bold leading-tight mt-1 max-w-[140px]">{{ t('lobby.settings.classic.suicidalStopDesc') }}</span>
                                        </div>
                                    </div>
                                    <button
                                        :disabled="!props.amIHost"
                                        @click="emit('update-mutator', 'suicidalStop', !props.config.classic?.mutators?.suicidalStop)"
                                        class="relative w-10 h-5.5 rounded-full transition-all duration-300 border-[2px] flex-none cursor-pointer"
                                        :class="props.config.classic?.mutators?.suicidalStop ? 'bg-action-error border-action-error' : 'bg-panel-input border-panel-card shadow-inner'"
                                    >
                                        <span class="absolute top-0.5 w-3.5 h-3.5 rounded-full shadow-sm transition-all duration-300"
                                              :class="props.config.classic?.mutators?.suicidalStop ? 'bg-white left-[calc(100%-1.05rem)]' : 'bg-panel-card left-0.5'"></span>
                                    </button>
                                </div>

                                <!-- Anonymous Voting -->
                                <div class="bg-panel-input/30 rounded-xl border border-white/10 p-2.5 flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <span class="text-base">🎭</span>
                                        <div class="flex flex-col">
                                            <span class="text-ink-main font-black text-[10px] uppercase leading-none">{{ t('lobby.settings.classic.anonymousVoting') }}</span>
                                            <span class="text-ink-muted text-[8px] font-bold leading-tight mt-1 max-w-[140px]">{{ t('lobby.settings.classic.anonymousVotingDesc') }}</span>
                                        </div>
                                    </div>
                                    <button
                                        :disabled="!props.amIHost"
                                        @click="emit('update-mutator', 'anonymousVoting', !props.config.classic?.mutators?.anonymousVoting)"
                                        class="relative w-10 h-5.5 rounded-full transition-all duration-300 border-[2px] flex-none cursor-pointer"
                                        :class="props.config.classic?.mutators?.anonymousVoting ? 'bg-action-blue border-action-blue' : 'bg-panel-input border-panel-card shadow-inner'"
                                    >
                                        <span class="absolute top-0.5 w-3.5 h-3.5 rounded-full shadow-sm transition-all duration-300"
                                              :class="props.config.classic?.mutators?.anonymousVoting ? 'bg-white left-[calc(100%-1.05rem)]' : 'bg-panel-card left-0.5'"></span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- ── IMPOSTOR MODE SETTINGS PANEL ── -->
                <template v-else-if="props.config.mode === 'IMPOSTOR'">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-panel-card/15 p-3 rounded-2xl border border-white/5">
                        
                        <!-- Category Count stepper -->
                        <div class="bg-panel-input/35 rounded-2xl border border-white/10 p-3 md:col-span-2">
                            <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2 text-center">📦 {{ t('lobby.settings.impostor.categories') }}</label>
                            <div class="flex items-center justify-between max-w-xs mx-auto">
                                <button :disabled="!props.amIHost" @click="decrementImpostorCategoryCount" class="w-9 h-9 rounded-xl bg-panel-card border border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm transition-all text-lg cursor-pointer hover:bg-panel-input active:scale-90">-</button>
                                <input
                                    type="number"
                                    :disabled="!props.amIHost"
                                    :value="props.config.impostor?.categoryCount ?? 3"
                                    :min="1" :max="8"
                                    @change="handleNumericInput('impostor.categoryCount', ($event.target as HTMLInputElement).value, 1, 8)"
                                    @keydown.enter="($event.target as HTMLInputElement).blur()"
                                    @focus="($event.target as HTMLInputElement).select()"
                                    class="w-14 text-center text-xl font-black text-ink-main bg-transparent border-b border-white/20 focus:border-action-primary outline-none appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                                />
                                <button :disabled="!props.amIHost" @click="incrementImpostorCategoryCount" class="w-9 h-9 rounded-xl bg-panel-card border border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm transition-all text-lg cursor-pointer hover:bg-panel-input active:scale-90">+</button>
                            </div>
                            <p class="text-ink-muted text-[8px] font-bold mt-1.5 text-center leading-none">{{ t('lobby.settings.impostor.categoriesDesc') }}</p>
                        </div>

                        <!-- Rounds stepper -->
                        <div class="bg-panel-input/35 rounded-2xl border border-white/10 p-3">
                            <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2 text-center">🔁 {{ t('lobby.settings.impostor.rounds') }}</label>
                            <div class="flex items-center justify-between">
                                <button :disabled="!props.amIHost" @click="decrementImpostorRounds" class="w-9 h-9 rounded-xl bg-panel-card border border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm transition-all text-lg cursor-pointer hover:bg-panel-input active:scale-90">-</button>
                                <input
                                    type="number"
                                    :disabled="!props.amIHost"
                                    :value="props.config.impostor?.rounds || 3"
                                    :min="1" :max="10"
                                    @change="handleNumericInput('impostor.rounds', ($event.target as HTMLInputElement).value, 1, 10)"
                                    @keydown.enter="($event.target as HTMLInputElement).blur()"
                                    @focus="($event.target as HTMLInputElement).select()"
                                    class="w-14 text-center text-xl font-black text-ink-main bg-transparent border-b border-white/20 focus:border-action-primary outline-none appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                                />
                                <button :disabled="!props.amIHost" @click="incrementImpostorRounds" class="w-9 h-9 rounded-xl bg-panel-card border border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm transition-all text-lg cursor-pointer hover:bg-panel-input active:scale-90">+</button>
                            </div>
                        </div>

                        <!-- Typing time stepper -->
                        <div class="bg-panel-input/35 rounded-2xl border border-white/10 p-3">
                            <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2 text-center">⏱️ {{ t('lobby.settings.impostor.typingTime') }}</label>
                            <div class="flex items-center justify-between">
                                <button :disabled="!props.amIHost" @click="decrementImpostorTypingTime" class="w-9 h-9 rounded-xl bg-panel-card border border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm transition-all text-lg cursor-pointer hover:bg-panel-input active:scale-90">-</button>
                                <div class="text-center flex flex-col items-center">
                                    <input
                                        type="number"
                                        :disabled="!props.amIHost"
                                        :value="props.config.impostor?.typingTime || 30"
                                        :min="10" :max="60"
                                        @change="handleNumericInput('impostor.typingTime', ($event.target as HTMLInputElement).value, 10, 60, impostorTypingOptions)"
                                        @keydown.enter="($event.target as HTMLInputElement).blur()"
                                        @focus="($event.target as HTMLInputElement).select()"
                                        class="w-14 text-center text-xl font-black text-ink-main bg-transparent border-b border-white/20 focus:border-action-primary outline-none appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                                    />
                                    <span class="text-ink-muted text-[8px] font-black uppercase leading-none mt-1">{{ t('lobby.settings.classic.sec') }}</span>
                                </div>
                                <button :disabled="!props.amIHost" @click="incrementImpostorTypingTime" class="w-9 h-9 rounded-xl bg-panel-card border border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm transition-all text-lg cursor-pointer hover:bg-panel-input active:scale-90">+</button>
                            </div>
                        </div>

                        <!-- Voting time stepper -->
                        <div class="bg-panel-input/35 rounded-2xl border border-white/10 p-3 md:col-span-2">
                            <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2 text-center">🗳️ {{ t('lobby.settings.impostor.votingTime') }}</label>
                            <div class="flex items-center justify-between max-w-xs mx-auto">
                                <button :disabled="!props.amIHost" @click="decrementImpostorVotingTime" class="w-9 h-9 rounded-xl bg-panel-card border border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm transition-all text-lg cursor-pointer hover:bg-panel-input active:scale-90">-</button>
                                <div class="text-center flex flex-col items-center">
                                    <input
                                        type="number"
                                        :disabled="!props.amIHost"
                                        :value="props.config.impostor?.votingTime || 40"
                                        :min="15" :max="120"
                                        @change="handleNumericInput('impostor.votingTime', ($event.target as HTMLInputElement).value, 15, 120, impostorVotingOptions)"
                                        @keydown.enter="($event.target as HTMLInputElement).blur()"
                                        @focus="($event.target as HTMLInputElement).select()"
                                        class="w-14 text-center text-xl font-black text-ink-main bg-transparent border-b border-white/20 focus:border-action-primary outline-none appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                                    />
                                    <span class="text-ink-muted text-[8px] font-black uppercase leading-none mt-1">{{ t('lobby.settings.classic.sec') }}</span>
                                </div>
                                <button :disabled="!props.amIHost" @click="incrementImpostorVotingTime" class="w-9 h-9 rounded-xl bg-panel-card border border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm transition-all text-lg cursor-pointer hover:bg-panel-input active:scale-90">+</button>
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
