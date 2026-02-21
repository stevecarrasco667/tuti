// =============================================
// ImpostorEngine — Impostor Game Mode (Stub)
// =============================================
// Sprint 2 will implement the full logic.
// For now, this is a placeholder that satisfies the BaseEngine contract.

import { RoomState, GameConfig, DeepPartial } from '../types.js';
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
        // Fase 1: Clon superficial (Shallow Copy) para evitar bomba de CPU
        const maskedState: RoomState = {
            ...this.state,
            impostorData: this.state.impostorData ? {
                ...this.state.impostorData,
                words: { ...this.state.impostorData.words },
                votes: { ...this.state.impostorData.votes }
            } : undefined
        };

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

            // Mask rival votes during VOTING phase. Showing "who" voted but hiding "for whom"
            if (maskedState.status === 'VOTING' && maskedState.impostorData.votes) {
                for (const key of Object.keys(maskedState.impostorData.votes)) {
                    if (key !== userId) {
                        maskedState.impostorData.votes[key] = '***';
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

    public updateConfig(connectionId: string, newConfig: DeepPartial<GameConfig>): RoomState {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) return this.state;
        const player = this.state.players.find(p => p.id === userId);
        if (player && player.isHost && this.state.status === 'LOBBY') {
            this.state.config = this.configManager.updateConfig(this.state.config, newConfig);
        }
        return this.state;
    }

    // --- GAME LIFECYCLE (Sprint 2) ---

    // Fase 2: Timer Interno de Sincronización Activa
    private currentTimer: ReturnType<typeof setTimeout> | null = null;

    private clearTimer() {
        if (this.currentTimer) {
            clearTimeout(this.currentTimer);
            this.currentTimer = null;
        }
    }

    public startGame(connectionId: string): RoomState {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) return this.state;

        const player = this.state.players.find(p => p.id === userId);
        if (!player) return this.state;
        if (!player.isHost) return this.state;

        if (this.state.status === 'LOBBY' || this.state.status === 'GAME_OVER') {
            if (this.state.spectators.length > 0) {
                this.state.players.push(...this.state.spectators);
                this.state.spectators = [];
            }

            // Reset scores for new game
            this.state.players.forEach(p => p.score = 0);
            this.state.roundsPlayed = 0;
            this.startNewRound();
        }

        return this.state;
    }

    /**
     * Initializes a new round: picks impostor, word, cleans words/votes, transitions to ROLE_REVEAL.
     * Called by startGame() and handleResultsTimeUp() for multi-round support.
     */
    private startNewRound() {
        const activePlayers = this.state.players.filter(p => p.isConnected);

        const secretCategory = 'Animales';
        const secretWord = 'Pingüino';
        const impostorIndex = Math.floor(Math.random() * activePlayers.length);
        const impostorId = activePlayers[impostorIndex].id;

        this.state.impostorData = {
            secretCategory,
            secretWord,
            impostorId,
            words: {},
            votes: {}
        };

        this.state.status = 'ROLE_REVEAL';
        this.state.timers.roundEndsAt = Date.now() + 10000;

        this.clearTimer();
        this.currentTimer = setTimeout(() => this.handleRoleRevealTimeUp(), 10000);
    }

    private handleRoleRevealTimeUp() {
        if (this.state.status !== 'ROLE_REVEAL') return;
        this.state.status = 'TYPING';
        const typingMs = this.state.config.impostor.typingTime * 1000;
        this.state.timers.roundEndsAt = Date.now() + typingMs;

        if (this.onGameStateChange) {
            this.onGameStateChange(this.state);
        }

        this.clearTimer();
        this.currentTimer = setTimeout(() => this.handleTypingTimeUp(), typingMs);
    }

    private handleTypingTimeUp() {
        if (this.state.status !== 'TYPING') return;
        this.state.status = 'VOTING';
        this.state.timers.roundEndsAt = null;
        const votingMs = this.state.config.impostor.votingTime * 1000;
        this.state.timers.votingEndsAt = Date.now() + votingMs;

        if (this.onGameStateChange) {
            this.onGameStateChange(this.state);
        }

        this.clearTimer();
        this.currentTimer = setTimeout(() => this.handleVotingTimeUp(), votingMs);
    }

    private handleVotingTimeUp() {
        if (this.state.status !== 'VOTING') return;

        this.calculateResults();

        this.state.status = 'RESULTS';
        this.state.timers.resultsEndsAt = Date.now() + 10000;

        if (this.onGameStateChange) {
            this.onGameStateChange(this.state);
        }

        this.clearTimer();
        this.currentTimer = setTimeout(() => this.handleResultsTimeUp(), 10000);
    }

    private handleResultsTimeUp() {
        if (this.state.status !== 'RESULTS') return;
        this.clearTimer();

        this.state.roundsPlayed++;
        this.state.timers = { roundEndsAt: null, votingEndsAt: null, resultsEndsAt: null };

        if (this.state.roundsPlayed < this.state.config.impostor.rounds) {
            // More rounds to play — start next round
            this.startNewRound();
        } else {
            // Game Over — DO NOT delete impostorData (Vue needs it for final screen)
            this.state.status = 'GAME_OVER';
            this.state.gameOverReason = 'NORMAL';
        }

        if (this.onGameStateChange) {
            this.onGameStateChange(this.state);
        }
    }

    private calculateResults() {
        if (!this.state.impostorData) return;

        const votes = this.state.impostorData.votes;
        const voteCounts: Record<string, number> = {};

        let maxVotes = 0;
        let mostVotedId: string | null = null;
        let isTie = false;

        // Count votes
        for (const voterId in votes) {
            const targetId = votes[voterId];
            voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;

            if (voteCounts[targetId] > maxVotes) {
                maxVotes = voteCounts[targetId];
                mostVotedId = targetId;
                isTie = false;
            } else if (voteCounts[targetId] === maxVotes) {
                isTie = true;
            }
        }

        const impostorId = this.state.impostorData.impostorId;

        let winner: 'IMPOSTOR' | 'CREW';
        if (isTie || mostVotedId !== impostorId) {
            // Impostor wins
            winner = 'IMPOSTOR';
            this.state.roundScores[impostorId] = (this.state.roundScores[impostorId] || 0) + 300;
            const p = this.state.players.find(p => p.id === impostorId);
            if (p) p.score += 300;
        } else {
            // Crew wins
            winner = 'CREW';
            for (const p of this.state.players) {
                if (p.id !== impostorId) {
                    this.state.roundScores[p.id] = (this.state.roundScores[p.id] || 0) + 100;
                    p.score += 100;
                }
            }
        }

        this.state.impostorData.result = {
            winner,
            mostVotedId: isTie ? null : mostVotedId
        };
    }

    public stopRound(_connectionId: string, _answers: Record<string, string>): RoomState {
        // En sprint 2, stopRound no hace nada si usamos transiciones por tiempo
        // O podría hacer short-circuit de TYPING a EXPOSITION si todos envían.
        return this.state;
    }

    public restartGame(_requestorId: string): RoomState {
        this.clearTimer();
        this.state.status = 'LOBBY';
        this.state.impostorData = undefined;
        this.state.timers = { roundEndsAt: null, votingEndsAt: null, resultsEndsAt: null };
        this.state.stoppedBy = null;
        return this.state;
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

    public toggleVote(connectionId: string, targetUserId: string, _category: string): RoomState {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) return this.state;

        if (this.state.status === 'VOTING' && this.state.impostorData) {
            this.state.impostorData.votes[userId] = targetUserId;
            // Immediate broadcast when someone votes
            if (this.onGameStateChange) {
                this.onGameStateChange(this.state);
            }
        }

        return this.state;
    }

    public confirmVotes(_connectionId: string): RoomState {
        return this.state;
    }

    public kickPlayer(_hostConnectionId: string, targetUserId: string): RoomState {
        this._players.remove(this.state, targetUserId); // It normally expects connectionId but for this scope we'll just filter state
        this.state.players = this.state.players.filter(p => p.id !== targetUserId);

        if (this.state.status !== 'LOBBY' && this.state.impostorData?.impostorId === targetUserId) {
            // Impostor left or kicked, abort game
            this.state.status = 'LOBBY';
            this.clearTimer();
            this.state.impostorData = undefined;
            this.state.timers = { roundEndsAt: null, votingEndsAt: null, resultsEndsAt: null };
        }
        return this.state;
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

        } else if (this.state.status === 'VOTING' && this.state.timers.votingEndsAt && now >= this.state.timers.votingEndsAt) {
            this.handleVotingTimeUp();
            changed = true;
        } else if (this.state.status === 'RESULTS' && this.state.timers.resultsEndsAt && now >= this.state.timers.resultsEndsAt) {
            this.handleResultsTimeUp();
            changed = true;
        }

        return changed;
    }
}
