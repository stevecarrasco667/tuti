<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useGame } from '../composables/useGame';
import { useSound } from '../composables/useSound';
import { MASTER_CATEGORIES } from '../../shared/game-engine';

const { gameState, startGame, updateConfig, myUserId, amIHost, kickPlayer } = useGame();
const { playClick, playJoin, playAlarm, playSuccess } = useSound();

// Local state for config inputs
const localConfig = computed(() => gameState.value.config);

// --- Audio Triggers ---
// Watch for players joining
watch(() => gameState.value.players.length, (newCount, oldCount) => {
    if (newCount > oldCount) {
        playJoin();
    }
});

const handleConfigChange = (field: string, value: any) => {
    updateConfig({ [field]: value });
    playClick();
};

const handleKick = (targetUserId: string, name: string) => {
    if (confirm(`¿Estás seguro de que quieres expulsar a ${name}?`)) {
        kickPlayer(targetUserId);
    }
};

const handleQuickDelete = (catName: string) => {
    const current = localConfig.value.selectedCategories || [];
    const newSelection = current.filter(c => c !== catName);
    handleConfigChange('selectedCategories', newSelection);
};

// --- Manual Selection Modal ---
const showCategoriesModal = ref(false);
const searchQuery = ref('');
const activeFilterTag = ref<string | null>(null);
// We keep a local copy to allow cancelling edits
const tempSelectedCategories = ref<string[]>([]);

const openCategoryModal = () => {
    tempSelectedCategories.value = [...(localConfig.value.selectedCategories || [])];
    showCategoriesModal.value = true;
    searchQuery.value = '';
    activeFilterTag.value = null;
    playClick();
};

const toggleCategory = (catName: string) => {
    const index = tempSelectedCategories.value.indexOf(catName);
    if (index === -1) {
        tempSelectedCategories.value.push(catName);
    } else {
        tempSelectedCategories.value.splice(index, 1);
    }
    playClick();
};

const saveCategories = () => {
    handleConfigChange('selectedCategories', tempSelectedCategories.value);
    showCategoriesModal.value = false;
    playSuccess();
};

