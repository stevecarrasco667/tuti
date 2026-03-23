// =============================================
// TutiEngine — Classic Tuti Frutti Game Mode
// =============================================
// Migrated from shared/game-engine.ts → GameEngine
// Implements BaseEngine contract.

import { RoomState, GameConfig, AnswerStatus, DeepPartial, CategoryRef } from '../types.js';
import { RoundAnswersSchema } from '../schemas.js';
import { BaseEngine } from './base-engine.js';
import { MASTER_CATEGORIES } from './categories.js';

import { ScoreSystem } from '../systems/score-system.js';
import { RoundManager } from '../systems/round-manager.js';
import { PlayerManager } from '../systems/player-manager.js';
import { ValidationManager } from '../systems/validation-manager.js';
import { ConfigurationManager } from '../systems/configuration-manager.js';
import { VotingManager } from '../systems/voting-manager.js';

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * [P11] Fórmula del Candado Anti-Troll.
 * Exportada para que el FRONTEND pueda importarla y replicar exactamente el mismo cálculo.
 * Grace period = 2s base + 4s por cada categoría.
 */
export const calcGracePeriod = (categoryCount: number): number =>
    2000 + categoryCount * 4000;

export class TutiEngine extends BaseEngine {
    private state: RoomState;
    public validation = new ValidationManager();
    public scoreSystem = new ScoreSystem(this.validation);
    public rounds = new RoundManager();
    private _players = new PlayerManager();
    private configManager = new ConfigurationManager();
    private voting = new VotingManager(this.validation);
    protected supabase: SupabaseClient;

    // [P11] Anti-Troll: marca cuándo empezó la ronda para calcular el candado
    private _roundStartTime: number = 0;

    // [P11] ENDING_COUNTDOWN: timer del pánico de 3 segundos
    private _endingTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(
        supabase: SupabaseClient,
        roomId: string,
        private onGameStateChange?: (state: RoomState) => void
    ) {
        super();
        this.supabase = supabase;
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
            remainingTime: 0,
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

        // [Patch 2.3] Infer _roundStartTime from persisted timers to restore the Anti-Troll grace period.
        // Without this, _roundStartTime = 0 after hydration, allowing an instant STOP_ROUND exploit.
        // We reconstruct: startTime = roundEndsAt - timeLimit_ms
        if (
            (this.state.status === 'PLAYING' || this.state.status === 'ENDING_COUNTDOWN') &&
            this.state.timers.roundEndsAt
        ) {
            const timeLimitMs = (this.state.config.classic?.timeLimit ?? 60) * 1000;
            this._roundStartTime = this.state.timers.roundEndsAt - timeLimitMs;
            console.log(`[TutiEngine] hydrate: _roundStartTime inferred from timers (${this._roundStartTime})`);
        } else {
            this._roundStartTime = 0;
        }

        console.log("[TutiEngine] State hydrated from storage");
    }

    // --- CONNECTION MANAGEMENT ---

