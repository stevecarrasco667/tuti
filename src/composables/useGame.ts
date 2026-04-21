import { useGameState } from './useGameState';
import { useGameSync } from './useGameSync';
import { useGameActions } from './useGameActions';
import { useRouter } from 'vue-router';

/**
 * useGame Facade
 * 
 * Orquestador principal del estado y red del juego. 
 * Implementa un patrón "Composition Facade" para mantener la firma (API Pública)
 * idéntica a la que esperan las vistas Vue, mientras divide responsabilidades 
 * internas en State, Sync y Actions.
 */
export function useGame() {
    // 1. Instanciar la Malla de Estado Puro (Refs & Computed)
    const state = useGameState();

    const router = useRouter();

    // Callback that avoids duplicate navigation
    const safeNavigate = (path: string) => {
        if (router.currentRoute.value.fullPath !== path) {
            router.push(path);
        }
    };

    // 2. Conectar la capa de Sincronización inyectando el Estado (Inbound/Hydration)
    // Extraemos isConnected y tryRestoreSession como parte de la API pública expuesta
    const { isConnected, connectToParty } = useGameSync(state, safeNavigate);

    // 3. Conectar las emisiones (Outbound) e inyectar validaciones de Estado y Socket
    const actions = useGameActions(state, safeNavigate);

    // 4. Devolver el gran Objeto Fusionado
    // Nota: El uso de desestructuración plana asume que las vistas Vue usan ref().value directamente, 
    // pero como devolvemos las mismas variables de useGameState, 
    // reactividad nativa de Vue3 (Proxy) preserva los binding en el DOM.
    return {
        // --- ESTADO Y PROPIEDADES REACTIVAS ---
        gameState: state.gameState,
        localImpostorRole: state.localImpostorRole,
        isStopping: state.isStopping,
        isUpdateAvailable: state.isUpdateAvailable,
        myUserId: state.myUserId,
        myUserName: state.myUserName,
        myUserAvatar: state.myUserAvatar,

        // --- HELPERS COMPUTADOS ---
        amIHost: state.amIHost,
        isGameOver: state.isGameOver,
        isLobbyPhase: state.isLobbyPhase,
        isGamePhase: state.isGamePhase,
        isResultsPhase: state.isResultsPhase,

        // --- ESTADO DE RED ---
        isConnected,
        tryRestoreSession: connectToParty,

        // --- ACCIONES (Mutadores y WebSockets Outbound) ---
        joinGame: actions.joinGame,
        startGame: actions.startGame,
        submitAnswers: actions.submitAnswers,
        stopRound: actions.stopRound,
        updateAnswers: actions.updateAnswers,
        debouncedUpdateAnswers: actions.debouncedUpdateAnswers,
        shouldSubmit: actions.shouldSubmit,
        toggleVote: actions.toggleVote,
        confirmVotes: actions.confirmVotes,
        updateConfig: actions.updateConfig,
        resetGame: actions.resetGame,
        kickPlayer: actions.kickPlayer,
        leaveGame: actions.leaveGame,
        sendChatMessage: actions.sendChatMessage,
        sendReaction: actions.sendReaction,
        updateImpostorDraft: actions.updateImpostorDraft,
        debouncedUpdateImpostorDraft: actions.debouncedUpdateImpostorDraft,
        confirmImpostorWord: actions.confirmImpostorWord
    };
}
