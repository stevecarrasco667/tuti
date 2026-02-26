<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useGame } from '../composables/useGame';
import { useSound } from '../composables/useSound';
import { MASTER_CATEGORIES } from '../../shared/engines/categories';
import TCard from './ui/TCard.vue';
import TButton from './ui/TButton.vue';

const { gameState, startGame, updateConfig, myUserId, amIHost, kickPlayer } = useGame();
const { playClick, playJoin, playAlarm, playSuccess } = useSound();

// Local state
const localConfig = computed(() => gameState.value.config);
const copied = ref(false);
const players = computed(() => gameState.value.players);
const activeTab = ref<'players' | 'settings'>('players');

// Empty slots for visual capacity
const emptySlots = computed(() => {
    const max = localConfig.value.maxPlayers || 8;
    const current = players.value.length;
    return Math.max(0, max - current);
});

// --- Audio Triggers ---
watch(() => gameState.value.players.length, (newCount, oldCount) => {
    if (newCount > oldCount) playJoin();
});

const handleConfigChange = (field: string, value: any) => {
    // Support nested paths like 'classic.rounds' or flat like 'mode'
    const parts = field.split('.');
    if (parts.length === 2) {
        updateConfig({ [parts[0]]: { [parts[1]]: value } } as any);
    } else {
        updateConfig({ [field]: value });
    }
    playClick();
};

const handleMutatorChange = (mutator: string, value: boolean) => {
    updateConfig({ classic: { mutators: { [mutator]: value } } } as any);
    playClick();
};

const handleKick = (targetUserId: string, name: string) => {
    if (confirm(`¿Eliminar a ${name} de la sala?`)) {
        kickPlayer(targetUserId);
    }
};

const handleQuickDelete = (catName: string) => {
    const current = localConfig.value.classic?.categories || [];
    handleConfigChange('classic.categories', current.filter((c: string) => c !== catName));
};

// --- Manual Selection Modal ---
const showCategoriesModal = ref(false);
const searchQuery = ref('');
const activeFilterTag = ref<string | null>(null);
const tempSelectedCategories = ref<string[]>([]);

const openCategoryModal = () => {
    tempSelectedCategories.value = [...(localConfig.value.classic?.categories || [])];
    searchQuery.value = '';
    activeFilterTag.value = null;
    showCategoriesModal.value = true;
};

const toggleCategory = (catName: string) => {
    const idx = tempSelectedCategories.value.indexOf(catName);
    if (idx === -1) {
        tempSelectedCategories.value.push(catName);
    } else {
        tempSelectedCategories.value.splice(idx, 1);
    }
};

const saveCategories = () => {
    handleConfigChange('classic.categories', tempSelectedCategories.value);
    showCategoriesModal.value = false;
};