    public joinPlayer(userId: string, name: string, avatar: string, connectionId: string, isAuthenticated?: boolean): RoomState {
        // Try Reconnect First (check both players AND spectators)
        if (this._players.reconnect(this.state, connectionId, userId)) {
            return this.state;
        }

        // [Phoenix] Dynamic Capacity Bouncer
        const isFull = this.state.players.length >= this.state.config.maxPlayers;
        const canJoinAsPlayer = (this.state.status === 'LOBBY' || this.state.status === 'GAME_OVER') && !isFull;

        if (canJoinAsPlayer) {
            this._players.add(this.state, connectionId, { id: userId, name, avatar, isAuthenticated });
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
                    filledCount: 0,
                    isAuthenticated
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

        // [Sprint 1 - Phase 3] Ghost Player Fix:
        // If a player disconnects during REVIEW and was the last one to vote,
        // auto-confirm their vote and check consensus to unblock the game.
        if (this.state.status === 'REVIEW') {
            this.voting.autoConfirmDisconnectedPlayers(this.state);
            if (this.voting.checkConsensus(this.state)) {
                console.log('[Ghost Player] Disconnection triggered consensus — forcing results.');
                this.calculateResults();
            }
        }

        // ABANDONMENT CHECK (RELAXED)
        if (this.state.status === 'PLAYING' || this.state.status === 'REVIEW' || this.state.status === 'ENDING_COUNTDOWN') {
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

        if (this.state.status === 'PLAYING' || this.state.status === 'REVIEW' || this.state.status === 'ENDING_COUNTDOWN') {
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

        if ((this.state.status === 'PLAYING' || this.state.status === 'REVIEW' || this.state.status === 'ENDING_COUNTDOWN') && this.state.players.length < 2) {
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

    public async startGame(connectionId: string): Promise<RoomState> {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) throw new Error("Connection not mapped to a player");

        const player = this.state.players.find(p => p.id === userId);
        if (!player) throw new Error("Player not found in state");
        if (!player.isHost) throw new Error("Only the host can start the game");

        // [Sprint 2.1] Phase 1 - Idempotency Guard
        if (this.state.status === 'LOADING_ROUND') {
            console.warn('[Idempotency] Request ignored, game is already LOADING_ROUND');
            return this.state;
        }

        // CASE 1: Manual "Next Round" from Results screen
        if (this.state.status === 'RESULTS') {
            this.state.status = 'LOADING_ROUND';
            if (this.state.spectators.length > 0) {
                console.log(`[Spectator] Promoting ${this.state.spectators.length} spectators to players.`);
                this.state.players.push(...this.state.spectators);
                this.state.spectators = [];
            }

            const continueGame = this.rounds.nextRound(this.state, this.state.config);
            if (continueGame) {
                // Ensure temporal cache is loaded for categories (Parallel)
                await Promise.all(
                    this.state.categories.map(cat =>
                        this.validation.getDictionaryManager().loadCategory(cat.id, this.supabase)
                    )
                );

                this.rounds.startRound(this.state, this.state.config, () => this.handleTimeUp_Internal());
                this.state.uiMetadata = { activeView: 'GAME', showTimer: true, targetTime: this.state.timers.roundEndsAt };
            } else {
                this.state.status = 'GAME_OVER';
                this.state.uiMetadata = { activeView: 'GAME_OVER', showTimer: false, targetTime: null };
                // Sprint 2.1: Garbage Collection
                this.validation.getDictionaryManager().clearCache();
            }
            return this.state;
        }

        // CASE 2: Starting new game from Lobby/GameOver
        if (this.state.status === 'LOBBY' || this.state.status === 'GAME_OVER') {
            this.state.status = 'LOADING_ROUND';

            if (this.state.spectators.length > 0) {
                console.log(`[Spectator] Promoting ${this.state.spectators.length} spectators to players.`);
                this.state.players.push(...this.state.spectators);
                this.state.spectators = [];
            }

            this.state.roundsPlayed = 0;

            // Select categories: obey manual selection (even 1 category), else use categoryCount from config
            const manualCategories = this.state.config.classic.categories || [];
            const count = this.state.config.classic.categoryCount ?? 5;

            if (manualCategories.length > 0) {
                // Host chose manually → obey without restrictions
                this.state.categories = [...manualCategories];
            } else {
                // No manual selection → pick `count` random categories
                const { data: catData } = await this.supabase.from('categories').select('id, name').eq('game_mode', 'classic');
                const allCats: CategoryRef[] = (catData && catData.length > 0)
                    ? catData.map(c => ({ id: c.id, name: c.name }))
                    : MASTER_CATEGORIES.map(c => ({ id: c.id, name: c.name }));
                const shuffled = [...allCats].sort(() => 0.5 - Math.random());
                this.state.categories = shuffled.slice(0, count) as CategoryRef[];
            }

            // Hydrate temporal cache BEFORE starting the timer (Parallel)
            await Promise.all(
                this.state.categories.map(cat =>
                    this.validation.getDictionaryManager().loadCategory(cat.id, this.supabase)
                )
            );

            this.rounds.startRound(this.state, this.state.config, () => this.handleTimeUp_Internal());
            this._roundStartTime = Date.now(); // [P11] Registrar inicio de ronda para grace period
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

        // [P11] M1 — Candado Anti-Troll: ignorar peticiones prematuras
        const gracePeriodMs = calcGracePeriod(this.state.categories.length);
        if (Date.now() - this._roundStartTime < gracePeriodMs) {
            console.log(`[GRACE_PERIOD] stopRound rechazado por ${userId} (${Date.now() - this._roundStartTime}ms < ${gracePeriodMs}ms)`);
            return this.state;
        }

        const validated = this.validateAndSanitizeAnswers(answers);
        if (!validated) return this.state;

        this.state.answers[userId] = validated.answers;
        if (!this.state.answerStatuses[userId]) this.state.answerStatuses[userId] = {};
        Object.assign(this.state.answerStatuses[userId], validated.statuses);
        this.state.stoppedBy = userId;
        this.state.endingCountdownBy = player.name; // [P11] Para UI del contador

        // [P11] M2 — Transicionar a ENDING_COUNTDOWN (3s de pánico)
        this.state.status = 'ENDING_COUNTDOWN';
        this.state.timers.roundEndsAt = Date.now() + 3000;
        this.state.uiMetadata = { activeView: 'GAME', showTimer: true, targetTime: this.state.timers.roundEndsAt };

        if (this.onGameStateChange) this.onGameStateChange(this.state);

        if (this._endingTimer) clearTimeout(this._endingTimer);
        this._endingTimer = setTimeout(() => this._forceReview(), 3000);

        return this.state;
    }

    // [P11] M2 — Transición forzosa a REVIEW al agotarse los 3 segundos
    private _forceReview() {
        if (this.state.status !== 'ENDING_COUNTDOWN') return;

        this._endingTimer = null;
        this.rounds.cancelTimer(); // Cancelar el timer natural original
        this.rounds.stopRound(this.state, this.state.config);

        // --- 1vs1 GHOST VOTING ---
        const activePlayers = this.state.players.filter(p => p.isConnected);
        if (activePlayers.length === 2) {
            console.log("[1vs1] Injecting Ghost Votes for Automated Judgment");
            this.injectAutomatedVotes();
        }

        if (this.onGameStateChange) this.onGameStateChange(this.state);
    }

    public async restartGame(requestorId: string): Promise<RoomState> {
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

        // Clear temporal cache
        this.validation.getDictionaryManager().clearCache();

        if (this.onGameStateChange) {
            this.onGameStateChange(this.state);
        }

        return this.state;
    }

    // --- GAMEPLAY ACTIONS ---

    public submitAnswers(connectionId: string, answers: Record<string, string>): RoomState {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) throw new Error("Connection not mapped to a player");

        const player = this.state.players.find(p => p.id === userId);
        if (!player) throw new Error("Player not found in state");

        // [P11] Permitir submitAnswers durante ENDING_COUNTDOWN (pánico de 3s)
        if (this.state.status !== 'PLAYING' && this.state.status !== 'REVIEW' && this.state.status !== 'ENDING_COUNTDOWN') {
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

        // [Sprint 1 - Phase 2] Grace Period (anti-cheat): reject updates if time already expired
        // [P11] También permitir durante ENDING_COUNTDOWN para que los demás jugadores sigan escribiendo
        if (this.state.remainingTime <= -1 && this.state.status !== 'ENDING_COUNTDOWN') {
            console.log(`[SECURITY] UPDATE_ANSWERS rejected: time expired (${this.state.remainingTime}s) for ${userId}`);
            return this.state;
        }

        // [Patch 1.2] Sanitize live answers to prevent letter-bypass exploit.
        // We apply a lightweight check: trim + enforce starting letter.
        // Full Zod + DictionaryManager validation is done in submitAnswers/stopRound;
        // this just ensures the stored draft can never violate the current letter.
        const allowedLetter = (this.state.currentLetter || '').toLowerCase();
        const sanitized: Record<string, string> = {};
        for (const [category, rawValue] of Object.entries(answers)) {
            const trimmed = (rawValue || '').trimStart();
            if (!trimmed) {
                sanitized[category] = '';
                continue;
            }
            // Only reject if we have an active letter AND the answer clearly doesn't start with it
            if (allowedLetter && !trimmed.toLowerCase().startsWith(allowedLetter)) {
                console.log(`[Patch 1.2] UPDATE_ANSWERS: illegal letter in category "${category}" for ${userId}. Cleared.`);
                sanitized[category] = '';
            } else {
                // Cap at 40 chars to match RoundAnswersSchema max
                sanitized[category] = trimmed.slice(0, 40);
            }
        }

        this.state.answers[userId] = sanitized;
        return this.state;
    }

    public toggleVote(connectionId: string, targetUserId: string, category: string): RoomState {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) return this.state;

        // [Sprint 1 - Phase 2] Grace Period: reject votes if voting time already expired
        if (this.state.remainingTime <= -1) {
            console.log(`[SECURITY] TOGGLE_VOTE rejected: voting time expired (${this.state.remainingTime}s) for ${userId}`);
            return this.state;
        }

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
            this.handleTimeUp_Internal();
            changed = true;
        } else if (this.state.status === 'REVIEW' && this.state.timers.votingEndsAt && now >= this.state.timers.votingEndsAt) {
            console.log("[TutiEngine] Anti-Freeze: Forcing results calculation");
            this.calculateResults();
            changed = true;
        } else if (this.state.status === 'RESULTS' && this.state.timers.resultsEndsAt && now >= this.state.timers.resultsEndsAt) {
            console.log("[TutiEngine] Anti-Freeze: Forcing next round");
            if (this.rounds.nextRound(this.state, this.state.config)) {
                this.rounds.startRound(this.state, this.state.config, () => this.handleTimeUp_Internal());
            }
            changed = true;
        // [Patch 1.4b] Anti-Freeze for ENDING_COUNTDOWN — if Worker wakes from hibernation mid-panic,
        // force the transition to REVIEW immediately instead of leaving the game frozen.
        } else if (this.state.status === 'ENDING_COUNTDOWN' && this.state.timers.roundEndsAt && now >= this.state.timers.roundEndsAt) {
            console.log("[TutiEngine] Anti-Freeze: ENDING_COUNTDOWN expired during hibernation — forcing REVIEW");
            if (this._endingTimer) {
                clearTimeout(this._endingTimer);
                this._endingTimer = null;
            }
            this._forceReview();
            changed = true;
        }

        return changed;
    }

    // [Sprint 1 - Phase 1] Server-canonical countdown mutator
    public tick(newValue: number): void {
        this.state.remainingTime = Math.max(-1, newValue);
    }

    // [Sprint 4] Death Hook — release all GlobalWordCache references
    public dispose(): void {
        this.rounds.cancelTimer();
        this.validation.getDictionaryManager().clearCache();
        console.log(`[TutiEngine] Disposed for room ${this.state.roomId}`);
    }
}
