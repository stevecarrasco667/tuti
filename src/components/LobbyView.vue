<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useGame } from '../composables/useGame';
import { useSound } from '../composables/useSound';
import type { CategoryRef } from '../../shared/types';
import TButton from './ui/TButton.vue';
import LobbyHeader from './lobby/LobbyHeader.vue';
import PlayerList from './lobby/PlayerList.vue';
import GameConfigPanel from './lobby/GameConfigPanel.vue';
import CategorySelector from './lobby/CategorySelector.vue';

const { gameState, startGame, updateConfig, myUserId, amIHost, kickPlayer } = useGame();
const { playClick, playJoin, playAlarm, playSuccess } = useSound();

// ── Smart State (Orquestador) ─────────────────────────────────────────────────
const localConfig = computed(() => gameState.value.config);
const players = computed(() => gameState.value.players);
const copied = ref(false);
const activeTab = ref<'players' | 'settings'>('players');

// Trigger audio when someone joins
watch(() => gameState.value.players.length, (newCount, oldCount) => {
    if (newCount > oldCount) playJoin();
});

// ── Event Handlers (bridge entre hijos y useGame) ─────────────────────────────
const handleConfigChange = (field: string, value: any) => {
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
    if (confirm(`¿Eliminar a ${name} de la sala?`)) kickPlayer(targetUserId);
};

const handleUpdateCategories = (categories: CategoryRef[]) => {
    handleConfigChange('classic.categories', categories);
};

const handleRemoveCategory = (catName: string) => {
    const current = localConfig.value.classic?.categories || [];
    handleConfigChange('classic.categories', current.filter((c: CategoryRef) => c.name !== catName));
};

