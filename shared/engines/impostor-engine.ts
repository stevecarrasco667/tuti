// =============================================
// ImpostorEngine — Impostor Game Mode (Stub)
// =============================================
// Sprint 2 will implement the full logic.
// For now, this is a placeholder that satisfies the BaseEngine contract.

import { RoomState, GameConfig } from '../types.js';
import { BaseEngine } from './base-engine.js';
import { PlayerManager } from '../systems/player-manager.js';
import { ConfigurationManager } from '../systems/configuration-manager.js';

export class ImpostorEngine extends BaseEngine {
    private state: RoomState;
    private _players = new PlayerManager();
    private configManager = new ConfigurationManager();
    // Stored for Sprint 2 — will be used when game lifecycle methods are implemented
    protected onGameStateChange?: (state: RoomState) => void;

    constructor(roomId: string, onGameStateChange?: (state: RoomState) => void) {
        super();
        this.onGameStateChange = onGameStateChange;
        this.state = {
            status: 'LOBBY',
            roomId: roomId,
            players: [],
            spectators: [],
            roundsPlayed: 0,
            currentLetter: null,
            categories: [],
            answers: {},
            answerStatuses: {},
            votes: {},
            whoFinishedVoting: [],
            roundScores: {},
            config: this.configManager.getDefaultConfig(),
            timers: {
                roundEndsAt: null,
                votingEndsAt: null,
                resultsEndsAt: null
            },
            stoppedBy: null,
        };
    }

    public get players(): PlayerManager {
        return this._players;
    }

    public getState(): RoomState {
        return this.state;
    }

    /**
     * STATE MASKING — The core of Impostor mode.
     * In Sprint 2, this will:
     * - Hide the impostor's role from non-impostors
     * - Hide the secret word from the impostor
     * - Censor private information per-player
     * For now, returns full state (placeholder).
     */
    public getClientState(_userId: string): RoomState {
        // TODO: Sprint 2 — Implement role-based censorship
        // const maskedState = structuredClone(this.state);
        // maskedState.roles = maskedState.roles.map(r => r.userId === userId ? r : { ...r, role: 'HIDDEN' });
        return this.state;
    }

    public hydrate(newState: RoomState): void {
        this.state = newState;
        console.log("[ImpostorEngine] State hydrated from storage");
    }

    // --- CONNECTION MANAGEMENT (Minimal viable for lobby) ---

    public joinPlayer(userId: string, name: string, avatar: string, connectionId: string): RoomState {
        if (this._players.reconnect(this.state, connectionId, userId)) {
            return this.state;
        }
        this._players.add(this.state, connectionId, { id: userId, name, avatar });
        return this.state;
    }

    public playerDisconnected(connectionId: string): RoomState {
        this._players.remove(this.state, connectionId);
        return this.state;
    }

    public playerExited(connectionId: string): RoomState {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) return this.state;
        this.state.players = this.state.players.filter(p => p.id !== userId);
        this._players.remove(this.state, connectionId);
        return this.state;
    }

    public updateConfig(connectionId: string, newConfig: Partial<GameConfig>): RoomState {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) return this.state;
        const player = this.state.players.find(p => p.id === userId);
        if (player && player.isHost && this.state.status === 'LOBBY') {
            this.state.config = this.configManager.updateConfig(this.state.config, newConfig);
        }
        return this.state;
    }

    // --- GAME LIFECYCLE (Stubs — Sprint 2) ---

    public startGame(_connectionId: string): RoomState {
        throw new Error("[ImpostorEngine] startGame not implemented yet — Sprint 2");
    }

    public stopRound(_connectionId: string, _answers: Record<string, string>): RoomState {
        throw new Error("[ImpostorEngine] stopRound not implemented yet — Sprint 2");
    }

    public restartGame(_requestorId: string): RoomState {
        throw new Error("[ImpostorEngine] restartGame not implemented yet — Sprint 2");
    }

    public submitAnswers(_connectionId: string, _answers: Record<string, string>): RoomState {
        throw new Error("[ImpostorEngine] submitAnswers not implemented yet — Sprint 2");
    }

    public updateAnswers(_connectionId: string, _answers: Record<string, string>): RoomState {
        throw new Error("[ImpostorEngine] updateAnswers not implemented yet — Sprint 2");
    }

    public toggleVote(_connectionId: string, _targetUserId: string, _category: string): RoomState {
        throw new Error("[ImpostorEngine] toggleVote not implemented yet — Sprint 2");
    }

    public confirmVotes(_connectionId: string): RoomState {
        throw new Error("[ImpostorEngine] confirmVotes not implemented yet — Sprint 2");
    }

    public kickPlayer(_hostConnectionId: string, _targetUserId: string): RoomState {
        throw new Error("[ImpostorEngine] kickPlayer not implemented yet — Sprint 2");
    }

    public checkInactivePlayers(): boolean {
        return false; // No-op for now
    }
}
