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
     */
    public getClientState(userId: string): RoomState {
        // Creamos un clon profundo para no mutar la fuente de verdad del servidor
        const maskedState = JSON.parse(JSON.stringify(this.state)) as RoomState;

        if (maskedState.impostorData) {
            if (userId === maskedState.impostorData.impostorId) {
                // Tripulante Impostor: CENSURAR LA PALABRA SECRETA
                maskedState.impostorData.secretWord = '???';
            } else {
                // Tripulante Honesto: CENSURAR LA IDENTIDAD DEL IMPOSTOR
                maskedState.impostorData.impostorId = '???';
            }

            // VULNERABILITY FIX: Mask rival typed words during TYPING phase to prevent sniffer leakage
            if (maskedState.status === 'TYPING' && maskedState.impostorData.words) {
                for (const key of Object.keys(maskedState.impostorData.words)) {
                    if (key !== userId) {
                        maskedState.impostorData.words[key] = '***';
                    }
                }
            }
        }

        return maskedState;
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

    // --- GAME LIFECYCLE (Sprint 2) ---

    // Timers para simplificar cancelaciones (opcional para un swap directo si quisieran adelantarlo)
    private phaseTimer: ReturnType<typeof setTimeout> | null = null;

    public startGame(connectionId: string): RoomState {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) throw new Error("Connection not mapped to a player");

        const player = this.state.players.find(p => p.id === userId);
        if (!player) throw new Error("Player not found in state");
        if (!player.isHost) throw new Error("Only the host can start the game");

        if (this.state.status === 'LOBBY' || this.state.status === 'GAME_OVER') {
            if (this.state.spectators.length > 0) {
                this.state.players.push(...this.state.spectators);
                this.state.spectators = [];
            }

            this.state.roundsPlayed = 0;
            const activePlayers = this.state.players.filter(p => p.isConnected);

            // Hardcodeo rápido para testing si estamos solos, pero requiere 2+ idealmente
            // if (activePlayers.length < 2) throw new Error("Not enough players");

            const secretCategory = 'Animales';
            const secretWord = 'Pingüino';
            const impostorIndex = Math.floor(Math.random() * activePlayers.length);
            const impostorId = activePlayers[impostorIndex].id;

            this.state.impostorData = {
                secretCategory,
                secretWord,
                impostorId,
                words: {} // Aquí se guardarán las respuestas
            };

            this.state.status = 'ROLE_REVEAL';
            this.state.timers.roundEndsAt = Date.now() + 10000; // 10s de suspenso

            if (this.phaseTimer) clearTimeout(this.phaseTimer);
            this.phaseTimer = setTimeout(() => this.handleRoleRevealTimeUp(), 10000);
        }

        return this.state;
    }

    private handleRoleRevealTimeUp() {
        if (this.state.status !== 'ROLE_REVEAL') return;
        this.state.status = 'TYPING';
        this.state.timers.roundEndsAt = Date.now() + this.state.config.timeLimit * 1000;

        if (this.onGameStateChange) {
            this.onGameStateChange(this.state);
        }

        if (this.phaseTimer) clearTimeout(this.phaseTimer);
        this.phaseTimer = setTimeout(() => this.handleTypingTimeUp(), this.state.config.timeLimit * 1000);
    }

    private handleTypingTimeUp() {
        if (this.state.status !== 'TYPING') return;
        this.state.status = 'EXPOSITION';
        this.state.timers.resultsEndsAt = Date.now() + this.state.config.votingDuration * 1000; // Reusamos resultsEndsAt para la vista de exposición

        if (this.onGameStateChange) {
            this.onGameStateChange(this.state);
        }
    }

    public stopRound(_connectionId: string, _answers: Record<string, string>): RoomState {
        // En sprint 2, stopRound no hace nada si usamos transiciones por tiempo
        // O podría hacer short-circuit de TYPING a EXPOSITION si todos envían.
        return this.state;
    }

    public restartGame(_requestorId: string): RoomState {
        throw new Error("[ImpostorEngine] restartGame not implemented yet — Sprint 2");
    }

    public submitAnswers(connectionId: string, answers: Record<string, string>): RoomState {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) return this.state;

        if (this.state.status !== 'TYPING') return this.state;

        if (this.state.impostorData) {
            // En Impostor mode se escribe solo 1 palabra por jugador
            const values = Object.values(answers);
            if (values.length > 0) {
                this.state.impostorData.words[userId] = values[0];
            }
        }

        return this.state;
    }

    public updateAnswers(_connectionId: string, _answers: Record<string, string>): RoomState {
        // Live updates no son críticos por privacidad del impostor
        return this.state;
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

    public handleTimeUp(): boolean {
        const now = Date.now();
        let changed = false;

        if (this.state.status === 'ROLE_REVEAL' && this.state.timers.roundEndsAt && now >= this.state.timers.roundEndsAt) {
            this.handleRoleRevealTimeUp();
            changed = true;
        } else if (this.state.status === 'TYPING' && this.state.timers.roundEndsAt && now >= this.state.timers.roundEndsAt) {
            this.handleTypingTimeUp();
            changed = true;
        } else if (this.state.status === 'EXPOSITION' && this.state.timers.resultsEndsAt && now >= this.state.timers.resultsEndsAt) {
            // Future transition out of exposition (e.g. RESULTS/VOTING)
        }

        return changed;
    }
}
