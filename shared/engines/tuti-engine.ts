// =============================================
// TutiEngine — Classic Tuti Frutti Game Mode
// =============================================
// Migrated from shared/game-engine.ts → GameEngine
// Implements BaseEngine contract.

import { RoomState, GameConfig, AnswerStatus, DeepPartial } from '../types.js';
import { RoundAnswersSchema } from '../schemas.js';
import { BaseEngine } from './base-engine.js';
import { MASTER_CATEGORIES } from './categories.js';

import { ScoreSystem } from '../systems/score-system.js';
import { RoundManager } from '../systems/round-manager.js';
import { PlayerManager } from '../systems/player-manager.js';
import { ValidationManager } from '../systems/validation-manager.js';
import { ConfigurationManager } from '../systems/configuration-manager.js';
import { VotingManager } from '../systems/voting-manager.js';

export class TutiEngine extends BaseEngine {
    private state: RoomState;
    public scoreSystem = new ScoreSystem();
    public rounds = new RoundManager();
    private _players = new PlayerManager();
    public validation = new ValidationManager();
    private configManager = new ConfigurationManager();
    private voting = new VotingManager(this.validation);

    constructor(roomId: string, private onGameStateChange?: (state: RoomState) => void) {
        super();
        this.state = {
            stateVersion: 0,
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

            // Default Config
            config: this.configManager.getDefaultConfig(),

            timers: {
                roundEndsAt: null,
                votingEndsAt: null,
                resultsEndsAt: null
            },
            stoppedBy: null,
            uiMetadata: {
                activeView: 'LOBBY',
                showTimer: false,
                targetTime: null
            }
        };
    }

    // --- SUB-SYSTEMS ---
    public get players(): PlayerManager {
        return this._players;
    }

    // --- STATE ACCESS ---
    public getState(): RoomState {
        return this.state;
    }

    /** In Tuti Classic there are no secrets — everyone sees the same state. */
    public getClientState(_userId: string): RoomState {
        return this.state;
    }

    public hydrate(newState: RoomState): void {
        this.state = newState;
        console.log("[TutiEngine] State hydrated from storage");
    }

    // --- CONNECTION MANAGEMENT ---

    public joinPlayer(userId: string, name: string, avatar: string, connectionId: string): RoomState {
        // Try Reconnect First (check both players AND spectators)
        if (this._players.reconnect(this.state, connectionId, userId)) {
            return this.state;
        }

        // [Phoenix] Dynamic Capacity Bouncer
        const isFull = this.state.players.length >= this.state.config.maxPlayers;
        const canJoinAsPlayer = (this.state.status === 'LOBBY' || this.state.status === 'GAME_OVER') && !isFull;

        if (canJoinAsPlayer) {
            this._players.add(this.state, connectionId, { id: userId, name, avatar });
        } else {
            // Room full or game active → Spectator (with idempotency guard)
            const existingSpec = this.state.spectators.find(s => s.id === userId);
            if (existingSpec) {
                existingSpec.isConnected = true;
                existingSpec.lastSeenAt = Date.now();
                existingSpec.name = name;
                existingSpec.avatar = avatar;
                delete existingSpec.disconnectedAt;
            } else {
                const newPlayer = {
                    id: userId,
                    name,
                    avatar,
                    score: 0,
                    isHost: false,
                    isConnected: true,
                    lastSeenAt: Date.now(),
                    filledCount: 0
                };
                this.state.spectators.push(newPlayer);
            }
            this._players.registerConnection(connectionId, userId);
            console.log(`[Spectator] ${name} (${userId}) joined as spectator. Room ${isFull ? 'full' : 'in-game'}.`);
        }

        return this.state;
    }