// Extract unique tags
const availableTags = computed(() => {
    const tags = new Set<string>();
    MASTER_CATEGORIES.forEach(c => c.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
});

const filteredCategories = computed(() => {
    const query = searchQuery.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    return MASTER_CATEGORIES.filter(cat => {
        // Tag Filter
        if (activeFilterTag.value && !cat.tags.includes(activeFilterTag.value)) {
            return false;
        }

        // Search Filter
        const normalized = cat.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return normalized.includes(query);
    });
});

// --- Steppers & Segmented Logic ---
const incrementRounds = () => {
    const val = (localConfig.value.totalRounds || 5);
    if (val < 20) handleConfigChange('totalRounds', val + 1);
};
const decrementRounds = () => {
     const val = (localConfig.value.totalRounds || 5);
    if (val > 1) handleConfigChange('totalRounds', val - 1);
};

const incrementCategories = () => {
    const val = localConfig.value.categoriesCount;
    if (val < 10) handleConfigChange('categoriesCount', val + 1);
};
const decrementCategories = () => {
     const val = localConfig.value.categoriesCount;
    if (val > 1) handleConfigChange('categoriesCount', val - 1);
};

// Mode Switch
const setRandomMode = () => handleConfigChange('mode', 'RANDOM');
const setManualMode = () => handleConfigChange('mode', 'MANUAL');

const canStart = computed(() => {
    if (!amIHost.value) return false;
    if (localConfig.value.mode === 'MANUAL') {
        return (localConfig.value.selectedCategories?.length || 0) >= 3;
    }
    return true;
});

const handleStart = () => {
    if (canStart.value) {
        playSuccess(); // Or a specific start sound
        startGame();
    } else {
        playAlarm(); // Error sound
    }
};

</script>

<template>
    <div class="h-full flex flex-col w-full max-w-4xl mx-auto bg-indigo-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden relative">
        
        <!-- Decoration Line -->
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fuchsia-500 via-yellow-400 to-fuchsia-500 opacity-60"></div>

        <!-- HEADER (Fixed) -->
        <div class="flex-none text-center p-6 border-b border-white/5 bg-black/20 relative">
            <h2 class="text-3xl font-black text-white mb-4 tracking-tight">Sala de Espera</h2>
            
            <!-- ROOM CODE -->
            <div class="inline-flex flex-col items-center justify-center p-4 bg-black/30 rounded-2xl border border-white/10 min-w-[240px] shadow-lg">
                <span class="text-indigo-300 text-[10px] uppercase font-bold tracking-[0.2em] mb-1">CÓDIGO DE SALA</span>
                <span class="text-5xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-indigo-200 tracking-[0.2em] pl-2 leading-none drop-shadow-sm">
                    {{ gameState.roomId || '----' }}
                </span>
            </div>

            <div class="absolute top-6 right-6">
                 <span class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 text-indigo-200 text-xs font-bold border border-indigo-500/30">
                    <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    {{ gameState.players.length }} Online
                </span>
            </div>
        </div>

        <!-- BODY (Scrollable Players + Config) -->
        <div class="flex-1 overflow-y-auto min-h-0 p-6 md:p-8 space-y-8 scrollbar-thin scrollbar-thumb-indigo-500/30 scrollbar-track-transparent">
            
            <!-- CONFIGURATION PANEL (Host Only) -->
            <div v-if="amIHost" class="space-y-6">
                <!-- Modes -->
                <div class="flex p-1.5 bg-black/30 rounded-xl border border-white/5">
                    <button 
                        @click="setRandomMode"
                        class="flex-1 py-3 rounded-lg text-sm font-black transition-all uppercase tracking-wide"
                        :class="localConfig.mode === 'RANDOM' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'"
                    >
                        🎲 Aleatorio
                    </button>
                    <button 
                         @click="setManualMode"
                        class="flex-1 py-3 rounded-lg text-sm font-black transition-all uppercase tracking-wide"
                        :class="localConfig.mode === 'MANUAL' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'"
                    >
                        📝 Manual
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Round Duration (Segmented) -->
                    <div class="bg-black/20 p-5 rounded-2xl border border-white/5">
                        <label class="block text-indigo-300 text-xs font-bold mb-3 uppercase tracking-widest">Tiempo por Ronda</label>
                        <div class="flex gap-2">
                             <button @click="handleConfigChange('roundDuration', 45)" :class="['flex-1 py-2.5 rounded-lg text-xs font-bold border-b-2 transition-all', localConfig.roundDuration === 45 ? 'bg-indigo-600 border-indigo-800 text-white shadow-lg' : 'bg-black/20 border-white/5 text-white/40 hover:bg-white/5']">Rápido (45s)</button>
                             <button @click="handleConfigChange('roundDuration', 60)" :class="['flex-1 py-2.5 rounded-lg text-xs font-bold border-b-2 transition-all', localConfig.roundDuration === 60 ? 'bg-indigo-600 border-indigo-800 text-white shadow-lg' : 'bg-black/20 border-white/5 text-white/40 hover:bg-white/5']">Normal (60s)</button>
                             <button @click="handleConfigChange('roundDuration', 90)" :class="['flex-1 py-2.5 rounded-lg text-xs font-bold border-b-2 transition-all', localConfig.roundDuration === 90 ? 'bg-indigo-600 border-indigo-800 text-white shadow-lg' : 'bg-black/20 border-white/5 text-white/40 hover:bg-white/5']">Lento (90s)</button>
                        </div>
                    </div>

                    <!-- Total Rounds (Stepper) -->
                    <div class="bg-black/20 p-5 rounded-2xl border border-white/5">
                         <label class="block text-indigo-300 text-xs font-bold mb-3 uppercase tracking-widest">Cantidad de Rondas</label>
                         <div class="flex items-center justify-between bg-black/20 rounded-xl border border-white/5 p-2">
                             <button @click="decrementRounds" class="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors">
                                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" /></svg>
                             </button>
                             <span class="text-2xl font-black text-yellow-400 font-mono">{{ localConfig.totalRounds || 5 }}</span>
                             <button @click="incrementRounds" class="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors">
                                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                             </button>
                         </div>
                    </div>
                </div>

                <!-- DYNAMIC CONTENT CONFIG -->
                <div class="bg-black/20 p-5 rounded-2xl border border-white/5 relative overflow-hidden transition-all duration-300">
                    <div v-if="localConfig.mode === 'RANDOM'">
                         <label class="block text-indigo-300 text-xs font-bold mb-3 uppercase tracking-widest">Categorías por Ronda</label>
                         <div class="flex items-center justify-between bg-black/20 rounded-xl border border-white/5 p-2">
                             <button @click="decrementCategories" class="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors">
                                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" /></svg>
                             </button>
                             <span class="text-2xl font-black text-yellow-400 font-mono">{{ localConfig.categoriesCount }}</span>
                             <button @click="incrementCategories" class="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors">
                                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                             </button>
                         </div>
                         <p class="text-xs text-white/30 mt-3 text-center font-medium">Se elegirán al azar en cada ronda.</p>
                    </div>

                    <div v-else>
                         <div class="flex justify-between items-center mb-4">
                            <label class="block text-indigo-300 text-xs font-bold uppercase tracking-widest">
                                Categorías ({{ localConfig.selectedCategories?.length || 0 }})
                            </label>
                            <button @click="openCategoryModal" class="text-[10px] bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-3 py-1.5 rounded-lg font-black tracking-wide transition-all shadow-lg border border-white/10">
                                EDITAR SELECCIÓN
                            </button>
                         </div>
                         
                         <div v-if="localConfig.selectedCategories?.length > 0" class="flex flex-wrap gap-2">
                             <div v-for="cat in localConfig.selectedCategories" :key="cat" class="group flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg text-xs font-bold text-indigo-100 border border-indigo-500/20 transition-colors">
                                 <span>{{ cat }}</span>
                                 <button @click.stop="handleQuickDelete(cat)" class="text-white/30 hover:text-red-400 font-bold px-1 focus:outline-none">
                                     &times;
                                 </button>
                             </div>
                         </div>
                         <div v-else class="text-center py-6 border-2 border-dashed border-white/5 rounded-xl bg-black/10">
                             <p class="text-white/40 text-sm font-bold">No has seleccionado categorías.</p>
                             <p class="text-red-400 text-xs mt-1 font-bold" v-if="localConfig.mode === 'MANUAL' && (localConfig.selectedCategories?.length || 0) < 3">Mínimo 3 requeridas.</p>
                         </div>
                    </div>
                </div>

            </div> 
            <!-- END HOST CONFIG -->
            
             <!-- CONFIGURATION READONLY (Guest) -->
             <div v-else class="space-y-4 pt-4 border-t border-white/5 opacity-80">
                <div class="bg-black/20 p-6 rounded-2xl border border-white/5 flex flex-col gap-3 text-center">
                    <span class="text-indigo-300 text-xs uppercase font-bold tracking-widest">{{ localConfig.mode === 'RANDOM' ? 'Modo Aleatorio' : 'Modo Manual' }}</span>
                    <div class="flex justify-center gap-8 mt-2">
                         <div>
                            <span class="block text-white/30 text-[10px] uppercase font-bold tracking-wider">Rondas</span>
                            <span class="text-yellow-400 font-black text-2xl font-mono">{{ localConfig.totalRounds || 5 }}</span>
                         </div>
                         <div>
                            <span class="block text-white/30 text-[10px] uppercase font-bold tracking-wider">Tiempo</span>
                            <span class="text-yellow-400 font-black text-2xl font-mono">{{ localConfig.roundDuration }}s</span>
                         </div>
                         <div>
                            <span class="block text-white/30 text-[10px] uppercase font-bold tracking-wider">Categs</span>
                            <span class="text-yellow-400 font-black text-2xl font-mono">{{ localConfig.mode === 'RANDOM' ? localConfig.categoriesCount : (localConfig.selectedCategories?.length || 0) }}</span>
                         </div>
                    </div>
                </div>
            </div>

            <!-- PLAYER LIST -->
            <div class="space-y-4">
                <h3 class="text-white font-bold text-sm uppercase tracking-widest mb-2 sticky top-0 bg-indigo-900/90 backdrop-blur-md z-10 py-2 border-b border-white/5">Jugadores Conectados</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div 
                        v-for="player in gameState.players" 
                        :key="player.id"
                        :class="['flex items-center justify-between p-3 rounded-xl border transition-all duration-300 group relative overflow-hidden', 
                                 player.isConnected ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-lg' : 'bg-black/20 border-white/5 opacity-50 grayscale']"
                    >
                        <div class="flex items-center gap-4 relative z-10">
                            <div class="relative">
                                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg border border-white/10 group-hover:scale-105 transition-transform">
                                    {{ player.avatar || '👤' }}
                                </div>
                                <div 
                                    :class="['absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-black shadow-sm', 
                                             player.isConnected ? 'bg-green-400' : 'bg-red-500/50']"
                                ></div>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-white font-bold text-base leading-tight">
                                    {{ player.name }}
                                    <span v-if="player.id === myUserId" class="ml-1 text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">YO</span>
                                </span>
                                <span v-if="!player.isConnected" class="text-[9px] text-red-400 uppercase font-bold tracking-wider">
                                    DESCONECTADO
                                </span>
                                <span v-else class="text-[10px] text-white/30 font-bold uppercase tracking-wider">En línea</span>
                            </div>
                        </div>
                        
                        <!-- Host Badge -->
                         <div v-if="player.isHost" class="absolute -top-1 -right-1">
                             <span class="text-[10px] font-black text-black bg-yellow-400 px-2 py-1 rounded-bl-lg shadow-sm">👑 HOST</span>
                         </div>

                        <!-- Actions -->
                        <div class="relative z-10">
                            <button 
                                v-if="amIHost && player.id !== myUserId"
                                @click="handleKick(player.id, player.name)"
                                class="text-white/20 hover:text-red-400 p-2 rounded-lg hover:bg-white/5 transition-colors"
                                title="Expulsar jugador"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- FOOTER (Action Button) -->
        <div class="flex-none p-6 border-t border-white/5 bg-black/20 flex justify-center z-10 backdrop-blur-md">
            <button 
                v-if="amIHost"
                @click="handleStart"
                :disabled="!canStart"
                class="w-full bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale text-white font-black text-xl py-5 rounded-2xl shadow-[0_0_30px_rgba(236,72,153,0.4)] transform transition-all active:scale-[0.98] border border-white/10 flex items-center justify-center gap-3"
            >
                <span class="text-2xl drop-shadow-md">🚀</span> INICIAR PARTIDA
            </button>
            <div v-else class="text-center w-full py-2">
                <p class="text-indigo-300 animate-pulse font-bold text-sm tracking-widest uppercase">Esperando al anfitrión...</p>
            </div>
        </div>

        <!-- CATEGORY SELECTION MODAL -->
        <div v-if="showCategoriesModal" class="absolute inset-0 z-50 bg-indigo-950/95 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom-5 duration-200">
            <div class="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
                <h3 class="text-white font-bold text-lg">Seleccionar Categorías</h3>
                <span class="text-indigo-300 text-xs font-mono bg-indigo-500/10 px-2 py-1 rounded font-bold">{{ tempSelectedCategories.length }} seleccionadas</span>
            </div>
            
            <div class="p-4 bg-black/10 space-y-3">
                <input 
                    v-model="searchQuery" 
                    type="text" 
                    placeholder="Buscar..." 
                    class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:bg-black/30 focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/50 transition-all font-bold"
                    autoFocus
                >
                <!-- Filter Pills -->
                <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                        @click="activeFilterTag = null"
                        :class="['px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-colors border', !activeFilterTag ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-black/30 text-white/40 border-white/10 hover:bg-white/10 hover:text-white']"
                    >
                        TODO
                    </button>
                    <button
                        v-for="tag in availableTags"
                        :key="tag"
                        @click="activeFilterTag = activeFilterTag === tag ? null : tag"
                        :class="['px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-colors border', activeFilterTag === tag ? 'bg-indigo-500 text-white border-indigo-400 shadow-md' : 'bg-black/30 text-white/40 border-white/10 hover:bg-white/10 hover:text-white']"
                    >
                        {{ tag }}
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto p-4 content-start">
                 <div class="grid grid-cols-2 gap-2">
                     <button
                        v-for="cat in filteredCategories"
                        :key="cat.id"
                        @click="toggleCategory(cat.name)"
                        class="text-left px-3 py-3 rounded-lg text-xs font-bold border transition-all duration-200 relative overflow-hidden group"
                        :class="tempSelectedCategories.includes(cat.name) ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'"
                     >
                        <span class="relative z-10">{{ cat.name }}</span>
                     </button>
                     <p v-if="filteredCategories.length === 0" class="col-span-full text-center text-white/30 py-8 font-bold text-sm uppercase">
                         No se encontraron resultados
                     </p>
                 </div>
            </div>

            <div class="p-4 border-t border-white/10 bg-black/40 flex gap-3">
                <button @click="showCategoriesModal = false" class="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl font-black transition-all border border-white/5">
                    Cancelar
                </button>
                <button @click="saveCategories" class="flex-1 py-3 bg-green-500 hover:bg-green-400 text-black rounded-xl font-black transition-all shadow-lg active:scale-[0.98]">
                    Guardar ({{ tempSelectedCategories.length }})
                </button>
            </div>
        </div>

    </div>
</template> 