const handleTogglePrivacy = () => {
    handleConfigChange('isPublic', !localConfig.value.isPublic);
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

const canStart = computed(() => amIHost.value);
const handleStart = () => {
    if (!canStart.value) return;
    playAlarm();
    startGame();
};
</script>

<template>
    <div class="h-full w-full max-w-[1400px] mx-auto flex flex-col overflow-hidden">

        <!-- Header: Room Code + Pub/Priv + Copy -->
        <LobbyHeader
            :room-id="gameState.roomId ?? ''"
            :is-public="localConfig.isPublic"
            :am-i-host="amIHost"
            :copied="copied"
            @toggle-privacy="handleTogglePrivacy"
            @copy-link="copyRoomLink"
        />

        <!-- Tab Bar (Mobile only) -->
        <div class="flex-none px-3 lg:hidden">
            <div class="flex bg-panel-input rounded-xl border-2 border-panel-card p-1 gap-1 shadow-inner">
                <button
                    @click="activeTab = 'players'"
                    class="flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    :class="activeTab === 'players'
                        ? 'bg-panel-base text-action-blue shadow-sm border border-white/10'
                        : 'text-ink-muted hover:text-ink-soft'"
                >
                    👥 Jugadores
                    <span class="text-[9px] font-bold text-ink-soft opacity-80">{{ players.length }}/{{ localConfig.maxPlayers }}</span>
                </button>
                <button
                    @click="activeTab = 'settings'"
                    class="flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    :class="activeTab === 'settings'
                        ? 'bg-panel-base text-action-blue shadow-sm border border-white/10'
                        : 'text-ink-muted hover:text-ink-soft'"
                >
                    ⚙️ Reglas
                </button>
            </div>
        </div>

        <!-- Main Content Grid -->
        <div class="flex-1 min-h-0 px-3 pt-2 pb-2 lg:pb-3 lg:px-4 overflow-hidden">
            <div class="h-full grid grid-cols-1 lg:grid-cols-12 gap-3">

                <!-- Left Panel: Player List -->
                <PlayerList
                    :class="{ 'hidden lg:flex': activeTab !== 'players' }"
                    :players="players"
                    :spectators="gameState.spectators"
                    :max-players="localConfig.maxPlayers"
                    :am-i-host="amIHost"
                    :my-user-id="myUserId"
                    @kick-player="handleKick"
                    @update-max-players="(max) => handleConfigChange('maxPlayers', max)"
                />

                <!-- Center + Right Panels: Settings -->
                <div class="lg:col-span-9 lg:grid lg:grid-cols-9 lg:gap-3 flex flex-col gap-4 min-h-0 overflow-y-auto lg:overflow-hidden"
                     :class="{ 'hidden lg:grid': activeTab !== 'settings' }"
                >
                    <!-- Center: Mode Selector + Categories -->
                    <div class="lg:col-span-5 flex flex-col gap-4 min-h-0"
                         :class="{ 'opacity-60 pointer-events-none': !amIHost }"
                    >
                        <!-- Game Mode Selector -->
                        <div class="bg-panel-base border-[3px] border-white/50 rounded-3xl shadow-game-panel p-4 flex-none">
                            <p class="text-ink-main text-[9px] font-black uppercase tracking-[0.2em] mb-3 text-center">Modo de Juego</p>
                            <div class="grid grid-cols-2 gap-3">
                                <button
                                    @click="handleConfigChange('mode', 'CLASSIC')"
                                    class="relative p-3 lg:p-5 rounded-2xl border-[3px] transition-all duration-300 text-center group min-h-[90px] lg:min-h-[110px] flex flex-col items-center justify-center"
                                    :class="localConfig.mode === 'CLASSIC'
                                        ? 'border-action-primary bg-action-primary/10 shadow-glow-primary'
                                        : 'border-white/10 bg-panel-card hover:border-action-primary hover:bg-panel-input shadow-sm hover:shadow-glow-primary/40'"
                                >
                                    <div class="text-3xl lg:text-4xl mb-1.5 group-hover:scale-110 transition-transform">🎯</div>
                                    <h4 class="text-ink-main font-black text-xs lg:text-sm tracking-wide">TUTI CLÁSICO</h4>
                                    <p class="text-ink-soft text-[8px] font-bold mt-1">Categorías · Letras · Velocidad</p>
                                    <div v-if="localConfig.mode === 'CLASSIC'" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-action-primary text-panel-base flex items-center justify-center text-[10px] font-black shadow-lg">✓</div>
                                </button>
                                <button
                                    @click="handleConfigChange('mode', 'IMPOSTOR')"
                                    class="relative p-3 lg:p-5 rounded-2xl border-[3px] transition-all duration-300 text-center group min-h-[90px] lg:min-h-[110px] flex flex-col items-center justify-center"
                                    :class="localConfig.mode === 'IMPOSTOR'
                                        ? 'border-action-blue bg-action-blue/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                        : 'border-white/10 bg-panel-card hover:border-action-primary hover:bg-panel-input shadow-sm hover:shadow-glow-primary/40'"
                                >
                                    <div class="text-3xl lg:text-4xl mb-1.5 group-hover:scale-110 transition-transform">🕵️</div>
                                    <h4 class="text-ink-main font-black text-xs lg:text-sm tracking-wide">IMPOSTOR</h4>
                                    <p class="text-ink-soft text-[8px] font-bold mt-1">¿Quién está mintiendo?</p>
                                    <div v-if="localConfig.mode === 'IMPOSTOR'" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-action-blue text-white flex items-center justify-center text-[10px] font-black shadow-lg">✓</div>
                                </button>
                            </div>
                        </div>

                        <!-- Category Selector (only for CLASSIC mode) -->
                        <CategorySelector
                            v-if="localConfig.mode === 'CLASSIC'"
                            :categories="localConfig.classic?.categories || []"
                            :am-i-host="amIHost"
                            @update-categories="handleUpdateCategories"
                            @remove-category="handleRemoveCategory"
                        />
                    </div>

                    <!-- Right: Settings Panel -->
                    <GameConfigPanel
                        :config="localConfig"
                        :am-i-host="amIHost"
                        @update-config="handleConfigChange"
                        @update-mutator="handleMutatorChange"
                    />
                </div>
            </div>
        </div>

        <!-- Sticky Footer: Start Button -->
        <div class="flex-none px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] md:pb-3 lg:px-4 lg:pt-0 lg:pb-4 bg-panel-base/90 lg:bg-transparent border-t-[3px] border-white/10 lg:border-0 shadow-none backdrop-blur-2xl lg:backdrop-blur-none">
            <div class="max-w-[1400px] mx-auto">
                <TButton v-if="amIHost"
                    variant="primary" size="md"
                    class="w-full text-base md:text-xl"
                    :disabled="!canStart"
                    @click="handleStart"
                >
                    <span class="text-lg md:text-2xl">⚡</span> EMPEZAR PARTIDA
                </TButton>
                <div v-else class="w-full py-3 md:py-5 text-center bg-panel-card rounded-2xl border-[3px] border-white/10 text-ink-main text-sm font-black uppercase shadow-sm flex flex-col items-center justify-center">
                    <span class="animate-pulse flex items-center gap-2">⏳ Esperando al anfitrión...</span>
                </div>
            </div>
        </div>

    </div>
</template>

<style scoped>
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.4); }
</style>
