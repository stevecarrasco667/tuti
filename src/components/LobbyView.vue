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
import PlayerList from './lobby/PlayerList.vue';
import LobbySettingsPanel from './lobby/LobbySettingsPanel.vue';
import GameTutorialModal from './tutorials/GameTutorialModal.vue';
import AdBanner from './ui/AdBanner.vue';

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
    <div class="h-full w-full flex flex-col items-center justify-center lg:justify-start relative overflow-hidden bg-panel-base">
        <!-- 🌌 Neon Aura Nebula background layer -->
        <div class="lobby-bg-nebula">
            <div class="aura-circle aura-1"></div>
            <div class="aura-circle aura-2"></div>
            <div class="aura-circle aura-3"></div>
            <div class="lobby-stardust"></div>
        </div>

        <!-- Rascacielos izquierdo absoluto flotando en el espacio exterior (Escritorio) -->
        <aside class="hidden xl:block w-40 select-none z-10 absolute left-8 xl:left-16 top-10">
            <AdBanner position="desktop-left" />
        </aside>

        <!-- Inner Grid Container (Narrower for better density, shifted to the right to leave space for a future left banner) -->
        <div class="h-full w-full lg:max-w-[1040px] lg:max-h-[660px] lg:mt-10 lg:mb-auto mx-auto lg:ml-auto lg:mr-8 xl:mr-16 flex flex-col overflow-hidden relative z-10">

        <!-- Floating Canvas Controls: Volver, TUTI GAMES Logo -->
        <div class="flex-none w-full px-4 py-2 flex items-center justify-between gap-4 select-none">
            <!-- Left: Back button (◀ VOLVER) -->
            <button
                @click="handleLeave"
                class="flex items-center gap-1.5 px-4 py-2 bg-panel-card/70 hover:bg-panel-input border-2 border-white/10 hover:border-white/20 rounded-xl text-ink-soft hover:text-ink-main font-heading font-black text-xs md:text-sm uppercase tracking-wider transition-all duration-75 active:scale-95 cursor-pointer shadow-md select-none"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                <span>{{ t('lobby.header.back', 'Volver') }}</span>
            </button>

            <!-- Center: Stylized TUTI GAMES Title + Room Code Badge -->
            <div class="flex flex-col items-center text-center">
                <h1 class="animate-float text-3xl sm:text-4xl lg:text-[2.75rem] font-display text-center mb-1.5 tracking-wider uppercase leading-none">
                    <span class="text-transparent bg-clip-text bg-gradient-to-br from-game-yellow via-game-red to-action-info drop-shadow-md">TUTI GAMES</span>
                </h1>
                <div class="flex items-center gap-1.5 bg-panel-card/80 border-[2px] border-white/10 text-action-info px-3 py-0.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest shadow-inner select-all font-mono">
                    <span class="text-ink-muted opacity-80 text-[8px] md:text-[10px]">SALA:</span>
                    <span class="tracking-[0.1em] text-action-info text-[9px] md:text-[11px]">{{ gameState.roomId ?? '' }}</span>
                </div>
            </div>

            <!-- Right: Spacer to balance the Volver button and keep title perfectly centered -->
            <div class="w-[94px] sm:w-[108px] flex-none"></div>
        </div>

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
                    :is-public="localConfig.isPublic"
                    @kick-player="handleKick"
                    @update-max-players="(max) => handleConfigChange('maxPlayers', max)"
                    @add-bot="addBot"
                    @toggle-privacy="handleTogglePrivacy"
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
                    @open-tutorial="(mode) => tutorialMode = mode"
                />
            </div>
        </div>

        <!-- Sticky Footer: Centered Gartic-Style Invite & Start Pill Bar -->
        <div class="flex-none px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] lg:pb-5 bg-panel-base/90 lg:bg-transparent lg:border-0 shadow-none backdrop-blur-2xl lg:backdrop-blur-none relative z-20">
            <div class="w-full max-w-xl mx-auto flex items-center justify-center gap-3 p-1.5 rounded-2xl bg-panel-card/45 lg:backdrop-blur-xl border-2 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
                <!-- Invite Button (Visible for all, host and guest) -->
                <button
                    @click="copyRoomLink"
                    class="flex-1 py-3 px-5 rounded-xl text-ink-main font-heading font-black text-xs md:text-sm uppercase tracking-wider transition-all duration-75 active:scale-95 hover:brightness-110 active:translate-y-[2px] cursor-pointer flex items-center justify-center gap-2 border-2 border-white/10"
                    :class="copied 
                        ? 'bg-action-success/20 border-action-success text-action-success shadow-[0_0_12px_rgba(52,211,153,0.2)]'
                        : 'bg-action-secondary hover:bg-action-secondary-hover shadow-[0_4px_0_0_#2e2978] active:shadow-none'"
                >
                    <span class="text-base">{{ copied ? '✓' : '🔗' }}</span>
                    <span>{{ copied ? t('lobby.header.copy') : t('lobby.header.invite') }}</span>
                </button>

                <!-- Start Action (Host) / Waiting Status (Guest) -->
                <template v-if="amIHost">
                    <TButton
                        :variant="players.length >= 2 ? 'primary' : 'secondary'"
                        size="md"
                        class="flex-1 text-xs md:text-sm uppercase tracking-wider transition-all duration-75 h-[48px] border-2 border-white/5"
                        :disabled="!canStart"
                        @click="handleStart"
                    >
                        <span v-if="players.length >= 2" class="text-base">⚡</span>
                        {{ players.length >= 2 ? t('lobby.actions.start') : t('lobby.actions.waitingPlayers', { current: players.length, max: 2 }) }}
                    </TButton>
                </template>
                <template v-else>
                    <div class="flex-1 h-[48px] px-5 flex items-center justify-center gap-2 bg-panel-input border-2 border-white/5 text-ink-muted text-xs font-black uppercase tracking-wider rounded-xl shadow-inner select-none">
                        <span class="animate-pulse flex items-center gap-1.5">⏳ {{ t('lobby.actions.waitingHost') }}</span>
                    </div>
                </template>
            </div>
        </div>

        <!-- Banner móvil inline para la Web (visible solo en pantallas pequeñas) -->
        <div class="lg:hidden flex-none w-full max-w-[340px] mx-auto mt-4 px-3 pb-4">
            <AdBanner position="mobile-inline" />
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
