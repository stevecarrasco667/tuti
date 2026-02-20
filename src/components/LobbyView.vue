<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useGame } from '../composables/useGame';
import { useSound } from '../composables/useSound';
import { MASTER_CATEGORIES } from '../../shared/engines/categories';

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
    updateConfig({ [field]: value });
    playClick();
};

const handleMutatorChange = (mutator: string, value: boolean) => {
    updateConfig({ mutators: { ...localConfig.value.mutators, [mutator]: value } } as any);
    playClick();
};

const handleKick = (targetUserId: string, name: string) => {
    if (confirm(`¿Eliminar a ${name} de la sala?`)) {
        kickPlayer(targetUserId);
    }
};

const handleQuickDelete = (catName: string) => {
    const current = localConfig.value.categories || [];
    handleConfigChange('categories', current.filter((c: string) => c !== catName));
};

// --- Manual Selection Modal ---
const showCategoriesModal = ref(false);
const searchQuery = ref('');
const activeFilterTag = ref<string | null>(null);
const tempSelectedCategories = ref<string[]>([]);

const openCategoryModal = () => {
    tempSelectedCategories.value = [...(localConfig.value.categories || [])];
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
    handleConfigChange('categories', tempSelectedCategories.value);
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

// --- Steppers Logic ---
const incrementRounds = () => {
    const val = localConfig.value.rounds || 5;
    if (val < 20) handleConfigChange('rounds', val + 1);
};
const decrementRounds = () => {
    const val = localConfig.value.rounds || 5;
    if (val > 1) handleConfigChange('rounds', val - 1);
};

const timeLimitOptions = [30, 45, 60, 90, 120, 180];
const incrementTimeLimit = () => {
    const current = localConfig.value.timeLimit || 60;
    const idx = timeLimitOptions.indexOf(current);
    if (idx < timeLimitOptions.length - 1) handleConfigChange('timeLimit', timeLimitOptions[idx + 1]);
};
const decrementTimeLimit = () => {
    const current = localConfig.value.timeLimit || 60;
    const idx = timeLimitOptions.indexOf(current);
    if (idx > 0) handleConfigChange('timeLimit', timeLimitOptions[idx - 1]);
};

const votingOptions = [10, 15, 20, 30, 45, 60, 90, 120];
const incrementVotingDuration = () => {
    const current = localConfig.value.votingDuration || 30;
    const idx = votingOptions.indexOf(current);
    if (idx < votingOptions.length - 1) handleConfigChange('votingDuration', votingOptions[idx + 1]);
};
const decrementVotingDuration = () => {
    const current = localConfig.value.votingDuration || 30;
    const idx = votingOptions.indexOf(current);
    if (idx > 0) handleConfigChange('votingDuration', votingOptions[idx - 1]);
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
            <div class="bg-indigo-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3">
                <!-- Left: Pub/Priv + Code -->
                <div class="flex items-center gap-3 min-w-0">
                    <!-- Public/Private Toggle (Host) -->
                    <button v-if="amIHost"
                        @click="handleConfigChange('isPublic', !localConfig.isPublic)"
                        class="flex-none w-10 h-10 rounded-xl border flex items-center justify-center text-lg transition-all active:scale-90"
                        :class="localConfig.isPublic ? 'bg-emerald-600/20 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]' : 'bg-white/5 border-white/10'"
                    >
                        {{ localConfig.isPublic ? '🌐' : '🔒' }}
                    </button>
                    <span v-else class="flex-none text-xl">{{ localConfig.isPublic ? '🌐' : '🔒' }}</span>

                    <!-- Room Code -->
                    <div class="min-w-0">
                        <p class="text-white/25 text-[7px] font-black uppercase tracking-widest">{{ localConfig.isPublic ? 'Sala Pública' : 'Sala Privada' }}</p>
                        <span class="text-lg lg:text-xl font-black text-white tracking-[0.2em] font-mono select-all block truncate">{{ gameState.roomId }}</span>
                    </div>
                </div>

                <!-- Right: Copy Link -->
                <button
                    @click="copyRoomLink"
                    class="flex-none px-3 py-2 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black rounded-xl transition-all border border-white/10 flex items-center gap-1.5 active:scale-95"
                >
                    <span>{{ copied ? '✓' : '🔗' }}</span>
                    <span class="hidden sm:inline">{{ copied ? 'Copiado' : 'Invitar' }}</span>
                </button>
            </div>
        </div>

        <!-- ============================= -->
        <!-- TAB BAR (Mobile only)         -->
        <!-- ============================= -->
        <div class="flex-none px-3 lg:hidden">
            <div class="flex bg-indigo-900/30 rounded-xl border border-white/5 p-1 gap-1">
                <button
                    @click="activeTab = 'players'"
                    class="flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    :class="activeTab === 'players'
                        ? 'bg-indigo-600/40 text-white shadow-lg border border-indigo-500/30'
                        : 'text-white/40 hover:text-white/60'"
                >
                    👥 Jugadores
                    <span class="text-[9px] opacity-60">{{ players.length }}/{{ localConfig.maxPlayers }}</span>
                </button>
                <button
                    @click="activeTab = 'settings'"
                    class="flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    :class="activeTab === 'settings'
                        ? 'bg-indigo-600/40 text-white shadow-lg border border-indigo-500/30'
                        : 'text-white/40 hover:text-white/60'"
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
                <div class="lg:col-span-3 bg-indigo-900/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden min-h-0"
                     :class="{ 'hidden lg:flex': activeTab !== 'players' }"
                >
                    <!-- Header: Title + MaxPlayers -->
                    <div class="p-3 border-b border-white/5 bg-black/20 flex-none">
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                Jugadores {{ players.length }}/{{ localConfig.maxPlayers }}
                            </h3>
                        </div>
                        <div v-if="amIHost" class="relative">
                            <select
                                :value="localConfig.maxPlayers"
                                @change="handleConfigChange('maxPlayers', Number(($event.target as HTMLSelectElement).value))"
                                class="w-full bg-black/30 border border-white/10 text-white text-xs font-black uppercase tracking-wider px-3 py-2 rounded-xl appearance-none cursor-pointer hover:bg-black/40 transition-colors focus:outline-none focus:border-indigo-400"
                            >
                                <option v-for="n in 9" :key="n+1" :value="n+1" class="bg-indigo-950">{{ n + 1 }} JUGADORES</option>
                            </select>
                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none text-[10px]">▼</span>
                        </div>
                        <div v-else class="bg-black/20 border border-white/5 text-white/50 text-xs font-black uppercase tracking-wider px-3 py-2 rounded-xl">
                            {{ localConfig.maxPlayers }} JUGADORES
                        </div>
                    </div>

                    <!-- Player List + Empty Slots -->
                    <div class="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
                        <div v-for="player in players" :key="player.id"
                             class="flex items-center gap-2.5 p-2.5 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors group"
                        >
                            <span class="text-xl flex-none">{{ player.avatar || '👤' }}</span>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-1.5 truncate">
                                    <span class="text-white font-bold text-sm truncate">{{ player.name }}</span>
                                    <span v-if="player.isHost" class="flex-none text-[8px]">👑</span>
                                    <span v-if="player.id === myUserId" class="flex-none text-[7px] font-black text-indigo-300 bg-indigo-500/20 px-1 py-0.5 rounded">TÚ</span>
                                </div>
                                <div class="text-[8px] font-bold uppercase tracking-wider" :class="player.isConnected ? 'text-emerald-400/60' : 'text-red-400/60'">
                                    {{ player.isConnected ? 'Conectado' : 'Reconectando...' }}
                                </div>
                            </div>
                            <button v-if="amIHost && !player.isHost" @click="handleKick(player.id, player.name)"
                                class="hidden group-hover:flex flex-none w-7 h-7 items-center justify-center rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all text-[10px]"
                            >✕</button>
                        </div>

                        <div v-for="spec in gameState.spectators" :key="spec.id"
                             class="flex items-center gap-2.5 p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.03]">
                            <span class="text-lg opacity-40 flex-none">{{ spec.avatar || '👤' }}</span>
                            <div class="flex-1 min-w-0">
                                <span class="text-white/30 font-bold text-xs truncate block">{{ spec.name }}</span>
                                <span class="text-[8px] font-bold text-amber-400/50 uppercase">👁️ Espectador</span>
                            </div>
                        </div>

                        <div v-for="i in emptySlots" :key="'empty-' + i"
                             class="flex items-center gap-2.5 p-2.5 rounded-xl border-2 border-dashed border-white/[0.06]"
                        >
                            <span class="text-lg opacity-20 flex-none">👤</span>
                            <span class="text-white/15 font-bold text-xs uppercase tracking-wider">Vacío</span>
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
                        <div class="bg-indigo-900/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 flex-none">
                            <p class="text-indigo-300/70 text-[9px] font-black uppercase tracking-[0.2em] mb-3 text-center">Modo de Juego</p>
                            <div class="grid grid-cols-2 gap-3">
                                <button
                                    @click="handleConfigChange('mode', 'CLASSIC')"
                                    class="relative p-4 lg:p-5 rounded-2xl border-2 transition-all duration-300 text-center group min-h-[110px] flex flex-col items-center justify-center"
                                    :class="localConfig.mode === 'CLASSIC'
                                        ? 'border-yellow-400/60 bg-gradient-to-b from-yellow-400/10 to-transparent shadow-[0_0_25px_rgba(250,204,21,0.1)]'
                                        : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'"
                                >
                                    <div class="text-3xl lg:text-4xl mb-1.5 group-hover:scale-110 transition-transform">🎯</div>
                                    <h4 class="text-white font-black text-xs lg:text-sm tracking-wide">TUTI CLÁSICO</h4>
                                    <p class="text-white/30 text-[8px] font-bold mt-1">Categorías · Letras · Velocidad</p>
                                    <div v-if="localConfig.mode === 'CLASSIC'" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-yellow-400 text-black flex items-center justify-center text-[10px] font-black shadow-lg">✓</div>
                                </button>

                                <button
                                    @click="handleConfigChange('mode', 'IMPOSTOR')"
                                    class="relative p-4 lg:p-5 rounded-2xl border-2 transition-all duration-300 text-center group min-h-[110px] flex flex-col items-center justify-center"
                                    :class="localConfig.mode === 'IMPOSTOR'
                                        ? 'border-indigo-400/60 bg-gradient-to-b from-indigo-500/10 to-transparent shadow-[0_0_25px_rgba(99,102,241,0.1)]'
                                        : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'"
                                >
                                    <div class="text-3xl lg:text-4xl mb-1.5 group-hover:scale-110 transition-transform">🕵️</div>
                                    <h4 class="text-white font-black text-xs lg:text-sm tracking-wide">IMPOSTOR</h4>
                                    <p class="text-white/30 text-[8px] font-bold mt-1">¿Quién está mintiendo?</p>
                                    <div v-if="localConfig.mode === 'IMPOSTOR'" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-400 text-white flex items-center justify-center text-[10px] font-black shadow-lg">✓</div>
                                </button>
                            </div>
                        </div>

                        <!-- CATEGORIES -->
                        <div class="bg-indigo-900/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex-1 flex flex-col overflow-hidden min-h-[120px] lg:min-h-0">
                            <div class="p-3 border-b border-white/5 bg-black/20 flex items-center justify-between flex-none">
                                <p class="text-indigo-300/70 text-[9px] font-black uppercase tracking-[0.2em]">
                                    Categorías <span class="text-white/30">({{ localConfig.categories?.length || 0 }})</span>
                                </p>
                                <button @click="openCategoryModal" class="text-[8px] bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-3 py-1.5 rounded-lg font-black tracking-wider transition-all shadow-lg border border-white/10 active:scale-95 uppercase">
                                    Editar +
                                </button>
                            </div>
                            <div class="flex-1 overflow-y-auto p-3 min-h-0">
                                <div v-if="localConfig.categories?.length > 0" class="flex flex-wrap gap-1.5 content-start">
                                    <TransitionGroup name="list">
                                    <div v-for="cat in localConfig.categories" :key="cat"
                                         class="group flex items-center pl-2.5 pr-1.5 py-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 rounded-full text-[11px] font-bold text-indigo-200 border border-indigo-500/20 transition-all hover:border-indigo-400/40">
                                        <span>{{ cat }}</span>
                                        <button @click.stop="handleQuickDelete(cat)" class="ml-1 w-4 h-4 flex items-center justify-center rounded-full bg-black/20 text-white/30 hover:text-white hover:bg-red-500/80 transition-colors text-[10px]">
                                            &times;
                                        </button>
                                    </div>
                                    </TransitionGroup>
                                </div>
                                <div v-else class="h-full flex flex-col items-center justify-center text-center py-6">
                                    <span class="text-3xl mb-2 opacity-30">🎲</span>
                                    <p class="text-white/25 font-bold text-sm">5 categorías aleatorias</p>
                                    <p class="text-white/15 text-[9px] font-bold mt-1">Personaliza con "Editar"</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ================================= -->
                    <!-- RIGHT: Settings (lg:col-4)        -->
                    <!-- ================================= -->
                    <div class="lg:col-span-4 bg-indigo-900/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden min-h-0"
                         :class="{ 'opacity-60 pointer-events-none': !amIHost }"
                    >
                        <div class="p-3 border-b border-white/5 bg-black/20 flex items-center justify-between flex-none">
                            <h3 class="text-indigo-300/70 text-[9px] font-black uppercase tracking-[0.2em]">Ajustes</h3>
                            <span v-if="!amIHost" class="text-amber-400/60 text-[8px] font-black uppercase tracking-wider animate-pulse">Solo lectura</span>
                        </div>

                        <div class="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin min-h-0">

                            <!-- Rounds -->
                            <div class="bg-black/20 rounded-xl border border-white/5 p-3">
                                <label class="text-indigo-300/50 text-[8px] font-black uppercase tracking-widest block mb-2">🔁 Rondas</label>
                                <div class="flex items-center justify-between">
                                    <button @click="decrementRounds" class="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/15 text-white flex items-center justify-center font-bold active:scale-90 transition-all text-xl">-</button>
                                    <span class="text-3xl font-black text-yellow-400 font-mono">{{ localConfig.rounds || 5 }}</span>
                                    <button @click="incrementRounds" class="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/15 text-white flex items-center justify-center font-bold active:scale-90 transition-all text-xl">+</button>
                                </div>
                            </div>

                            <!-- Time Limit -->
                            <div class="bg-black/20 rounded-xl border border-white/5 p-3">
                                <label class="text-indigo-300/50 text-[8px] font-black uppercase tracking-widest block mb-2">⏱️ Tiempo de Escritura</label>
                                <div class="flex items-center justify-between">
                                    <button @click="decrementTimeLimit" class="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/15 text-white flex items-center justify-center font-bold active:scale-90 transition-all text-xl">-</button>
                                    <div class="text-center">
                                        <span class="text-3xl font-black text-yellow-400 font-mono">{{ localConfig.timeLimit || 60 }}</span>
                                        <span class="text-white/20 text-[9px] font-bold block -mt-1">seg</span>
                                    </div>
                                    <button @click="incrementTimeLimit" class="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/15 text-white flex items-center justify-center font-bold active:scale-90 transition-all text-xl">+</button>
                                </div>
                            </div>

                            <!-- Voting Duration -->
                            <div class="bg-black/20 rounded-xl border border-white/5 p-3">
                                <label class="text-indigo-300/50 text-[8px] font-black uppercase tracking-widest block mb-2">🗳️ Tiempo de Votación</label>
                                <div class="flex items-center justify-between">
                                    <button @click="decrementVotingDuration" class="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/15 text-white flex items-center justify-center font-bold active:scale-90 transition-all text-xl">-</button>
                                    <div class="text-center">
                                        <span class="text-3xl font-black text-yellow-400 font-mono">{{ localConfig.votingDuration || 30 }}</span>
                                        <span class="text-white/20 text-[9px] font-bold block -mt-1">seg</span>
                                    </div>
                                    <button @click="incrementVotingDuration" class="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/15 text-white flex items-center justify-center font-bold active:scale-90 transition-all text-xl">+</button>
                                </div>
                            </div>

                            <hr class="border-white/5" />

                            <!-- MUTATORS -->
                            <div>
                                <p class="text-indigo-300/50 text-[8px] font-black uppercase tracking-widest mb-3">⚡ Mutadores</p>

                                <!-- Suicidal Stop -->
                                <div class="bg-black/20 rounded-xl border border-white/5 p-3 mb-3">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-2.5">
                                            <span class="text-lg">💀</span>
                                            <span class="text-white font-bold text-xs">Stop Suicida</span>
                                        </div>
                                        <button
                                            @click="handleMutatorChange('suicidalStop', !localConfig.mutators.suicidalStop)"
                                            class="relative w-12 h-7 rounded-full transition-all duration-300 border flex-none"
                                            :class="localConfig.mutators.suicidalStop ? 'bg-red-600 border-red-400/50 shadow-[0_0_12px_rgba(220,38,38,0.3)]' : 'bg-white/10 border-white/15'"
                                        >
                                            <span class="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300"
                                                  :class="localConfig.mutators.suicidalStop ? 'left-[calc(100%-1.625rem)]' : 'left-0.5'"></span>
                                        </button>
                                    </div>
                                    <p class="text-white/25 text-[9px] font-bold mt-1.5 ml-8">Si presionas STOP y te rechazan una palabra, pierdes todos tus puntos.</p>
                                </div>

                                <!-- Anonymous Voting -->
                                <div class="bg-black/20 rounded-xl border border-white/5 p-3">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-2.5">
                                            <span class="text-lg">🎭</span>
                                            <span class="text-white font-bold text-xs">Voto Anónimo</span>
                                        </div>
                                        <button
                                            @click="handleMutatorChange('anonymousVoting', !localConfig.mutators.anonymousVoting)"
                                            class="relative w-12 h-7 rounded-full transition-all duration-300 border flex-none"
                                            :class="localConfig.mutators.anonymousVoting ? 'bg-purple-600 border-purple-400/50 shadow-[0_0_12px_rgba(147,51,234,0.3)]' : 'bg-white/10 border-white/15'"
                                        >
                                            <span class="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300"
                                                  :class="localConfig.mutators.anonymousVoting ? 'left-[calc(100%-1.625rem)]' : 'left-0.5'"></span>
                                        </button>
                                    </div>
                                    <p class="text-white/25 text-[9px] font-bold mt-1.5 ml-8">Las palabras se evalúan sin saber quién las escribió.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- ================================ -->
        <!-- STICKY FOOTER: Start Button      -->
        <!-- ================================ -->
        <div class="fixed bottom-0 left-0 w-full p-3 bg-gray-950/90 backdrop-blur-xl border-t border-white/5 z-50 lg:relative lg:bg-transparent lg:border-0 lg:backdrop-blur-none lg:p-3 lg:pt-0 flex-none">
            <div class="max-w-[1400px] mx-auto">
                <button v-if="amIHost"
                    @click="handleStart"
                    :disabled="!canStart"
                    class="w-full py-3.5 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale text-white font-black text-base rounded-2xl shadow-[0_0_25px_rgba(236,72,153,0.3)] transition-all active:scale-[0.98] border border-white/10 flex items-center justify-center gap-2"
                >
                    <span class="text-lg">🚀</span> EMPEZAR PARTIDA
                </button>
                <div v-else class="w-full py-3.5 text-center text-white/40 text-sm font-bold animate-pulse">
                    ⏳ Esperando al anfitrión...
                </div>
            </div>
        </div>

        <!-- === CATEGORY EDITOR MODAL === -->
        <div v-if="showCategoriesModal" class="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div class="bg-indigo-950 border border-white/10 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                <div class="p-4 border-b border-white/10 flex items-center justify-between bg-black/20 flex-none">
                    <h3 class="text-lg font-black text-white">Selección de Categorías</h3>
                    <div class="text-xs font-bold text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                        {{ tempSelectedCategories.length }} elegidas
                    </div>
                </div>

                <div class="p-3 bg-white/5 space-y-2 flex-none">
                     <input v-model="searchQuery" type="text" placeholder="🔍 Buscar categoría..." class="w-full bg-black/30 border-b-2 border-white/10 px-4 py-2 text-white placeholder-white/30 focus:border-yellow-400 outline-none transition-colors font-bold text-sm rounded-t-lg">
                     <div class="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        <button @click="activeFilterTag = null" :class="['px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wide transition-all border', !activeFilterTag ? 'bg-yellow-400 border-yellow-400 text-black' : 'border-white/10 bg-black/20 text-white/50 hover:text-white']">Todo</button>
                        <button v-for="tag in availableTags" :key="tag" @click="activeFilterTag = activeFilterTag === tag ? null : tag" :class="['px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wide transition-all border whitespace-nowrap', activeFilterTag === tag ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg' : 'border-white/10 bg-black/20 text-white/50 hover:text-white']">{{ tag }}</button>
                     </div>
                </div>

                <div class="flex-1 overflow-y-auto p-3 content-start bg-black/20 min-h-0">
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        <button v-for="cat in filteredCategories" :key="cat.name" @click="toggleCategory(cat.name)"
                            class="text-left px-3 py-2.5 rounded-lg text-xs font-bold border transition-all duration-200 flex items-center justify-between active:scale-95"
                            :class="tempSelectedCategories.includes(cat.name) ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'"
                        >
                            {{ cat.name }}
                            <span v-if="tempSelectedCategories.includes(cat.name)" class="text-xs">✓</span>
                        </button>
                    </div>
                    <div v-if="filteredCategories.length === 0" class="text-center py-12 text-white/30 font-bold uppercase tracking-widest text-sm">Sin resultados</div>
                </div>

                <div class="p-3 border-t border-white/10 bg-black/40 flex gap-3 flex-none">
                    <button @click="showCategoriesModal = false" class="flex-1 py-3 rounded-xl font-black text-white/50 hover:text-white hover:bg-white/10 transition-colors uppercase tracking-wide text-xs">Cancelar</button>
                    <button @click="saveCategories" class="flex-1 py-3 rounded-xl font-black bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-lg transition-all active:scale-[0.98] uppercase tracking-wide text-xs">Guardar</button>
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
