import { ref, computed, watch } from 'vue';
import { RoomState, PrivateRolePayload, createDefaultRoomState } from '../../shared/types';
import { generateRandomName } from '../utils/random';

// Global state to persist across component mounts if needed
export const localImpostorRole = ref<PrivateRolePayload | null>(null);

export const gameState = ref<RoomState>(createDefaultRoomState(null));

// UI states
export const isStopping = ref(false);
export const isUpdateAvailable = ref(false);

// Storage Constants
export const STORAGE_KEY_USER_ID = 'tuti-user-id';
export const STORAGE_KEY_USER_NAME = 'tuti-user-name';
export const STORAGE_KEY_USER_AVATAR = 'tuti-user-avatar';
export const STORAGE_KEY_SESSION_TOKEN = 'tuti-session-token';

export function useGameState() {
    // 1. User ID Persistence
    const getStoredUserId = () => {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(STORAGE_KEY_USER_ID);
        }
        return null; // Fallback for SSR/Test without DOM
    };

    const generateSafeId = (): string => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback para HTTP (red local / móviles sin contexto seguro)
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    };

    const myUserId = ref<string>(getStoredUserId() || generateSafeId());

    // Watcher for ID to support server re-assignment
    watch(myUserId, (newId) => {
        if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY_USER_ID, newId);
    }, { immediate: true });

    // 2. User Name Persistence
    // [Sprint 4 — Cold Start] Si el localStorage está vacío (usuario nunca visitó HomeView),
    // generamos un nombre aleatorio aquí en la capa de estado, no en el componente.
    // Así el Navigation Guard del router tendrá un nombre válido para enviar al servidor.
    const getStoredUserName = () => typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_USER_NAME) : '';
    const myUserName = ref<string>(getStoredUserName() || generateRandomName());

    watch(myUserName, (newName) => {
        if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY_USER_NAME, newName);
    }, { immediate: true });

    // 3. User Avatar Persistence
    const AVATARS = ['🦁', '🐯', '🐼', '🐸', '🐙', '🤖', '👽', '👻', '🤡', '💀', '🤠', '🎃'];
    const getStoredAvatar = () => typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_USER_AVATAR) : null;
    const myUserAvatar = ref<string>(getStoredAvatar() || AVATARS[Math.floor(Math.random() * AVATARS.length)]);

    watch(myUserAvatar, (newAvatar) => {
        if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY_USER_AVATAR, newAvatar);
    }, { immediate: true });

    // Computed: Global properties
    const amIHost = computed(() => {
        const me = gameState.value.players.find(p => p.id === myUserId.value);
        return me?.isHost || false;
    });

    const isGameOver = computed(() => gameState.value.status === 'GAME_OVER');

    // UI Helpers (derived from server's uiMetadata instead of raw status)
    const isLobbyPhase = computed(() => gameState.value.uiMetadata.activeView === 'LOBBY');
    const isGamePhase = computed(() => gameState.value.uiMetadata.activeView === 'GAME');
    const isResultsPhase = computed(() => ['RESULTS', 'REVIEW'].includes(gameState.value.status));

    // For specific UI states without mutating
    const setStopping = (val: boolean) => isStopping.value = val;

    return {
        // Direct References
        gameState,
        localImpostorRole,
        isStopping,
        isUpdateAvailable,
        myUserId,
        myUserName,
        myUserAvatar,

        // Computed Helpers
        amIHost,
        isGameOver,
        isLobbyPhase,
        isGamePhase,
        isResultsPhase,

        // Mutators / Actions on local state ONLY
        setStopping
    };
}
