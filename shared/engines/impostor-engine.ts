// =============================================
// ImpostorEngine — Impostor Game Mode (Stub)
// =============================================
// Sprint 2 will implement the full logic.
// For now, this is a placeholder that satisfies the BaseEngine contract.

import { RoomState, GameConfig, DeepPartial, PrivateRolePayload, createDefaultRoomState } from '../types.js';
import { BaseEngine } from './base-engine.js';
import { PlayerManager } from '../systems/player-manager.js';
import { ConfigurationManager } from '../systems/configuration-manager.js';
import { ImpostorWordProvider } from '../dictionaries/impostor/manager.js'; // Changed import
import { AnalyticsSystem } from '../systems/analytics-system.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { shuffle } from '../utils/random.js';
import { logger } from '../utils/logger.js';

// [Sprint P1 — Fase 3] Serializable snapshot of private engine state.
// Persisted in Worker storage under a SEPARATE key from the public RoomState.
// NEVER included in WebSocket payloads or getClientState().
export interface ImpostorSecretState {
    secretWord: string | null;
    currentImpostorIds: string[];
    activeCategoryIds: string[];
    usedWords: string[];         // Set<string> serialized as array for JSON compat
    lastImpostorId: string | null;
}

export class ImpostorEngine extends BaseEngine {
    private state: RoomState;
    private _players = new PlayerManager();
    private configManager = new ConfigurationManager();
    protected onGameStateChange?: (state: RoomState) => void;
    protected supabase: SupabaseClient;

    // [Sprint 2 - P1] Analytics Tracking
    private _sessionStartTime: number | null = null;
    private _sessionId: string | null = null;
    private _maxPlayerCountSeen: number = 0;

    // Sprint 3.3: Anti-repetition memory (private — NEVER serialized to JSON/WebSocket)
    private usedWords = new Set<string>();
    private activeCategoryIds: string[] = [];
    private lastImpostorId: string | null = null;

    // Sprint 3.4: Secret data — NEVER published to the state graph
    private secretWord: string | null = null;
    private currentImpostorIds: string[] = [];

    // [Sprint P2 — Fase 1] Grace Period timers: userId → timer handle
    // Map keyed by userId (not connectionId) to survive mobile reconnections with a new connectionId.
    private _gracePeriodTimers = new Map<string, ReturnType<typeof setTimeout>>();
    private static readonly GRACE_PERIOD_MS = 15_000;

    // [Sprint P2 — Fase 3] Dirty flag: true when secrets mutated since last getSecretState() call.
    private _secretsDirty = false;

    // Phase 1: Temporal Cache Provider (Isolated per Room)
    private wordProvider: ImpostorWordProvider; // Added property

