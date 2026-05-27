<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useGame } from '../composables/useGame';
import { useSound } from '../composables/useSound';
import { useMeta } from '../composables/useMeta';
import { useAnalytics } from '../composables/useAnalytics';
import type { CategoryRef } from '../../shared/types';
import TButton from './ui/TButton.vue';
import LobbyHeader from './lobby/LobbyHeader.vue';
import PlayerList from './lobby/PlayerList.vue';
import LobbySettingsPanel from './lobby/LobbySettingsPanel.vue';
import GameTutorialModal from './tutorials/GameTutorialModal.vue';

const { gameState, startGame, updateConfig, myUserId, amIHost, kickPlayer, leaveGame, addBot } = useGame();
const { playClick, playJoin, playAlarm, playSuccess } = useSound();
const { t } = useI18n();
const route = useRoute();
const { setMeta } = useMeta();
const { trackLobbyEntered, trackShareInitiated, identify } = useAnalytics();

// [Sprint 3 - P2] Pre-fetch inteligente de los motores de juego.
// Se inician silenciosamente mientras el usuario espera en el Lobby, para que cuando el
// servidor envíe START_GAME, el JS ya esté descargado y no haya race condition en redes lentas.
onMounted(() => {
    import('./game/tuti/TutiBoard.vue');
    import('./game/impostor/ImpostorBoard.vue');

    // Actualizar metadatos dinamicamente para el link de invitación
    const roomId = (route.params.roomId as string || '').toUpperCase();
    if (roomId) {
        setMeta({
            title: `🎮 ¡Te invitan a jugar Tutti Frutti! — Sala ${roomId} | TutiGame`,
            description: `Únete a la sala ${roomId}. Haz clic para entrar directamente — gratis, sin registro, en tu navegador.`,
            url: `https://tutigame.pages.dev/lobby/${roomId}`,
        });
    }
    // [PostHog] Identifica al usuario y registra que entró al Lobby
    if (myUserId.value) {
        identify(myUserId.value, gameState.value.players.find(p => p.id === myUserId.value)?.name || 'unknown');
    }
    trackLobbyEntered({
        player_count: gameState.value.players.length,
        mode: gameState.value.config.mode as 'CLASSIC' | 'IMPOSTOR',
        room_id: roomId,
    });
});

// ── Smart State (Orquestador) ─────────────────────────────────────────────────
const localConfig = computed(() => gameState.value.config);
const players = computed(() => gameState.value.players);
const copied = ref(false);
const activeTab = ref<'players' | 'settings'>('players');

// Tutorial State
const tutorialMode = ref<'CLASSIC' | 'IMPOSTOR' | null>(null);
const showTutorial = computed({
    get: () => tutorialMode.value !== null,
    set: (v) => { if (!v) tutorialMode.value = null; }
});

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
    if (confirm(t('lobby.confirm.kick', { name }))) kickPlayer(targetUserId);
};

const handleUpdateCategories = (categories: CategoryRef[]) => {
    if (localConfig.value.mode === 'CLASSIC') {
        handleConfigChange('classic.categories', categories);
    } else if (localConfig.value.mode === 'IMPOSTOR') {
        handleConfigChange('impostor.categories', categories);
    }
};

const handleRemoveCategory = (catName: string) => {
    if (localConfig.value.mode === 'CLASSIC') {
        const current = localConfig.value.classic?.categories || [];
        handleConfigChange('classic.categories', current.filter((c: CategoryRef) => c.name !== catName));
    } else if (localConfig.value.mode === 'IMPOSTOR') {
        const current = localConfig.value.impostor?.categories || [];
        handleConfigChange('impostor.categories', current.filter((c: CategoryRef) => c.name !== catName));
    }
};

const currentCategories = computed(() => {
    if (localConfig.value.mode === 'CLASSIC') {
        return localConfig.value.classic?.categories || [];
    } else if (localConfig.value.mode === 'IMPOSTOR') {
        return localConfig.value.impostor?.categories || [];
    }
    return [];
});

const handleTogglePrivacy = () => {
    handleConfigChange('isPublic', !localConfig.value.isPublic);
};

const copyRoomLink = async () => {
    const code = gameState.value.roomId || '';
    const link = `${window.location.origin}/?room=${code}`;
    const shareData = {
        title: t('lobby.share.title'),
        text: t('lobby.share.text'),
        url: link
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
            // [PostHog] Share nativo exitoso (WhatsApp, Telegram, etc.)
            trackShareInitiated({ method: 'native', screen: 'lobby' });
            return;
        } catch (e) {
            console.log("Share cancelado o fallido, usando portapapeles.");
        }
    }

    navigator.clipboard.writeText(link).then(() => {
        copied.value = true;
        playSuccess();
        setTimeout(() => copied.value = false, 2000);
    });
};

const canStart = computed(() => amIHost.value && players.value.length >= 2);
const handleStart = () => {
    if (!canStart.value) return;
    playAlarm();
    startGame();
};