const availableTags = computed(() => {
    const tags = new Set<string>();
    MASTER_CATEGORIES.forEach(c => c.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
});

const filteredCategories = computed(() => {
    const query = searchQuery.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return MASTER_CATEGORIES.filter(cat => {
        if (activeFilterTag.value && !cat.tags.includes(activeFilterTag.value)) return false;
        const normalized = cat.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return normalized.includes(query);
    });
});

// --- Classic Steppers ---
const incrementRounds = () => {
    const val = localConfig.value.classic?.rounds || 5;
    if (val < 20) handleConfigChange('classic.rounds', val + 1);
};
const decrementRounds = () => {
    const val = localConfig.value.classic?.rounds || 5;
    if (val > 1) handleConfigChange('classic.rounds', val - 1);
};

const timeLimitOptions = [30, 45, 60, 90, 120, 180];
const incrementTimeLimit = () => {
    const current = localConfig.value.classic?.timeLimit || 60;
    const idx = timeLimitOptions.indexOf(current);
    if (idx < timeLimitOptions.length - 1) handleConfigChange('classic.timeLimit', timeLimitOptions[idx + 1]);
};
const decrementTimeLimit = () => {
    const current = localConfig.value.classic?.timeLimit || 60;
    const idx = timeLimitOptions.indexOf(current);
    if (idx > 0) handleConfigChange('classic.timeLimit', timeLimitOptions[idx - 1]);
};

const votingOptions = [10, 15, 20, 30, 45, 60, 90, 120];
const incrementVotingDuration = () => {
    const current = localConfig.value.classic?.votingDuration || 30;
    const idx = votingOptions.indexOf(current);
    if (idx < votingOptions.length - 1) handleConfigChange('classic.votingDuration', votingOptions[idx + 1]);
};
const decrementVotingDuration = () => {
    const current = localConfig.value.classic?.votingDuration || 30;
    const idx = votingOptions.indexOf(current);
    if (idx > 0) handleConfigChange('classic.votingDuration', votingOptions[idx - 1]);
};

// --- Impostor Steppers ---
const incrementImpostorRounds = () => {
    const val = localConfig.value.impostor?.rounds || 3;
    if (val < 10) handleConfigChange('impostor.rounds', val + 1);
};
const decrementImpostorRounds = () => {
    const val = localConfig.value.impostor?.rounds || 3;
    if (val > 1) handleConfigChange('impostor.rounds', val - 1);
};

const incrementImpostorTypingTime = () => {
    const val = localConfig.value.impostor?.typingTime || 30;
    if (val < 60) handleConfigChange('impostor.typingTime', val + 5);
};
const decrementImpostorTypingTime = () => {
    const val = localConfig.value.impostor?.typingTime || 30;
    if (val > 10) handleConfigChange('impostor.typingTime', val - 5);
};

const incrementImpostorVotingTime = () => {
    const val = localConfig.value.impostor?.votingTime || 40;
    if (val < 120) handleConfigChange('impostor.votingTime', val + 5);
};
const decrementImpostorVotingTime = () => {
    const val = localConfig.value.impostor?.votingTime || 40;
    if (val > 15) handleConfigChange('impostor.votingTime', val - 5);
};

const canStart = computed(() => {
    if (!amIHost.value) return false;
    return true;
});

const handleStart = () => {
    if (!canStart.value) return;
    playAlarm();
    startGame();
};

const copyRoomLink = () => {
    const code = gameState.value.roomId || '';
    const link = `${window.location.origin}/?room=${code}`;
    navigator.clipboard.writeText(link).then(() => {
        copied.value = true;
        playSuccess();
        setTimeout(() => copied.value = false, 2000);
    });
};
</script>

<template>
    <div class="h-full w-full max-w-[1400px] mx-auto flex flex-col overflow-hidden">

        <!-- =================================== -->
        <!-- STICKY HEADER: Room Code + Pub/Priv -->
        <!-- =================================== -->
        <div class="flex-none px-3 pt-3 pb-2 lg:px-4 lg:pt-4">
            <TCard padding="none" class="p-3 flex items-center justify-between gap-3 rounded-2xl">
                <!-- Left: Pub/Priv + Code -->
                <div class="flex items-center gap-3 min-w-0">
                    <!-- Public/Private Toggle (Host) -->
                    <button v-if="amIHost"
                        @click="handleConfigChange('isPublic', !localConfig.isPublic)"
                        class="flex-none w-10 h-10 rounded-xl border-2 flex items-center justify-center text-lg transition-all active:scale-90"
                        :class="localConfig.isPublic ? 'bg-action-primary border-green-400 shadow-game-btn' : 'bg-panel-input border-panel-card shadow-inner'"
                    >
                        {{ localConfig.isPublic ? '🌐' : '🔒' }}
                    </button>
                    <span v-else class="flex-none text-xl">{{ localConfig.isPublic ? '🌐' : '🔒' }}</span>

                    <!-- Room Code -->
                    <div class="min-w-0">
                        <p class="text-ink-soft text-[7px] font-black uppercase tracking-widest">{{ localConfig.isPublic ? 'Sala Pública' : 'Sala Privada' }}</p>
                        <span class="text-lg lg:text-xl font-black text-ink-main tracking-[0.2em] font-mono select-all block truncate">{{ gameState.roomId }}</span>
                    </div>
                </div>

                <!-- Right: Copy Link -->
                <TButton variant="secondary" size="sm" class="flex-none" @click="copyRoomLink">
                    <span>{{ copied ? '✓' : '🔗' }}</span>
                    <span class="hidden sm:inline">{{ copied ? 'Copiado' : 'Invitar' }}</span>
                </TButton>
            </TCard>
        </div>

        <!-- ============================= -->
        <!-- TAB BAR (Mobile only)         -->
        <!-- ============================= -->
        <div class="flex-none px-3 lg:hidden">
            <div class="flex bg-panel-input rounded-xl border-2 border-panel-card p-1 gap-1 shadow-inner">
                <button
                    @click="activeTab = 'players'"
                    class="flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    :class="activeTab === 'players'
                        ? 'bg-panel-base text-action-blue shadow-sm border border-white'
                        : 'text-ink-muted hover:text-ink-soft'"
                >
                    👥 Jugadores
                    <span class="text-[9px] font-bold text-ink-soft opacity-80">{{ players.length }}/{{ localConfig.maxPlayers }}</span>
                </button>
                <button
                    @click="activeTab = 'settings'"
                    class="flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    :class="activeTab === 'settings'
                        ? 'bg-panel-base text-action-blue shadow-sm border border-white'
                        : 'text-ink-muted hover:text-ink-soft'"
                >
                    ⚙️ Reglas
                </button>
            </div>
        </div>

        <!-- ====================================== -->
        <!-- MAIN CONTENT: 3-col Desktop / Tabs Mobile -->
        <!-- ====================================== -->
        <div class="flex-1 min-h-0 px-3 pt-2 pb-20 lg:pb-3 lg:px-4 overflow-hidden">
            <div class="h-full grid grid-cols-1 lg:grid-cols-12 gap-3">

                <!-- ================================ -->
                <!-- LEFT PANEL: Players              -->
                <!-- ================================ -->
                <div class="lg:col-span-3 bg-panel-base border-[3px] border-white/50 rounded-3xl shadow-game-panel flex flex-col overflow-hidden min-h-0"
                     :class="{ 'hidden lg:flex': activeTab !== 'players' }"
                >
                    <!-- Header: Title + MaxPlayers -->
                    <div class="p-4 border-b-2 border-white/50 bg-panel-card/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-none sticky top-0 z-10">
                        <div class="flex items-center justify-between sm:justify-start gap-2">
                            <h3 class="text-ink-main text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                                Jugadores {{ players.length }}/{{ localConfig.maxPlayers }}
                            </h3>
                        </div>
                        <div v-if="amIHost" class="relative">
                            <select
                                :value="localConfig.maxPlayers"
                                @change="handleConfigChange('maxPlayers', Number(($event.target as HTMLSelectElement).value))"
                                class="w-full sm:w-auto bg-panel-input border-2 border-panel-card text-ink-main text-xs font-black uppercase tracking-wider px-3 py-2 rounded-xl appearance-none cursor-pointer hover:bg-white transition-colors focus:outline-none focus:border-action-cyan shadow-inner sm:shadow-none"
                            >
                                <option v-for="n in 9" :key="n+1" :value="n+1" class="bg-panel-input">{{ n + 1 }} JUGADORES</option>
                            </select>
                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[10px]">▼</span>
                        </div>
                        <div v-else class="bg-panel-input border-2 border-panel-card text-ink-muted text-xs font-black uppercase tracking-wider px-3 py-2 rounded-xl shadow-inner text-center">
                            {{ localConfig.maxPlayers }} JUGADORES
                        </div>
                    </div>

                    <!-- Player List + Empty Slots -->
                    <div class="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                        <div v-for="player in players" :key="player.id"
                             class="flex items-center gap-3 p-3 bg-panel-card rounded-xl border-2 border-white hover:border-action-cyan transition-colors group shadow-sm"
                        >
                            <span class="text-2xl flex-none">{{ player.avatar || '👤' }}</span>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-1.5 truncate">
                                    <span class="text-ink-main font-black text-sm truncate">{{ player.name }}</span>
                                    <span v-if="player.isHost" class="flex-none text-[8px]">👑</span>
                                    <span v-if="player.id === myUserId" class="flex-none text-[8px] font-black text-white bg-action-blue px-1.5 py-0.5 rounded shadow-sm">TÚ</span>
                                </div>
                                <div class="text-[8px] font-bold uppercase tracking-wider" :class="player.isConnected ? 'text-action-primary' : 'text-action-error'">
                                    {{ player.isConnected ? 'Conectado' : 'Reconectando...' }}
                                </div>
                            </div>
                            <button v-if="amIHost && !player.isHost" @click="handleKick(player.id, player.name)"
                                class="hidden group-hover:flex flex-none w-7 h-7 items-center justify-center rounded-lg bg-action-error/20 text-action-error hover:bg-action-error hover:text-white transition-all text-[10px] font-bold"
                            >✕</button>
                        </div>

                        <div v-for="spec in gameState.spectators" :key="spec.id"
                             class="flex items-center gap-3 p-3 bg-panel-modal rounded-xl border-2 border-dashed border-panel-card">
                            <span class="text-xl opacity-40 flex-none">{{ spec.avatar || '👤' }}</span>
                            <div class="flex-1 min-w-0">
                                <span class="text-ink-soft font-bold text-xs truncate block">{{ spec.name }}</span>
                                <span class="text-[8px] font-bold text-amber-500 uppercase">👁️ Espectador</span>
                            </div>
                        </div>

                        <div v-for="i in emptySlots" :key="'empty-' + i"
                             class="flex items-center gap-3 p-3 rounded-xl border-[3px] border-dashed border-white/60 bg-white/30"
                        >
                            <span class="text-xl opacity-20 flex-none">👤</span>
                            <span class="text-ink-muted font-bold text-xs uppercase tracking-wider">Vacío</span>
                        </div>
                    </div>
                </div>

                <!-- ============================================ -->
                <!-- CENTER + RIGHT PANELS: Settings (Desktop)    -->
                <!-- Mobile: shown when activeTab === 'settings'  -->
                <!-- ============================================ -->
                <div class="lg:col-span-9 lg:grid lg:grid-cols-9 lg:gap-3 flex flex-col gap-4 min-h-0 overflow-y-auto lg:overflow-hidden"
                     :class="{ 'hidden lg:grid': activeTab !== 'settings' }"
                >
                    <!-- =========================================== -->
                    <!-- CENTER: Game Mode + Categories (lg:col-5)   -->
                    <!-- =========================================== -->
                    <div class="lg:col-span-5 flex flex-col gap-4 min-h-0"
                         :class="{ 'opacity-60 pointer-events-none': !amIHost }"
                    >
                        <!-- GAME MODE -->
                        <div class="bg-panel-base border-[3px] border-white/50 rounded-3xl shadow-game-panel p-4 flex-none">
                            <p class="text-ink-main text-[9px] font-black uppercase tracking-[0.2em] mb-3 text-center">Modo de Juego</p>
                            <div class="grid grid-cols-2 gap-3">
                                <button
                                    @click="handleConfigChange('mode', 'CLASSIC')"
                                    class="relative p-4 lg:p-5 rounded-2xl border-[3px] transition-all duration-300 text-center group min-h-[110px] flex flex-col items-center justify-center"
                                    :class="localConfig.mode === 'CLASSIC'
                                        ? 'border-yellow-400 bg-yellow-400/10 shadow-[0_0_15px_rgba(250,204,21,0.2)]'
                                        : 'border-white/50 bg-panel-card hover:border-action-cyan hover:bg-white'"
                                >
                                    <div class="text-3xl lg:text-4xl mb-1.5 group-hover:scale-110 transition-transform">🎯</div>
                                    <h4 class="text-ink-main font-black text-xs lg:text-sm tracking-wide">TUTI CLÁSICO</h4>
                                    <p class="text-ink-soft text-[8px] font-bold mt-1">Categorías · Letras · Velocidad</p>
                                    <div v-if="localConfig.mode === 'CLASSIC'" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-yellow-400 text-ink-main flex items-center justify-center text-[10px] font-black shadow-lg">✓</div>
                                </button>

                                <button
                                    @click="handleConfigChange('mode', 'IMPOSTOR')"
                                    class="relative p-4 lg:p-5 rounded-2xl border-[3px] transition-all duration-300 text-center group min-h-[110px] flex flex-col items-center justify-center"
                                    :class="localConfig.mode === 'IMPOSTOR'
                                        ? 'border-action-blue bg-action-blue/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                        : 'border-white/50 bg-panel-card hover:border-action-cyan hover:bg-white'"
                                >
                                    <div class="text-3xl lg:text-4xl mb-1.5 group-hover:scale-110 transition-transform">🕵️</div>
                                    <h4 class="text-ink-main font-black text-xs lg:text-sm tracking-wide">IMPOSTOR</h4>
                                    <p class="text-ink-soft text-[8px] font-bold mt-1">¿Quién está mintiendo?</p>
                                    <div v-if="localConfig.mode === 'IMPOSTOR'" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-action-blue text-white flex items-center justify-center text-[10px] font-black shadow-lg">✓</div>
                                </button>
                            </div>
                        </div>

                        <!-- CATEGORIES -->
                        <div class="bg-panel-base border-[3px] border-white/50 rounded-3xl shadow-game-panel flex-1 flex flex-col overflow-hidden min-h-[120px] lg:min-h-0">
                            <div class="p-4 border-b-2 border-white/50 bg-panel-card/50 flex items-center justify-between flex-none sticky top-0">
                                <p class="text-ink-main text-[9px] font-black uppercase tracking-[0.2em]">
                                    Categorías <span class="text-ink-soft">({{ localConfig.classic?.categories?.length || 0 }})</span>
                                </p>
                                <TButton variant="teal" size="sm" @click="openCategoryModal">Editar +</TButton>
                            </div>
                            <div class="flex-1 overflow-y-auto p-4 min-h-0">
                                <div v-if="localConfig.classic?.categories?.length > 0" class="flex flex-wrap gap-2 content-start">
                                    <TransitionGroup name="list">
                                    <div v-for="cat in localConfig.classic?.categories" :key="cat"
                                         class="group flex items-center pl-3 pr-2 py-1.5 bg-panel-card hover:bg-white rounded-full text-[11px] font-bold text-ink-main border-2 border-white transition-all shadow-sm">
                                        <span>{{ cat }}</span>
                                        <button @click.stop="handleQuickDelete(cat)" class="ml-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-panel-input border border-panel-card text-ink-muted hover:text-white hover:bg-action-error transition-colors text-[10px] font-bold">
                                            &times;
                                        </button>
                                    </div>
                                    </TransitionGroup>
                                </div>
                                <div v-else class="h-full flex flex-col items-center justify-center text-center py-6">
                                    <span class="text-4xl mb-3 opacity-30">🎲</span>
                                    <p class="text-ink-soft font-bold text-sm">5 categorías aleatorias</p>
                                    <p class="text-ink-muted text-[10px] font-bold mt-1">Personaliza con "Editar"</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ================================= -->
                    <!-- RIGHT: Settings (lg:col-4)        -->
                    <!-- ================================= -->
                    <div class="lg:col-span-4 bg-panel-base border-[3px] border-white/50 rounded-3xl shadow-game-panel flex flex-col overflow-hidden min-h-0"
                         :class="{ 'opacity-60 pointer-events-none': !amIHost }"
                    >
                        <div class="p-4 border-b-2 border-white/50 bg-panel-card/50 flex items-center justify-between sticky top-0 z-10 flex-none gap-2">
                            <h3 class="text-ink-main text-xs font-black uppercase tracking-widest">Ajustes</h3>
                            <span v-if="!amIHost" class="text-amber-500 text-[8px] font-black uppercase tracking-wider bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">Solo lectura</span>
                        </div>

                        <div class="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin min-h-0">

                            <!-- ===== CLASSIC MODE SETTINGS ===== -->
                            <template v-if="localConfig.mode === 'CLASSIC'">

                            <!-- Rounds -->
                            <div class="bg-panel-input rounded-xl border-2 border-panel-card shadow-inner p-3">
                                <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2">🔁 Rondas</label>
                                <div class="flex items-center justify-between">
                                    <button @click="decrementRounds" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-white border-2 border-white text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">-</button>
                                    <span class="text-4xl font-black text-ink-main">{{ localConfig.classic?.rounds || 5 }}</span>
                                    <button @click="incrementRounds" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-white border-2 border-white text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">+</button>
                                </div>
                            </div>

                            <!-- Time Limit -->
                            <div class="bg-panel-input rounded-xl border-2 border-panel-card shadow-inner p-3">
                                <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2">⏱️ Tiempo de Escritura</label>
                                <div class="flex items-center justify-between">
                                    <button @click="decrementTimeLimit" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-white border-2 border-white text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">-</button>
                                    <div class="text-center">
                                        <span class="text-4xl font-black text-ink-main">{{ localConfig.classic?.timeLimit || 60 }}</span>
                                        <span class="text-ink-muted text-[10px] font-bold block -mt-1 uppercase">seg</span>
                                    </div>
                                    <button @click="incrementTimeLimit" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-white border-2 border-white text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">+</button>
                                </div>
                            </div>

                            <!-- Voting Duration -->
                            <div class="bg-panel-input rounded-xl border-2 border-panel-card shadow-inner p-3">
                                <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2">🗳️ Tiempo de Votación</label>
                                <div class="flex items-center justify-between">
                                    <button @click="decrementVotingDuration" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-white border-2 border-white text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">-</button>
                                    <div class="text-center">
                                        <span class="text-4xl font-black text-ink-main">{{ localConfig.classic?.votingDuration || 30 }}</span>
                                        <span class="text-ink-muted text-[10px] font-bold block -mt-1 uppercase">seg</span>
                                    </div>
                                    <button @click="incrementVotingDuration" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-white border-2 border-white text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">+</button>
                                </div>
                            </div>

                            <hr class="border-t-[3px] border-white rounded-full mt-4 mb-2" />

                            <!-- MUTATORS -->
                            <div>
                                <p class="text-ink-main text-[9px] font-black uppercase tracking-widest mb-3">⚡ Mutadores</p>

                                <!-- Suicidal Stop -->
                                <div class="bg-panel-input rounded-xl border-2 border-panel-card shadow-inner p-3 mb-3">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-2.5">
                                            <span class="text-xl">💀</span>
                                            <span class="text-ink-main font-black text-sm">Stop Suicida</span>
                                        </div>
                                        <button
                                            @click="handleMutatorChange('suicidalStop', !localConfig.classic?.mutators?.suicidalStop)"
                                            class="relative w-[3.25rem] h-8 rounded-full transition-all duration-300 border-[3px] flex-none"
                                            :class="localConfig.classic?.mutators?.suicidalStop ? 'bg-action-error border-red-400' : 'bg-white border-panel-card shadow-inner'"
                                        >
                                            <span class="absolute top-0.5 w-5 h-5 rounded-full shadow-sm transition-all duration-300"
                                                  :class="localConfig.classic?.mutators?.suicidalStop ? 'bg-white left-[calc(100%-1.4rem)]' : 'bg-panel-card left-1'"></span>
                                        </button>
                                    </div>
                                    <p class="text-ink-muted text-[10px] font-bold mt-2 ml-9">Si presionas STOP y te rechazan una palabra, pierdes todos tus puntos.</p>
                                </div>

                                <!-- Anonymous Voting -->
                                <div class="bg-panel-input rounded-xl border-2 border-panel-card shadow-inner p-3">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-2.5">
                                            <span class="text-xl">🎭</span>
                                            <span class="text-ink-main font-black text-sm">Voto Anónimo</span>
                                        </div>
                                        <button
                                            @click="handleMutatorChange('anonymousVoting', !localConfig.classic?.mutators?.anonymousVoting)"
                                            class="relative w-[3.25rem] h-8 rounded-full transition-all duration-300 border-[3px] flex-none"
                                            :class="localConfig.classic?.mutators?.anonymousVoting ? 'bg-purple-500 border-purple-300' : 'bg-white border-panel-card shadow-inner'"
                                        >
                                            <span class="absolute top-0.5 w-5 h-5 rounded-full shadow-sm transition-all duration-300"
                                                  :class="localConfig.classic?.mutators?.anonymousVoting ? 'bg-white left-[calc(100%-1.4rem)]' : 'bg-panel-card left-1'"></span>
                                        </button>
                                    </div>
                                    <p class="text-ink-muted text-[10px] font-bold mt-2 ml-9">Las palabras se evalúan sin saber quién las escribió.</p>
                                </div>
                            </div>

                            </template>

                            <!-- ===== IMPOSTOR MODE SETTINGS ===== -->
                            <template v-else-if="localConfig.mode === 'IMPOSTOR'">
                            <!-- Impostor mode specific settings -->
                            <div class="bg-panel-input rounded-xl border-2 border-panel-card shadow-inner p-3">
                                <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2">🔁 Rondas</label>
                                <div class="flex items-center justify-between">
                                    <button @click="decrementImpostorRounds" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-white border-2 border-white text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">-</button>
                                    <span class="text-4xl font-black text-ink-main">{{ localConfig.impostor?.rounds || 3 }}</span>
                                    <button @click="incrementImpostorRounds" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-white border-2 border-white text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">+</button>
                                </div>
                            </div>

                            <div class="bg-panel-input rounded-xl border-2 border-panel-card shadow-inner p-3">
                                <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2">⏱️ Tiempo de Escritura</label>
                                <div class="flex items-center justify-between">
                                    <button @click="decrementImpostorTypingTime" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-white border-2 border-white text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">-</button>
                                    <div class="text-center">
                                        <span class="text-4xl font-black text-ink-main">{{ localConfig.impostor?.typingTime || 30 }}</span>
                                        <span class="text-ink-muted text-[10px] font-bold block -mt-1 uppercase">seg</span>
                                    </div>
                                    <button @click="incrementImpostorTypingTime" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-white border-2 border-white text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">+</button>
                                </div>
                            </div>

                            <div class="bg-panel-input rounded-xl border-2 border-panel-card shadow-inner p-3">
                                <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2">🗳️ Tiempo del Tribunal</label>
                                <div class="flex items-center justify-between">
                                    <button @click="decrementImpostorVotingTime" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-white border-2 border-white text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">-</button>
                                    <div class="text-center">
                                        <span class="text-4xl font-black text-ink-main">{{ localConfig.impostor?.votingTime || 40 }}</span>
                                        <span class="text-ink-muted text-[10px] font-bold block -mt-1 uppercase">seg</span>
                                    </div>
                                    <button @click="incrementImpostorVotingTime" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-white border-2 border-white text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">+</button>
                                </div>
                            </div>
                            </template>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- ================================ -->
        <!-- STICKY FOOTER: Start Button      -->
        <!-- ================================ -->
        <div class="fixed bottom-0 left-0 w-full p-4 bg-panel-base/90 backdrop-blur-xl border-t-[3px] border-white/50 z-50 lg:relative lg:bg-transparent lg:border-0 lg:backdrop-blur-none lg:p-4 lg:pt-0 flex-none pb-safe shadow-game-panel lg:shadow-none">
            <div class="max-w-[1400px] mx-auto">
                <TButton v-if="amIHost"
                    variant="primary"
                    size="lg"
                    class="w-full text-xl md:text-2xl"
                    :disabled="!canStart"
                    @click="handleStart"
                >
                    <span class="text-2xl md:text-3xl">⚡</span> EMPEZAR PARTIDA
                </TButton>
                <div v-else class="w-full py-5 text-center bg-panel-card rounded-2xl border-[3px] border-white text-ink-main text-sm font-black uppercase shadow-sm flex flex-col items-center justify-center">
                    <span class="animate-pulse flex items-center gap-2">⏳ Esperando al anfitrión...</span>
                </div>
            </div>
        </div>

        <!-- === CATEGORY EDITOR MODAL === -->
        <div v-if="showCategoriesModal" class="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-ink-main/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div class="bg-panel-base border-[3px] border-white/50 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
                <div class="p-4 border-b-2 border-white/50 flex items-center justify-between bg-panel-card/80 flex-none">
                    <h3 class="text-lg font-black text-ink-main uppercase tracking-widest">Selección de Categorías</h3>
                    <div class="text-xs font-bold text-ink-main bg-white px-3 py-1 rounded-full border-2 border-panel-card shadow-sm">
                        {{ tempSelectedCategories.length }} elegidas
                    </div>
                </div>

                <div class="p-4 bg-panel-card/30 space-y-3 flex-none border-b-2 border-white/30">
                     <div class="relative">
                         <span class="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
                         <input v-model="searchQuery" type="text" placeholder="Buscar categoría..." class="w-full bg-panel-input border-2 border-white pl-[3.25rem] pr-4 py-3 text-ink-main placeholder-ink-muted focus:border-action-cyan outline-none transition-colors font-bold text-sm rounded-xl shadow-inner">
                     </div>
                     <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
                        <button @click="activeFilterTag = null" :class="['px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-all border-2 whitespace-nowrap', !activeFilterTag ? 'bg-action-blue border-action-blue text-white shadow-sm' : 'border-white bg-white text-ink-soft hover:text-ink-main hover:bg-panel-card']">Todo</button>
                        <button v-for="tag in availableTags" :key="tag" @click="activeFilterTag = activeFilterTag === tag ? null : tag" :class="['px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-all border-2 whitespace-nowrap', activeFilterTag === tag ? 'bg-tuti-teal border-teal-400 text-ink-main shadow-sm' : 'border-white bg-white text-ink-soft hover:text-ink-main hover:bg-panel-card']">{{ tag }}</button>
                     </div>
                </div>

                <div class="flex-1 overflow-y-auto p-4 content-start bg-panel-input min-h-0 shadow-inner">
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <button v-for="cat in filteredCategories" :key="cat.name" @click="toggleCategory(cat.name)"
                            class="text-left px-4 py-4 rounded-2xl text-xs font-bold border-[3px] transition-all duration-200 flex items-center justify-between active:scale-95 shadow-sm"
                            :class="tempSelectedCategories.includes(cat.name) ? 'bg-action-blue border-blue-400 text-white' : 'bg-panel-card border-white text-ink-main hover:bg-white hover:border-action-cyan'"
                        >
                            {{ cat.name }}
                            <span v-if="tempSelectedCategories.includes(cat.name)" class="text-lg font-black leading-none">✓</span>
                        </button>
                    </div>
                    <div v-if="filteredCategories.length === 0" class="text-center py-16 text-ink-muted font-black uppercase tracking-widest text-sm flex flex-col items-center gap-3">
                        <span class="text-5xl">👻</span>
                        Sin resultados
                    </div>
                </div>

                <div class="p-4 border-t-2 border-white/50 bg-panel-base flex gap-3 flex-none">
                    <TButton variant="secondary" size="md" class="flex-1 py-4" @click="showCategoriesModal = false">Cancelar</TButton>
                    <TButton variant="primary" size="md" class="flex-1 py-4" @click="saveCategories">Guardar</TButton>
                </div>
            </div>
        </div>

    </div>
</template>

<style scoped>
::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.2);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.4);
}
</style>