    constructor(
        supabase: SupabaseClient,
        roomId: string,
        onGameStateChange?: (state: RoomState) => void
    ) {
        super();
        this.supabase = supabase;
        this.onGameStateChange = onGameStateChange;
        this.wordProvider = new ImpostorWordProvider();
        // [Deuda P2] Usar factory centralizada — elimina duplicación con TutiEngine
        this.state = createDefaultRoomState(roomId);
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
        // Shallow copy to avoid CPU bomb
        const maskedState: RoomState = {
            ...this.state,
            impostorData: this.state.impostorData ? {
                ...this.state.impostorData,
                words: { ...this.state.impostorData.words },
                votes: { ...this.state.impostorData.votes }
            } : undefined
        };

        if (maskedState.impostorData) {
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

    /**
     * Sprint 3.4: Per-player private role payload delivered via WebSocket whisper.
     * The server calls this and sends the result ONLY to the specific connection.
     */
    public getPrivateRolePayload(playerId: string): PrivateRolePayload {
        const isImpostor = this.currentImpostorIds.includes(playerId);
        const category = this.state.impostorData?.currentCategoryName || 'Desconocida';

        if (isImpostor) {
            return {
                role: 'impostor',
                word: null, // Impostor does NOT know the secret word
                category,
                allies: this.currentImpostorIds.filter(id => id !== playerId)
            };
        }
        return {
            role: 'crewmate',
            word: this.secretWord,
            category,
            allies: []
        };
    }

    public hydrate(newState: RoomState): void {
        this.state = newState;
        console.log("[ImpostorEngine] State hydrated from storage");
        // NOTE: Private secrets (secretWord, currentImpostorIds, etc.) are restored
        // separately via hydrateSecrets() called by server.ts onStart().
    }

    // [Sprint P1 — Fase 3] Returns a snapshot of private state for Storage persistence.
    // Called by server.ts Write-Behind when the engine is ImpostorEngine.
    public getSecretState(): ImpostorSecretState {
        // [Sprint P2 — Fase 3] Mark as clean after reading — Write-Behind won't persist again until next mutation.
        this._secretsDirty = false;
        return {
            secretWord: this.secretWord,
            currentImpostorIds: [...this.currentImpostorIds],
            activeCategoryIds: [...this.activeCategoryIds],
            usedWords: [...this.usedWords],
            lastImpostorId: this.lastImpostorId,
        };
    }

    // [Sprint P1 — Fase 3] Restores private state after Worker hibernation.
    // Called by server.ts onStart() immediately after engine.hydrate(stored).
    public hydrateSecrets(secret: ImpostorSecretState): void {
        this.secretWord = secret.secretWord;
        this.currentImpostorIds = secret.currentImpostorIds;
        this.activeCategoryIds = secret.activeCategoryIds;
        this.usedWords = new Set(secret.usedWords); // Deserialize array back to Set
        this.lastImpostorId = secret.lastImpostorId;
        // [Sprint P2 — Fase 3] Mark dirty: restored secrets must be confirmed written before next hibernate.
        this._secretsDirty = true;
        console.log(`[ImpostorEngine] 🔑 Secrets hydrated — impostors: [${secret.currentImpostorIds.join(', ')}], word: "${secret.secretWord}"`);
    }

    // [Sprint P1 — Fase 3] Clears private state. Called on restartGame() and dispose().
    public clearSecrets(): void {
        this.secretWord = null;
        this.currentImpostorIds = [];
        this.activeCategoryIds = [];
        this.usedWords.clear();
        this.lastImpostorId = null;
        // [Sprint P2 — Fase 3] Mark dirty: cleared state must be persisted to avoid stale secrets on next hibernate.
        this._secretsDirty = true;
    }

    // [Sprint P2 — Fase 3] Guard checked by server.ts Write-Behind before calling storage.put.
    // Returns true only when secrets mutated since the last getSecretState() call.
    public areSecretsDirty(): boolean {
        return this._secretsDirty;
    }

    // --- CONNECTION MANAGEMENT (Minimal viable for lobby) ---

    public joinPlayer(userId: string, name: string, avatar: string, connectionId: string, isAuthenticated?: boolean): RoomState {
        if (this._players.reconnect(this.state, connectionId, userId)) {
            return this.state;
        }
        this._players.add(this.state, connectionId, { id: userId, name, avatar, isAuthenticated });
        
        this._maxPlayerCountSeen = Math.max(this._maxPlayerCountSeen, this.state.players.length);
        AnalyticsSystem.trackEvent(this.supabase, {
            room_id: this.state.roomId || 'unknown',
            event_type: 'player_joined',
            user_id: userId
        });

        return this.state;
    }

    public playerDisconnected(connectionId: string): RoomState {
        // [Sprint P1 — Fase 2 / Sprint P2 — Fase 1] Anti-Zombie Protocol with Grace Period:
        // Capture userId BEFORE remove() cleans the connection map.
        const userId = this._players.getPlayerId(connectionId);

        this._players.remove(this.state, connectionId);

        // Only trigger during active game phases. In LOBBY or GAME_OVER, disconnections are normal.
        const activeGameStatuses: RoomState['status'][] = ['ROLE_REVEAL', 'TYPING', 'VOTING', 'RESULTS', 'LAST_WISH'];
        if (userId && activeGameStatuses.includes(this.state.status)) {
            AnalyticsSystem.trackEvent(this.supabase, { room_id: this.state.roomId || 'unknown', event_type: 'player_left_mid_game', user_id: userId });
        }

        if (
            userId &&
            activeGameStatuses.includes(this.state.status) &&
            this.currentImpostorIds.includes(userId)
        ) {
            // [Sprint P2 — Fase 1] Grace Period: give the Impostor 15s to reconnect before
            // ending the game. Mobile networks may cause transient disconnections.
            console.log(`[ImpostorEngine] ⚠️ Impostor ${userId} disconnected. Grace period of ${ImpostorEngine.GRACE_PERIOD_MS / 1000}s started.`);
            const timer = setTimeout(() => {
                // Double-check: if the impostor reconnected, the timer would have been cancelled.
                // This callback should only fire if they truly abandoned.
                if (this._gracePeriodTimers.has(userId)) {
                    console.log(`[ImpostorEngine] 💀 Grace period expired for impostor ${userId}. Forcing CREW victory.`);
                    this._gracePeriodTimers.delete(userId);
                    this._forceCrewVictory('IMPOSTOR_DISCONNECTED');
                }
            }, ImpostorEngine.GRACE_PERIOD_MS);
            this._gracePeriodTimers.set(userId, timer);
        }

        return this.state;
    }

    // [Sprint P2 — Fase 1] Cancels the grace period timer for a reconnecting user.
    // Called by server.ts onConnect() after successful identity restoration.
    public cancelGracePeriod(userId: string): void {
        const timer = this._gracePeriodTimers.get(userId);
        if (timer) {
            clearTimeout(timer);
            this._gracePeriodTimers.delete(userId);
            console.log(`[ImpostorEngine] ✅ Grace period cancelled — impostor ${userId} reconnected in time.`);
        }
    }

    public playerExited(connectionId: string): RoomState {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) return this.state;

        const activeGameStatuses: RoomState['status'][] = ['ROLE_REVEAL', 'TYPING', 'VOTING', 'RESULTS', 'LAST_WISH'];
        if (activeGameStatuses.includes(this.state.status)) {
            AnalyticsSystem.trackEvent(this.supabase, { room_id: this.state.roomId || 'unknown', event_type: 'player_left_mid_game', user_id: userId });
        }

        this.state.players = this.state.players.filter(p => p.id !== userId);
        this._players.remove(this.state, connectionId);
        return this.state;
    }

    // [Sprint P1 — Fase 2] Forces an immediate CREW victory and transitions to GAME_OVER.
    // Used when the Impostor abandons mid-game. Scores CREW players and notifies via onGameStateChange.
    private _forceCrewVictory(reason: 'IMPOSTOR_DISCONNECTED'): void {
        // 1. Score all surviving crewmates
        for (const p of this.state.players) {
            if (!this.currentImpostorIds.includes(p.id)) {
                this.state.roundScores[p.id] = (this.state.roundScores[p.id] || 0) + 100;
                p.score += 100;
            }
        }

        // 2. Reveal impostors in the public result payload
        if (this.state.impostorData) {
            this.state.impostorData.cycleResult = {
                eliminatedId: null,
                matchOver: true,
                winner: 'CREW',
                revealedImpostorIds: [...this.currentImpostorIds],
            };
        }

        // 3. Cancel any pending internal timers to prevent stale callbacks
        this.clearTimer();

        // 4. Transition state — skip RESULTS, go directly to GAME_OVER
        this.state.status = 'GAME_OVER';
        this.state.gameOverReason = reason;
        // [Room TTL] Seal the death timestamp — _forceCrewVictory bypasses _triggerGameOver,
        // so gameOverAt must be set here to prevent the year-1970 instant-purge bug.
        if (!this.state.gameOverAt) {
            this.state.gameOverAt = Date.now();
        }
        this.state.timers = { roundEndsAt: null, votingEndsAt: null, resultsEndsAt: null, graceEndsAt: null };
        this.state.uiMetadata = { activeView: 'GAME_OVER', showTimer: false, targetTime: null };

        // 5. Broadcast the new state via the server callback
        this.onGameStateChange?.(this.state);
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

    // [P10] Flag que indica que el voto eliminó al Impostor y el estado last_wish debe activarse
    private _pendingLastWish: boolean = false;

    // [P10] Normaliza un string para comparación tolerante (tildes, mayúsculas, espacios)
    private _normalize(s: string): string {
        return s.toLowerCase()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .replace(/[^a-z0-9 ]/g, '')
            .trim();
    }

    // Fase 2: Timer Interno de Sincronización Activa
    private currentTimer: ReturnType<typeof setTimeout> | null = null;

    private clearTimer() {
        if (this.currentTimer) {
            clearTimeout(this.currentTimer);
            this.currentTimer = null;
        }
    }

    public async startGame(connectionId: string): Promise<RoomState> {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) return this.state;

        const player = this.state.players.find(p => p.id === userId);
        if (!player) return this.state;
        if (!player.isHost) return this.state;

        // [Sprint 2.1] Phase 1 - Idempotency Guard
        if (this.state.status === 'LOADING_ROUND') {
            console.warn('[Idempotency] Request ignored, game is already LOADING_ROUND');
            return this.state;
        }

        if (this.state.status === 'LOBBY' || this.state.status === 'GAME_OVER') {
            this.state.status = 'LOADING_ROUND';

            if (this.state.spectators.length > 0) {
                this.state.players.push(...this.state.spectators);
                this.state.spectators = [];
            }

            // Reset scores for new game
            this.state.players.forEach(p => p.score = 0);
            this.state.roundsPlayed = 0;

            // Sprint 2.1: Async Random Category Selection
            const count = this.state.config.impostor?.categoryCount || 3;

            // [Sprint P2 — Fase 4B] Use wordProvider abstraction instead of raw Supabase query.
            // Consistent with GlobalCache layer and enables proper mocking in tests.
            const allCategories = await this.wordProvider.getAllCategories(this.supabase);
            const allCatIds = allCategories.map(c => c.id);
            // [Sprint P6 — BUG-3] Fisher-Yates native shuffle resolves V8 TimSort bias
            const shuffled = shuffle([...allCatIds]);
            this.activeCategoryIds = shuffled.slice(0, count);

            this.usedWords.clear();
            console.log(`[ImpostorEngine] Selected ${this.activeCategoryIds.length} categories for match: `, this.activeCategoryIds);

            // Phase 2: Parallel Load from Supabase to Temporal Cache
            await Promise.all(
                this.activeCategoryIds.map(catId =>
                    this.wordProvider.loadCategory(catId, this.supabase) // Replaced impostorWords.
                )
            );

            // [Sprint 2 - P1] Analytics
            this._sessionStartTime = Date.now();
            this._sessionId = `${this._sessionStartTime}-${this.state.roomId}`;
            this._maxPlayerCountSeen = this.state.players.length;
            AnalyticsSystem.trackEvent(this.supabase, {
                room_id: this.state.roomId || 'unknown',
                event_type: 'game_started',
                payload: { playerCount: this.state.players.length, categories: this.activeCategoryIds }
            });

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
        const playerCount = activePlayers.length;

        let numImpostors = 1;
        if (playerCount >= 6 && playerCount <= 8) numImpostors = 2;
        else if (playerCount >= 9) numImpostors = 3;

        // Sprint 3.3: Round Robin category rotation
        const catIndex = this.activeCategoryIds.length > 0
            ? this.state.roundsPlayed % this.activeCategoryIds.length
            : 0;
        const currentCategoryId = this.activeCategoryIds[catIndex] || this.activeCategoryIds[0];
        const catData = currentCategoryId ? this.wordProvider.getCategory(currentCategoryId) : undefined; // Replaced impostorWords.
        const secretCategory = catData?.name || 'Desconocida';

        // Get random word, excluding already used ones
        let wordData = currentCategoryId
            ? this.wordProvider.getRandomWord(currentCategoryId, this.usedWords) // Replaced impostorWords.
            : null;
        if (!wordData && currentCategoryId) {
            console.warn('[ImpostorEngine] All words exhausted for category, clearing memory');
            this.usedWords.clear();
            wordData = this.wordProvider.getRandomWord(currentCategoryId, this.usedWords); // Replaced impostorWords.
        }
        const secretWord = wordData?.word || 'Misterio';
        if (wordData) this.usedWords.add(wordData.id);
        console.log(`[ImpostorEngine] Round ${this.state.roundsPlayed + 1}: Category "${secretCategory}", Word "${secretWord}"`);

        // Smart impostor selection: avoid repeating last impostor (when possible)
        let candidates = [...activePlayers];
        if (numImpostors === 1 && this.lastImpostorId && candidates.length > 2) {
            candidates = candidates.filter(p => p.id !== this.lastImpostorId);
        }
        // [Sprint P6 — BUG-3] True entropy via Fisher-Yates for Impostor assignment
        const shuffled = shuffle(candidates);
        const impostorIds = shuffled.slice(0, numImpostors).map(p => p.id);
        if (numImpostors === 1) this.lastImpostorId = impostorIds[0];

        // Sprint 3.4: Store secrets in private properties (never written to public state)
        this.secretWord = secretWord;
        this.currentImpostorIds = impostorIds;
        // [Sprint P5 — BUG-1] Mark dirty: startNewRound() is the primary mutation point for secrets.
        // Without this flag, the Write-Behind in server.ts skips the storage.put and the new
        // impostor identity + secret word are LOST on Worker hibernation.
        this._secretsDirty = true;

        const alivePlayers = activePlayers.map(p => p.id);

        this.state.impostorData = {
            currentCategoryName: secretCategory, // Public: the theme only, no word
            alivePlayers,
            words: {},
            votes: {},
            voteCounts: {},
            readyPlayers: [],       // [P12] Jugadores que confirmaron su borrador
        };

        this.state.status = 'ROLE_REVEAL';
        this.state.timers.roundEndsAt = Date.now() + 10000;
        this.state.uiMetadata = { activeView: 'GAME', showTimer: true, targetTime: this.state.timers.roundEndsAt };

        this.clearTimer();
        this.currentTimer = setTimeout(() => this.handleRoleRevealTimeUp(), 10000);
    }

    private handleRoleRevealTimeUp() {
        if (this.state.status !== 'ROLE_REVEAL') return;
        this.state.status = 'TYPING';
        const typingMs = this.state.config.impostor.typingTime * 1000;
        this.state.timers.roundEndsAt = Date.now() + typingMs;
        this.state.uiMetadata = { activeView: 'GAME', showTimer: true, targetTime: this.state.timers.roundEndsAt };

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
        this.state.uiMetadata = { activeView: 'GAME', showTimer: true, targetTime: this.state.timers.votingEndsAt };

        if (this.onGameStateChange) {
            this.onGameStateChange(this.state);
        }

        this.clearTimer();
        this.currentTimer = setTimeout(() => this.handleVotingTimeUp(), votingMs);
    }

    private handleVotingTimeUp() {
        if (this.state.status !== 'VOTING') return;

        this.calculateResults();

        // [P10] Si la tripulación eliminó al Impostor, activar el estado last_wish en lugar de RESULTS
        if (this._pendingLastWish) {
            this._pendingLastWish = false;
            this.state.status = 'LAST_WISH';
            const lastWishMs = 10000;
            this.state.timers.resultsEndsAt = Date.now() + lastWishMs;
            this.state.uiMetadata = { activeView: 'GAME', showTimer: true, targetTime: this.state.timers.resultsEndsAt };

            if (this.onGameStateChange) this.onGameStateChange(this.state);

            this.clearTimer();
            this.currentTimer = setTimeout(() => this.handleLastWishTimeUp(), lastWishMs);
            return;
        }

        this.state.status = 'RESULTS';
        this.state.timers.resultsEndsAt = Date.now() + 10000;
        this.state.uiMetadata = { activeView: 'GAME', showTimer: true, targetTime: this.state.timers.resultsEndsAt };

        if (this.onGameStateChange) {
            this.onGameStateChange(this.state);
        }

        this.clearTimer();
        this.currentTimer = setTimeout(() => this.handleResultsTimeUp(), 10000);
    }

    // [P10] El tiempo del Último Deseo agotó — la tripulación gana
    private handleLastWishTimeUp() {
        if (this.state.status !== 'LAST_WISH') return;
        this._resolveLastWish(false, null);
    }

    // [P10] Lógica compartida para resolver el Último Deseo (timeout o guess)
    private _resolveLastWish(impostorWon: boolean, guess: string | null) {
        if (!this.state.impostorData?.cycleResult) return;
        this.clearTimer();

        if (impostorWon) {
            // El Impostor robó la victoria — +300 al Impostor
            for (const impId of this.currentImpostorIds) {
                this.state.roundScores[impId] = (this.state.roundScores[impId] || 0) + 300;
                const p = this.state.players.find(pl => pl.id === impId);
                if (p) p.score += 300;
            }
            this.state.impostorData.cycleResult.winner = 'IMPOSTOR';
        } else {
            // Tripulación gana (timeout o fallo en el guess) — +100 a cada tripulante
            for (const p of this.state.players) {
                if (!this.currentImpostorIds.includes(p.id)) {
                    this.state.roundScores[p.id] = (this.state.roundScores[p.id] || 0) + 100;
                    p.score += 100;
                }
            }
            this.state.impostorData.cycleResult.winner = 'CREW';
        }

        if (guess !== null) this.state.impostorData.cycleResult.lastWishGuess = guess;
        if (guess !== null) this.state.impostorData.cycleResult.lastWishSuccess = impostorWon;
        // Revelar la palabra secreta en el resultado para que la UI pueda mostrarla
        if (this.secretWord) this.state.impostorData.cycleResult.revealedSecretWord = this.secretWord;
        this.state.impostorData.cycleResult.matchOver = true;

        this.state.status = 'RESULTS';
        this.state.timers.resultsEndsAt = Date.now() + 10000;
        this.state.uiMetadata = { activeView: 'GAME', showTimer: true, targetTime: this.state.timers.resultsEndsAt };

        if (this.onGameStateChange) this.onGameStateChange(this.state);
        this.currentTimer = setTimeout(() => this.handleResultsTimeUp(), 10000);
    }

    private handleResultsTimeUp() {
        if (this.state.status !== 'RESULTS') return;
        this.clearTimer();

        this.state.timers = { roundEndsAt: null, votingEndsAt: null, resultsEndsAt: null, graceEndsAt: null };

        const result = this.state.impostorData?.cycleResult;

        if (result?.matchOver) {
            // Ciclo terminó en victoria de un grupo
            this.state.roundsPlayed++;

            if (this.state.roundsPlayed < this.state.config.impostor.rounds) {
                // More rounds to play — start next round
                this.startNewRound();
            } else {
                // Game Over — DO NOT delete impostorData (Vue needs it for final screen)
                this._triggerGameOver('NORMAL');
            }
        } else {
            // Ciclo terminó en empate o eliminación parcial, el juego continúa
            if (this.state.impostorData) {
                this.state.impostorData.words = {};
                this.state.impostorData.votes = {};
                this.state.impostorData.voteCounts = {};
                this.state.impostorData.readyPlayers = [];  // [P12] Reset al reiniciar ciclo
                this.state.impostorData.cycleResult = undefined;
            }
            this.state.status = 'TYPING';
            const typingMs = this.state.config.impostor.typingTime * 1000;
            this.state.timers.roundEndsAt = Date.now() + typingMs;
            this.state.uiMetadata = { activeView: 'GAME', showTimer: true, targetTime: this.state.timers.roundEndsAt };
            this.currentTimer = setTimeout(() => this.handleTypingTimeUp(), typingMs);
        }

        if (this.onGameStateChange) {
            this.onGameStateChange(this.state);
        }
    }

    private calculateResults() {
        if (!this.state.impostorData) return;

        const counts = this.state.impostorData.voteCounts || {};

        let maxVotes = 0;
        let mostVotedId: string | null = null;
        let isTie = false;

        // Count votes
        for (const targetId in counts) {
            if (counts[targetId] > maxVotes) {
                maxVotes = counts[targetId];
                mostVotedId = targetId;
                isTie = false;
            } else if (counts[targetId] === maxVotes) {
                isTie = true;
            }
        }

        let eliminatedId: string | null = null;
        if (!isTie && mostVotedId) {
            eliminatedId = mostVotedId;
            // Eliminar al más votado
            this.state.impostorData.alivePlayers = this.state.impostorData.alivePlayers.filter(id => id !== eliminatedId);
        }

        let aliveImpostors = 0;
        let aliveCrew = 0;

        for (const id of this.state.impostorData.alivePlayers) {
            if (this.currentImpostorIds.includes(id)) {
                aliveImpostors++;
            } else {
                aliveCrew++;
            }
        }

        let matchOver = false;
        let winner: 'IMPOSTOR' | 'CREW' | undefined = undefined;

        // [P10] Si se eliminó al Impostor por voto, activar el estado last_wish.
        // El Impostor tiene 10s para adivinar la PALABRA SECRETA como último intento.
        // Los puntos a la tripulación se confirman o revierten en _resolveLastWish.
        if (aliveImpostors === 0) {
            // Todos los impostores han sido eliminados → activar last_wish
            this._pendingLastWish = true;
            matchOver = false;  // Se confirma en _resolveLastWish
            winner = 'CREW';    // Tentativo, puede revertirse si el Impostor acierta
        } else if (aliveImpostors >= aliveCrew) {
            // ¡Los impostores han superado en número a la tripulación!
            matchOver = true;
            winner = 'IMPOSTOR';
        }

        // [P10] Asignar puntos al Impostor si gana por superación numérica.
        // Cuando aliveImpostors === 0, los puntos de la tripulación se asignan
        // en _resolveLastWish (flujo last_wish) para evitar la condición inalcanzable.
        if (winner === 'IMPOSTOR') {
            for (const impId of this.currentImpostorIds) {
                this.state.roundScores[impId] = (this.state.roundScores[impId] || 0) + 300;
                const p = this.state.players.find(pl => pl.id === impId);
                if (p) p.score += 300;
            }
        }
        // Nota: winner === 'CREW' con matchOver=false (last_wish pendiente)
        // → los puntos se asignan en _resolveLastWish.else para garantizar
        //   que se entreguen justo cuando se confirma la victoria de la tripulación.

        this.state.impostorData.cycleResult = {
            eliminatedId,
            matchOver,
            winner,
            // Sprint 3.4: Reveal impostor identities post-vote (legitimate for results screen)
            revealedImpostorIds: [...this.currentImpostorIds]
        };
    }

    public stopRound(_connectionId: string, _answers: Record<string, string>): RoomState {
        // En sprint 2, stopRound no hace nada si usamos transiciones por tiempo
        // O podría hacer short-circuit de TYPING a EXPOSITION si todos envían.
        return this.state;
    }

    // [P10] SUBMIT_LAST_WISH — Regla One-Shot:
    // El Impostor debe adivinar la PALABRA SECRETA que los tripulantes conocían.
    // (NO la categoría — la categoría era públicamente visible durante toda la ronda)
    // Si acierta → IMPOSTOR gana (+300 pts). Si falla → CREW gana INMEDIATAMENTE.
    // [Patch 1.6] Alineado con backend: comparación contra secretWord (la palabra), no contra categoryName.
    public submitLastWish(connectionId: string, guess: string): RoomState {
        if (this.state.status !== 'LAST_WISH') return this.state;

        const userId = this._players.getPlayerId(connectionId);
        if (!userId) return this.state;

        // Solo el Impostor puede enviar el guess
        if (!this.currentImpostorIds.includes(userId)) return this.state;

        const impostorWon = this.secretWord
            ? this._normalize(guess) === this._normalize(this.secretWord)
            : false;

        // Regla One-Shot: acierta o pierde instantáneamente (sin intentos extra)
        this._resolveLastWish(impostorWon, guess);

        return this.state;
    }


    public async restartGame(requestorId: string): Promise<RoomState> {
        // [Patch 1.1] Host Guard — mirror of TutiEngine.restartGame()
        const userId = this._players.getPlayerId(requestorId);
        const player = this.state.players.find(p => p.id === userId);
        if (!player || !player.isHost) {
            console.warn(`[SECURITY] ImpostorEngine.restartGame denied. Requestor ${requestorId} is not host.`);
            return this.state;
        }

        this.clearTimer();
        this.state.status = 'LOBBY';
        this.state.uiMetadata = { activeView: 'LOBBY', showTimer: false, targetTime: null };
        this.state.impostorData = undefined;
        this.state.timers = { roundEndsAt: null, votingEndsAt: null, resultsEndsAt: null, graceEndsAt: null };
        this.state.stoppedBy = null;

        // [Sprint P1 — Fase 3] Use clearSecrets() as the single source of truth for resetting private state.
        this.clearSecrets();

        // Sprint 2.1: Garbage Collection
        this.wordProvider.clearCache();

        return this.state;
    }

    public submitAnswers(connectionId: string, answers: Record<string, string>): RoomState {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) return this.state;

        if (this.state.status !== 'TYPING') return this.state;

        if (this.state.impostorData) {
            if (!this.state.impostorData.alivePlayers.includes(userId)) return this.state; // Dead men type no tales

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

    // [P12] EJE A: Live Draft autoguardado por debounce
    // El servidor guarda silenciosamente el borrador del jugador en state.answers.
    // Si el timer expira, handleTypingTimeUp ya usa state.answers existente → cero pérdidas.
    public updateDraft(connectionId: string, word: string): RoomState {
        if (this.state.status !== 'TYPING') return this.state;
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) return this.state;
        if (!this.state.impostorData?.alivePlayers.includes(userId)) return this.state;

        // Guardar el borrador como answer (mismo slot que submitAnswers)
        if (!this.state.answers[userId]) this.state.answers[userId] = {};
        this.state.answers[userId]['__draft__'] = word;

        // También actualizar words para que el badge de "escribiendo" aparezca en el grid
        // Solo marca que el campo no está vacío (la palabra real se revela en VOTING)
        if (word.trim().length > 0) {
            this.state.impostorData.words[userId] = word;
        } else {
            delete this.state.impostorData.words[userId];
        }

        return this.state;
    }

    // [P12] EJE A: Confirmación — marca al jugador como "listo"
    // El botón pasa de "Enviar" a "Listo". Semánticamente declara que
    // está conforme con su borrador, sin enviar un payload de palabra.
    public confirmWord(connectionId: string): RoomState {
        if (this.state.status !== 'TYPING') return this.state;
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) return this.state;
        if (!this.state.impostorData?.alivePlayers.includes(userId)) return this.state;

        // Añadir a readyPlayers si no está ya (sin duplicados)
        if (!this.state.impostorData.readyPlayers.includes(userId)) {
            this.state.impostorData.readyPlayers.push(userId);
        }

        return this.state;
    }

    // [P12] EJE B: Exponer la PALABRA secreta para el ChatHandler anti-spoiler
    // Devuelve la palabra privada (ej. "perro") que los tripulantes conocen pero no deben revelar
    public getSecretWord(): string | null {
        return this.secretWord ?? null;
    }

    public toggleVote(connectionId: string, targetUserId: string, _category: string): RoomState {
        const userId = this._players.getPlayerId(connectionId);
        if (!userId) return this.state;

        if (this.state.status === 'VOTING' && this.state.impostorData) {
            if (!this.state.impostorData.alivePlayers.includes(userId)) return this.state; // Dead men vote no tales
            if (!this.state.impostorData.alivePlayers.includes(targetUserId)) return this.state; // Cannot vote a dead body

            this.state.impostorData.votes[userId] = targetUserId;

            // Recalculate live voteCounts
            const counts: Record<string, number> = {};
            for (const vTarget of Object.values(this.state.impostorData.votes)) {
                counts[vTarget] = (counts[vTarget] || 0) + 1;
            }
            this.state.impostorData.voteCounts = counts;

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

    public kickPlayer(hostConnectionId: string, targetUserId: string): RoomState {
        // [Sprint P5 — BUG-4] Use _players.kick() which performs the connectionId reverse-lookup
        // internally. Passing targetUserId directly to remove() would corrupt the connectionMap
        // because remove() keys on connectionId, not userId.
        this._players.kick(this.state, hostConnectionId, targetUserId);

        if (this.state.status !== 'LOBBY' && this.state.impostorData) {
            // Si el jugador aborta o lo kickean, lo descartamos de los vivos
            this.state.impostorData.alivePlayers = this.state.impostorData.alivePlayers.filter(id => id !== targetUserId);
        }
        return this.state;
    }

    public checkInactivePlayers(): boolean {
        // [Patch 1.3] Remove ghost players from alivePlayers when they have been purged from state.players
        if (!this.state.impostorData) return false;

        const activePlayerIds = new Set(this.state.players.map(p => p.id));
        const prevAliveCount = this.state.impostorData.alivePlayers.length;

        this.state.impostorData.alivePlayers = this.state.impostorData.alivePlayers.filter(
            id => activePlayerIds.has(id)
        );

        const changed = this.state.impostorData.alivePlayers.length !== prevAliveCount;

        if (changed) {
            console.log(`[ImpostorEngine] checkInactivePlayers: purged ghost players from alivePlayers.`);

            // Re-check win condition after purge
            const aliveImpostors = this.state.impostorData.alivePlayers.filter(
                id => this.currentImpostorIds.includes(id)
            ).length;
            const aliveCrew = this.state.impostorData.alivePlayers.filter(
                id => !this.currentImpostorIds.includes(id)
            ).length;

            if (this.state.impostorData.alivePlayers.length < 2) {
                console.log(`[ImpostorEngine] Not enough alive players after purge. Forcing CREW victory.`);
                this._forceCrewVictory('IMPOSTOR_DISCONNECTED');
            } else if (aliveImpostors >= aliveCrew && this.state.status !== 'RESULTS' && this.state.status !== 'GAME_OVER') {
                console.log(`[ImpostorEngine] Impostors >= Crew after purge. Forcing IMPOSTOR victory.`);
                // Impostors outnumber crew — trigger IMPOSTOR win
                if (this.state.impostorData) {
                    this.state.impostorData.cycleResult = {
                        eliminatedId: null,
                        matchOver: true,
                        winner: 'IMPOSTOR',
                        revealedImpostorIds: [...this.currentImpostorIds]
                    };
                }
                for (const impId of this.currentImpostorIds) {
                    this.state.roundScores[impId] = (this.state.roundScores[impId] || 0) + 300;
                    const p = this.state.players.find(pl => pl.id === impId);
                    if (p) p.score += 300;
                }
                this.state.status = 'RESULTS';
                this.state.timers.resultsEndsAt = Date.now() + 10000;
                this.state.uiMetadata = { activeView: 'GAME', showTimer: true, targetTime: this.state.timers.resultsEndsAt };
                this.currentTimer = setTimeout(() => this.handleResultsTimeUp(), 10000);
                this.onGameStateChange?.(this.state);
            }
        }

        return changed;
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
        // [Patch 1.4c] Anti-Freeze for last_wish — if Worker wakes from hibernation during Last Wish,
        // resolve it as CREW victory (Impostor failed to answer in time).
        } else if (this.state.status === 'LAST_WISH' && this.state.timers.resultsEndsAt && now >= this.state.timers.resultsEndsAt) {
            console.log("[ImpostorEngine] Anti-Freeze: last_wish expired during hibernation — resolving as CREW victory");
            this.handleLastWishTimeUp();
            changed = true;
        }

        return changed;
    }

    // [Sprint 1 - Phase 1] Server-canonical countdown mutator
    public tick(newValue: number): void {
        this.state.remainingTime = Math.max(-1, newValue);
    }

    // [Deuda P2] Encapsulates the public room flag mutation
    public markAsPublic(): void {
        this.state.config.isPublic = true;
    }

    private _triggerGameOver(reason: 'NORMAL' | 'ABANDONED'): void {
        const wasAlreadyGameOver = this.state.status === 'GAME_OVER';
        this.state.status = 'GAME_OVER';
        this.state.gameOverReason = reason;
        // [Room TTL] Seal the death timestamp. Also covers the case where another code path
        // (e.g., _forceCrewVictory) set status='GAME_OVER' first but forgot gameOverAt.
        if (!this.state.gameOverAt) {
            this.state.gameOverAt = Date.now();
        }
        this.state.uiMetadata = { activeView: 'GAME_OVER', showTimer: false, targetTime: null };
        this.state.timers = { roundEndsAt: null, votingEndsAt: null, resultsEndsAt: null, graceEndsAt: null };
        this.clearTimer();

        if (reason === 'NORMAL') {
            this.wordProvider.clearCache();
        }

        if (!wasAlreadyGameOver && this._sessionStartTime) {
            const durationSecs = Math.floor((Date.now() - this._sessionStartTime) / 1000);
            
            let winnerData = undefined;
            if (reason === 'NORMAL' && this.state.impostorData && this.state.impostorData.cycleResult) {
                winnerData = { winningFaction: this.state.impostorData.cycleResult.winner };
            }

            AnalyticsSystem.trackSession(this.supabase, {
                session_id: this._sessionId || `${Date.now()}-${this.state.roomId}`,
                room_id: this.state.roomId || 'unknown',
                mode: 'IMPOSTOR',
                player_count: this._maxPlayerCountSeen || this.state.players.length,
                rounds_played: this.state.roundsPlayed,
                duration_seconds: durationSecs,
                end_reason: reason,
                winner_data: winnerData
            });
        }
    }

    // [Sprint 4] Death Hook — release all GlobalImpostorCache references
    public dispose(): void {
        this.clearTimer();
        // [Sprint P1 — Fase 3] Clear private secrets to avoid stale state on next warm-start
        this.clearSecrets();
        this.wordProvider.clearCache();
        logger.info('IMPOSTOR_ENGINE_DISPOSED', { roomId: this.state.roomId ?? 'unknown' });
    }
}