    public playerDisconnected(connectionId: string): RoomState {
        // Check if the disconnecting player is a spectator
        const userId = this._players.getPlayerId(connectionId);
        if (userId) {
            const spectatorIdx = this.state.spectators.findIndex(s => s.id === userId);
            if (spectatorIdx !== -1) {
                this.state.spectators[spectatorIdx].isConnected = false;
                this.state.spectators[spectatorIdx].disconnectedAt = Date.now();
                this._players.remove(this.state, connectionId);
                return this.state;
            }
        }

        this._players.remove(this.state, connectionId);

        // ABANDONMENT CHECK (RELAXED)
        if (this.state.status === 'PLAYING' || this.state.status === 'REVIEW') {
            if (this.state.players.length < 2) {
                console.log(`[GAME OVER] Not enough players (Active+Zombie) to continue.`);
                this.state.status = 'GAME_OVER';
                this.state.gameOverReason = 'ABANDONED';
                this.state.uiMetadata = { activeView: 'GAME_OVER', showTimer: false, targetTime: null };

                this.rounds.cancelTimer();
                this.state.timers.roundEndsAt = null;
                this.state.timers.votingEndsAt = null;
                this.state.timers.resultsEndsAt = null;
            }
        }

        return this.state;
    }

    public playerExited(connectionId: string): RoomState {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) return this.state;

        console.log(`[EXIT GAME] Hard destroying player ${userId}`);

        this.state.players = this.state.players.filter(p => p.id !== userId);
        this.state.spectators = this.state.spectators.filter(s => s.id !== userId);

        this._players.remove(this.state, connectionId);

        delete this.state.answers[userId];
        delete this.state.roundScores[userId];
        this.voting.cleanupPlayerVotes(this.state, userId);

        if (this.state.status === 'PLAYING' || this.state.status === 'REVIEW') {
            if (this.state.players.length < 2) {
                console.log(`[GAME OVER] Abandonment (Exited).`);
                this.state.status = 'GAME_OVER';
                this.state.gameOverReason = 'ABANDONED';
                this.state.uiMetadata = { activeView: 'GAME_OVER', showTimer: false, targetTime: null };

                this.rounds.cancelTimer();
                this.state.timers.roundEndsAt = null;
                this.state.timers.votingEndsAt = null;
                this.state.timers.resultsEndsAt = null;
            }
        }