const handleLeave = () => {
    leaveGame();
};
</script>

<template>
    <!-- Full-screen dynamic galactic lobby background wrapper -->
    <div class="h-full w-full flex flex-col items-center justify-center relative overflow-hidden bg-panel-base">
        <!-- 🌌 Neon Aura Nebula background layer -->
        <div class="lobby-bg-nebula">
            <div class="aura-circle aura-1"></div>
            <div class="aura-circle aura-2"></div>
            <div class="aura-circle aura-3"></div>
            <div class="lobby-stardust"></div>
        </div>

        <!-- Inner Grid Container (No longer enclosed in a big box frame on PC, but still centered and aligned) -->
        <div class="h-full w-full lg:max-w-[1240px] lg:max-h-[760px] lg:my-auto mx-auto flex flex-col overflow-hidden relative z-10">

        <!-- Header: Room Code + Pub/Priv + Copy -->
        <LobbyHeader
            :room-id="gameState.roomId ?? ''"
            :is-public="localConfig.isPublic"
            :am-i-host="amIHost"
            :copied="copied"
            @toggle-privacy="handleTogglePrivacy"
            @copy-link="copyRoomLink"
            @leave="handleLeave"
        />

        <!-- Tab Bar (Mobile only) -->
        <div class="flex-none px-3 lg:hidden">
            <div class="flex bg-panel-input rounded-xl border-2 border-panel-card p-1 gap-1 shadow-inner">
                <button
                    @click="activeTab = 'players'"
                    class="flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    :class="activeTab === 'players'
                        ? 'bg-panel-base text-action-info shadow-sm border border-white/10'
                        : 'text-ink-muted hover:text-ink-soft'"
                >
                    👥 {{ t('lobby.tabs.players') }}
                    <span class="text-[9px] font-bold text-ink-soft opacity-80">{{ players.length }}/{{ localConfig.maxPlayers }}</span>
                </button>
                <button
                    @click="activeTab = 'settings'"
                    class="flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    :class="activeTab === 'settings'
                        ? 'bg-panel-base text-action-info shadow-sm border border-white/10'
                        : 'text-ink-muted hover:text-ink-soft'"
                >
                    ⚙️ {{ t('lobby.tabs.settings') }}
                </button>
            </div>
        </div>

        <!-- Main Content Grid -->
        <div class="flex-1 min-h-0 px-3 pt-2 pb-2 lg:pb-3 lg:px-4 overflow-y-auto lg:overflow-hidden lg:flex lg:flex-col">
            <!-- min-h-full en mobile permite que el grid crezca libremente (scroll real).
                 h-full en desktop mantiene el layout de 2 columnas a altura fija. -->
            <div class="min-h-full lg:h-full grid grid-cols-1 lg:grid-cols-12 gap-2.5">

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
                    @add-bot="addBot"
                />

                <!-- Unified Settings Console: LobbySettingsPanel -->
                <LobbySettingsPanel
                    :class="{ 'hidden lg:flex': activeTab !== 'settings' }"
                    :config="localConfig"
                    :categories="currentCategories"
                    :am-i-host="amIHost"
                    @update-config="handleConfigChange"
                    @update-mutator="handleMutatorChange"
                    @update-categories="handleUpdateCategories"
                    @remove-category="handleRemoveCategory"
                />
            </div>
        </div>

        <!-- Sticky Footer: Start Button -->
        <div class="flex-none px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] md:pb-3 lg:px-4 lg:pt-1 lg:pb-3 bg-panel-base/90 lg:bg-transparent border-t-[3px] border-white/10 lg:border-0 shadow-none backdrop-blur-2xl lg:backdrop-blur-none">
            <div class="max-w-[1400px] lg:max-w-md mx-auto lg:p-1.5 lg:rounded-2xl lg:bg-panel-card/45 lg:backdrop-blur-xl lg:border-2 lg:border-white/10 lg:shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
                <TButton v-if="amIHost"
                    :variant="players.length >= 2 ? 'primary' : 'secondary'" size="md"
                    class="w-full text-base md:text-xl transition-all"
                    :disabled="!canStart"
                    @click="handleStart"
                >
                    <span v-if="players.length >= 2" class="text-lg md:text-2xl">⚡</span> 
                    {{ players.length >= 2 ? t('lobby.actions.start') : t('lobby.actions.waitingPlayers', { current: players.length, max: 2 }) }}
                </TButton>
                <div v-else class="w-full py-2.5 md:py-3.5 text-center bg-panel-card rounded-2xl border-[3px] border-white/10 text-ink-main text-sm font-black uppercase shadow-sm flex flex-col items-center justify-center">
                    <span class="animate-pulse flex items-center gap-2">⏳ {{ t('lobby.actions.waitingHost') }}</span>
                </div>
            </div>
        </div>

        <!-- Tutorial Modal -->
        <GameTutorialModal 
            v-model="showTutorial" 
            :mode="tutorialMode" 
        />
        </div>
    </div>
</template>

<style scoped>
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.4); }
</style>