        return this.state;
    }

    public checkInactivePlayers(): boolean {
        const changed = this._players.removeInactive(this.state, 60000);

        let stateChanged = changed;

        if ((this.state.status === 'PLAYING' || this.state.status === 'REVIEW') && this.state.players.length < 2) {
            console.log(`[GAME OVER] Abandonment after Zombie Purge.`);
            this.state.status = 'GAME_OVER';
            this.state.gameOverReason = 'ABANDONED';
            this.state.uiMetadata = { activeView: 'GAME_OVER', showTimer: false, targetTime: null };

            this.rounds.cancelTimer();

            this.state.timers.roundEndsAt = null;
            this.state.timers.votingEndsAt = null;
            this.state.timers.resultsEndsAt = null;

            stateChanged = true;
        }

        if (stateChanged) {
            if (this.onGameStateChange) {
                this.onGameStateChange(this.state);
            }
        }
        return stateChanged;
    }

    // --- CONFIGURATION ---

    public updateConfig(connectionId: string, newConfig: DeepPartial<GameConfig>): RoomState {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) return this.state;

        const player = this.state.players.find(p => p.id === userId);

        if (player && player.isHost && this.state.status === 'LOBBY') {
            this.state.config = this.configManager.updateConfig(this.state.config, newConfig);
        }
        return this.state;
    }

    // --- GAME LIFECYCLE ---

    public startGame(connectionId: string): RoomState {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) throw new Error("Connection not mapped to a player");

        const player = this.state.players.find(p => p.id === userId);
        if (!player) throw new Error("Player not found in state");
        if (!player.isHost) throw new Error("Only the host can start the game");

        // CASE 1: Manual "Next Round" from Results screen
        if (this.state.status === 'RESULTS') {
            if (this.state.spectators.length > 0) {
                console.log(`[Spectator] Promoting ${this.state.spectators.length} spectators to players.`);
                this.state.players.push(...this.state.spectators);
                this.state.spectators = [];
            }

            const continueGame = this.rounds.nextRound(this.state, this.state.config);
            if (continueGame) {
                this.rounds.startRound(this.state, this.state.config, () => this.handleTimeUp_Internal());
                this.state.uiMetadata = { activeView: 'GAME', showTimer: true, targetTime: this.state.timers.roundEndsAt };
            } else {
                this.state.uiMetadata = { activeView: 'GAME_OVER', showTimer: false, targetTime: null };
            }
            return this.state;
        }

        // CASE 2: Starting new game from Lobby/GameOver
        if (this.state.status === 'LOBBY' || this.state.status === 'GAME_OVER') {
            if (this.state.spectators.length > 0) {
                console.log(`[Spectator] Promoting ${this.state.spectators.length} spectators to players.`);
                this.state.players.push(...this.state.spectators);
                this.state.spectators = [];
            }

            this.state.roundsPlayed = 0;

            // Select categories: use configured list if >= 3, else pick 5 random
            if (this.state.config.classic.categories.length >= 3) {
                this.state.categories = [...this.state.config.classic.categories];
            } else {
                const shuffled = [...MASTER_CATEGORIES].sort(() => 0.5 - Math.random());
                this.state.categories = shuffled.slice(0, 5).map(c => c.name);
            }

            this.rounds.startRound(this.state, this.state.config, () => this.handleTimeUp_Internal());
            this.state.uiMetadata = { activeView: 'GAME', showTimer: true, targetTime: this.state.timers.roundEndsAt };
        }

        return this.state;
    }

    private handleTimeUp_Internal() {
        console.log("[TutiEngine] auto-stop triggered by timer.");
        this.rounds.stopRound(this.state, this.state.config);

        if (this.onGameStateChange) {
            this.onGameStateChange(this.state);
        }
    }

    public stopRound(connectionId: string, answers: Record<string, string>): RoomState {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) throw new Error("Connection not mapped to a player");

        const player = this.state.players.find(p => p.id === userId);

        if (!player) throw new Error("Player not found in state");
        if (this.state.status !== 'PLAYING') throw new Error("Game is not in PLAYING state");

        const validated = this.validateAndSanitizeAnswers(answers);
        if (!validated) return this.state;

        this.state.answers[userId] = validated.answers;
        if (!this.state.answerStatuses[userId]) this.state.answerStatuses[userId] = {};
        Object.assign(this.state.answerStatuses[userId], validated.statuses);
        this.state.stoppedBy = userId || 'SYSTEM';

        this.rounds.stopRound(this.state, this.state.config);

        // --- 1vs1 GHOST VOTING ---
        const activePlayers = this.state.players.filter(p => p.isConnected);
        if (activePlayers.length === 2) {
            console.log("[1vs1] Injecting Ghost Votes for Automated Judgment");
            this.injectAutomatedVotes();
        }

        return this.state;
    }

    public restartGame(requestorId: string): RoomState {
        const userId = this._players.getPlayerId(requestorId);
        const player = this.state.players.find(p => p.id === userId);

        if (!player || !player.isHost) {
            console.warn(`[SECURITY] Restart denied. Requestor ${requestorId} is not host.`);
            return this.state;
        }

        this.state.status = 'LOBBY';
        this.state.uiMetadata = { activeView: 'LOBBY', showTimer: false, targetTime: null };
        this.state.roundsPlayed = 0;
        this.state.currentLetter = null;
        this.state.categories = [];
        this.state.answers = {};
        this.state.answerStatuses = {};
        this.state.votes = {};
        this.state.whoFinishedVoting = [];
        this.state.roundScores = {};

        this.state.players.forEach(p => {
            p.score = 0;
        });

        this.state.timers.roundEndsAt = null;
        this.state.timers.votingEndsAt = null;
        this.state.timers.resultsEndsAt = null;
        this.state.stoppedBy = null;

        return this.state;
    }

    // --- GAMEPLAY ACTIONS ---

    public submitAnswers(connectionId: string, answers: Record<string, string>): RoomState {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) throw new Error("Connection not mapped to a player");

        const player = this.state.players.find(p => p.id === userId);
        if (!player) throw new Error("Player not found in state");

        if (this.state.status !== 'PLAYING' && this.state.status !== 'REVIEW') {
            // Strict check? For now allow in review for corrections just in case
        }

        const validated = this.validateAndSanitizeAnswers(answers);
        if (validated) {
            this.state.answers[userId] = validated.answers;
            if (!this.state.answerStatuses[userId]) this.state.answerStatuses[userId] = {};
            Object.assign(this.state.answerStatuses[userId], validated.statuses);
        }
        return this.state;
    }

    public updateAnswers(connectionId: string, answers: Record<string, string>): RoomState {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) return this.state;

        this.state.answers[userId] = answers;
        return this.state;
    }

    public toggleVote(connectionId: string, targetUserId: string, category: string): RoomState {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) return this.state;

        this.voting.toggleVote(this.state, userId, targetUserId, category);
        return this.state;
    }

    public confirmVotes(connectionId: string): RoomState {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) return this.state;

        if (this.voting.confirmVotes(this.state, userId)) {
            this.calculateResults();
        }

        return this.state;
    }

    public kickPlayer(hostConnectionId: string, targetUserId: string): RoomState {
        const success = this._players.kick(this.state, hostConnectionId, targetUserId);

        if (success) {
            delete this.state.answers[targetUserId];
            delete this.state.roundScores[targetUserId];

            this.voting.cleanupPlayerVotes(this.state, targetUserId);

            if (this.state.status === 'REVIEW') {
                if (this.voting.checkConsensus(this.state)) {
                    this.calculateResults();
                }
            }
        }
        return this.state;
    }

    // --- SYSTEMS DELEGATION ---

    private calculateResults() {
        this.scoreSystem.calculate(this.state);
        if (this.state.status === 'GAME_OVER') {
            this.state.uiMetadata = { activeView: 'GAME_OVER', showTimer: false, targetTime: null };
        } else {
            // In RESULTS phase, the round-manager sets RESULTS and assigns resultsEndsAt inside checkConsensus,
            // then calls calculateResults().
            this.state.uiMetadata = { activeView: 'GAME', showTimer: true, targetTime: this.state.timers.resultsEndsAt };
        }
    }

    // --- HELPER LOGIC ---

    private injectAutomatedVotes() {
        this.voting.injectAutomatedVotes(this.state);
    }

    private validateAndSanitizeAnswers(rawAnswers: any): { answers: Record<string, string>; statuses: Record<string, AnswerStatus> } | null {
        const result = RoundAnswersSchema.safeParse(rawAnswers);
        if (!result.success) {
            console.error('Invalid answers payload:', result.error);
            return null;
        }

        const answers = result.data;
        const sanitized: Record<string, string> = {};
        const statuses: Record<string, AnswerStatus> = {};
        const allowedLetter = this.state.currentLetter || "";

        for (const [key, value] of Object.entries(answers)) {
            const valResult = this.validation.processAnswer(value, allowedLetter, key);

            if (valResult.status === 'INVALID' || valResult.status === 'EMPTY') {
                if (valResult.status === 'INVALID') {
                    console.log(`[RULE BREACH] Word '${value}' invalid for letter '${allowedLetter}'. Cleared.`);
                }
                sanitized[key] = "";
                statuses[key] = valResult.status;
            } else {
                sanitized[key] = valResult.text;
                statuses[key] = valResult.status;
            }
        }

        return { answers: sanitized, statuses };
    }

    public handleTimeUp(): boolean {
        const now = Date.now();
        let changed = false;

        if (this.state.status === 'PLAYING' && this.state.timers.roundEndsAt && now >= this.state.timers.roundEndsAt) {
            console.log("[TutiEngine] Anti-Freeze: Forcing round stop");
            this.handleTimeUp_Internal(); // Reusing the existing timeout callback logic
            changed = true;
        } else if (this.state.status === 'REVIEW' && this.state.timers.votingEndsAt && now >= this.state.timers.votingEndsAt) {
            console.log("[TutiEngine] Anti-Freeze: Forcing results calculation");
            // If voting ends, we force calculation (auto-filling missing votes or resolving)
            this.calculateResults();
            changed = true;
        } else if (this.state.status === 'RESULTS' && this.state.timers.resultsEndsAt && now >= this.state.timers.resultsEndsAt) {
            console.log("[TutiEngine] Anti-Freeze: Forcing next round");
            // Force next round
            if (this.rounds.nextRound(this.state, this.state.config)) {
                this.rounds.startRound(this.state, this.state.config, () => this.handleTimeUp_Internal());
            }
            changed = true;
        }

        return changed;
    }
}
