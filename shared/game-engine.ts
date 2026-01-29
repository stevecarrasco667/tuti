import { RoomState, Player, GameConfig } from './types.js';
import { RoundAnswersSchema } from './schemas.js';
import { validateWord } from './validator.js';
import { ScoreSystem } from './systems/score-system.js';
import { RoundManager } from './systems/round-manager.js';
import { PlayerManager } from './systems/player-manager.js';

export interface CategoryItem {
    id: string;
    name: string;
    tags: string[];
}

export const MASTER_CATEGORIES: CategoryItem[] = [
    // CLASICOS
    { id: '1', name: 'Nombre', tags: ['CLASICO', 'FACIL'] },
    { id: '2', name: 'Apellido', tags: ['CLASICO'] },
    { id: '3', name: 'País', tags: ['CLASICO', 'GEO'] },
    { id: '4', name: 'Ciudad', tags: ['CLASICO', 'GEO'] },
    { id: '5', name: 'Animal', tags: ['CLASICO', 'NATURALEZA'] },
    { id: '6', name: 'Color', tags: ['CLASICO', 'FACIL'] },
    { id: '7', name: 'Fruta/Verdura', tags: ['CLASICO', 'NATURALEZA'] },
    { id: '8', name: 'Cosa', tags: ['CLASICO', 'FACIL'] },
    { id: '9', name: 'Profesión', tags: ['CLASICO', 'SOCIEDAD'] },

    // ENTERTAINMENT
    { id: '10', name: 'Película', tags: ['CINE', 'FUN'] },
    { id: '11', name: 'Serie de TV', tags: ['CINE', 'FUN'] },
    { id: '12', name: 'Actor/Actriz', tags: ['CINE', 'FAMOSO'] },
    { id: '13', name: 'Villano', tags: ['CINE', 'FUN'] },
    { id: '14', name: 'Superhéroe', tags: ['CINE', 'FUN'] },
    { id: '15', name: 'Personaje Ficticio', tags: ['CINE', 'FUN'] },
    { id: '16', name: 'Videojuego', tags: ['GAMING', 'FUN'] },
    { id: '17', name: 'Youtuber/Streamer', tags: ['INTERNET', 'MODERNO'] },

    // MUSIC
    { id: '20', name: 'Canción', tags: ['MUSICA', 'ARTE'] },
    { id: '21', name: 'Cantante/Banda', tags: ['MUSICA', 'FAMOSO'] },
    { id: '22', name: 'Instrumento Musical', tags: ['MUSICA', 'OBJETO'] },
    { id: '23', name: 'Título de Canción de Reggaeton', tags: ['MUSICA', 'FUN', 'HARD'] },

    // BRANDS & TECH
    { id: '30', name: 'Marca', tags: ['MARCAS', 'CONSUMO'] },
    { id: '31', name: 'Marca de Auto', tags: ['MARCAS', 'VEHICULO'] },
    { id: '32', name: 'Marca de Ropa', tags: ['MARCAS', 'MODA'] },
    { id: '33', name: 'Marca de Tecnología', tags: ['MARCAS', 'TECH'] },
    { id: '34', name: 'App Móvil', tags: ['TECH', 'MODERNO'] },
    { id: '35', name: 'Sitio Web', tags: ['TECH', 'INTERNET'] },

    // FOOD
    { id: '40', name: 'Comida', tags: ['COMIDA', 'FACIL'] },
    { id: '41', name: 'Bebida', tags: ['COMIDA'] },
    { id: '42', name: 'Postre', tags: ['COMIDA', 'DULCE'] },
    { id: '43', name: 'Sabor de Helado', tags: ['COMIDA', 'DULCE'] },
    { id: '44', name: 'Ingrediente de Pizza', tags: ['COMIDA'] },
    { id: '45', name: 'Plato Típico', tags: ['COMIDA', 'CULTURA'] },

    // GEO & CULTURE
    { id: '50', name: 'Capital', tags: ['GEO', 'HARD'] },
    { id: '51', name: 'Río/Lago', tags: ['GEO', 'NATURALEZA'] },
    { id: '52', name: 'Idioma', tags: ['CULTURA'] },
    { id: '53', name: 'Moneda', tags: ['CULTURA', 'ECONOMIA'] },
    { id: '54', name: 'Lugar Turístico', tags: ['GEO', 'VIAJES'] },

    // RANDOM & FUN
    { id: '60', name: 'Insulto (suave)', tags: ['FUN', 'SOCIAL'] },
    { id: '61', name: 'Excusa para llegar tarde', tags: ['FUN', 'SITUACIONAL'] },
    { id: '62', name: 'Motivo de divorcio', tags: ['FUN', 'SITUACIONAL'] },
    { id: '63', name: 'Cosa de millonarios', tags: ['FUN', 'SOCIEDAD'] },
    { id: '64', name: 'Cosa que se pierde', tags: ['FUN', 'SITUACIONAL'] },
    { id: '65', name: 'Cosa que huele mal', tags: ['FUN', 'SENSORIAL'] },
    { id: '66', name: 'Miedo/Fobia', tags: ['PSICOLOGIA'] },
    { id: '67', name: 'Pecado Capital', tags: ['CULTURA', 'HARD'] },

    // SPORTS
    { id: '70', name: 'Deporte', tags: ['DEPORTE'] },
    { id: '71', name: 'Deportista', tags: ['DEPORTE', 'FAMOSO'] },
    { id: '72', name: 'Equipo de Fútbol', tags: ['DEPORTE'] },

    // HOUSE & OBJECTS
    { id: '80', name: 'Parte de la Casa', tags: ['HOGAR'] },
    { id: '81', name: 'Electrodoméstico', tags: ['HOGAR', 'TECH'] },
    { id: '82', name: 'Mueble', tags: ['HOGAR'] },
    { id: '83', name: 'Objeto de Cocina', tags: ['HOGAR', 'COCINA'] },
    { id: '84', name: 'Herramienta', tags: ['HOGAR', 'OBJETO'] },
    { id: '85', name: 'Ropa/Accesorio', tags: ['MODA'] },

    // NATURE & ANIMALS
    { id: '90', name: 'Raza de Perro', tags: ['NATURALEZA', 'ANIMALES'] },
    { id: '91', name: 'Insecto', tags: ['NATURALEZA', 'ANIMALES'] },
    { id: '92', name: 'Animal Marino', tags: ['NATURALEZA', 'ANIMALES'] },
    { id: '93', name: 'Flor', tags: ['NATURALEZA'] },

    // SITUATIONAL
    { id: '100', name: 'Lo encuentras en la playa', tags: ['SITUACIONAL', 'VERANO'] },
    { id: '101', name: 'Se compra en farmacia', tags: ['SITUACIONAL', 'COMPRAS'] },
    { id: '102', name: 'Se lleva puesto', tags: ['SITUACIONAL'] },
    { id: '103', name: 'Es redondo', tags: ['SITUACIONAL', 'FORMA'] },
    { id: '104', name: 'Es rojo', tags: ['SITUACIONAL', 'COLOR'] }
];

export class GameEngine {
    private state: RoomState;
    private scoreSystem = new ScoreSystem();
    private rounds: RoundManager;
    public players = new PlayerManager();

    // ConnectionId -> UserId logic is now in PlayerManager

    constructor(roomId: string, private onGameStateChange?: (state: RoomState) => void) {
        this.rounds = new RoundManager();
        this.state = {
            status: 'LOBBY',
            players: [],
            roomId: roomId,
            currentLetter: null,
            categories: ['Nombre', 'Color', 'Fruta', 'País', 'Cosa'], // Default categories
            answers: {},
            answerStatuses: {},
            roundsPlayed: 0,
            // Voting System Initial State
            votes: {},
            whoFinishedVoting: [],
            roundScores: {},
            // Time Controls
            config: {
                roundDuration: 60, // 60 seconds default
                votingDuration: 45, // 45 seconds default
                categoriesCount: 5,   // 5 categories default
                totalRounds: 5,       // 5 rounds default
                mode: 'RANDOM',
                selectedCategories: []
            },
            timers: {
                roundEndsAt: null,
                votingEndsAt: null,
                resultsEndsAt: null
            },
            stoppedBy: null
        };
        // connections map removed
    }

    public getState(): RoomState {
        return this.state;
    }

    public hydrate(newState: RoomState): void {
        this.state = newState;
        console.log("[ENGINE] State hydrated from storage");
    }

    public registerConnection(connectionId: string, userId: string): void {
        this.players.reconnect(this.state, connectionId, userId);
    }

    public updateConfig(connectionId: string, newConfig: Partial<GameConfig>): RoomState {
        const userId = this.players.getPlayerId(connectionId);
        if (!userId) return this.state;

        const player = this.state.players.find(p => p.id === userId);

        // Only host can update config, and only in LOBBY
        if (player && player.isHost && this.state.status === 'LOBBY') {
            this.state.config = { ...this.state.config, ...newConfig };
            if (this.state.config.categoriesCount < 1) this.state.config.categoriesCount = 1;
            if (this.state.config.categoriesCount > 10) this.state.config.categoriesCount = 10;
        }
        return this.state;
    }

    public joinPlayer(userId: string, name: string, avatar: string, connectionId: string): RoomState {
        // Try Reconnect First
        if (this.players.reconnect(this.state, connectionId, userId)) {
            return this.state;
        }

        // Add New Player (Manager handles name handling & host assignment)
        this.players.add(this.state, connectionId, { id: userId, name, avatar });

        return this.state;
    }

    public playerDisconnected(connectionId: string): RoomState {
        this.players.remove(this.state, connectionId);

        // ABANDONMENT CHECK
        // If game is active and not enough players remain, end it.
        if (this.state.status === 'PLAYING' || this.state.status === 'REVIEW') {
            const activePlayers = this.state.players.filter(p => p.isConnected);
            if (activePlayers.length < 2) {
                console.log(`[GAME OVER] Abandonment detected. Active players: ${activePlayers.length}`);
                this.state.status = 'GAME_OVER';
                this.state.gameOverReason = 'ABANDONED';

                // Clear all timers
                this.state.timers.roundEndsAt = null;
                this.state.timers.votingEndsAt = null;
                this.state.timers.resultsEndsAt = null;
            }
        }

        return this.state;
    }

    // ensureActiveHost moved to PlayerManager
    public ensureActiveHost() {
        // NO-OP or helper if needed wrapper
        // this.players.ensureActiveHost(this.state);
    }

    public startGame(connectionId: string): RoomState {
        const userId = this.players.getPlayerId(connectionId);
        if (!userId) throw new Error("Connection not mapped to a player");

        const player = this.state.players.find(p => p.id === userId);
        if (!player) throw new Error("Player not found in state");
        if (!player.isHost) throw new Error("Only the host can start the game");

        if (player) {

            // CASE 1: Manual "Next Round" from Results screen
            if (this.state.status === 'RESULTS') {
                return this.forceStartNextRound();
            }

            // CASE 2: Starting new game from Lobby/GameOver
            if (this.state.status === 'LOBBY' || this.state.status === 'GAME_OVER') {
                this.state.roundsPlayed = 0; // Explicit safety reset

                // Select categories based on mode
                if (this.state.config.mode === 'MANUAL' && this.state.config.selectedCategories.length >= 3) {
                    this.state.categories = [...this.state.config.selectedCategories];
                } else {
                    // Random mode
                    const shuffled = [...MASTER_CATEGORIES].sort(() => 0.5 - Math.random());
                    this.state.categories = shuffled.slice(0, this.state.config.categoriesCount).map(c => c.name);
                }

                // Delegate Round Start to Manager
                this.rounds.startRound(this.state, this.state.config, () => this.handleTimeUp());
            }

            return this.state;
        }
        return this.state;
    }

    // Callback for RoundManager when time is up
    private handleTimeUp() {
        console.log("[GameEngine] auto-stop triggered by timer.");
        this.rounds.stopRound(this.state, this.state.config);

        // BROADCAST BRIDGE: Notify server to send update
        if (this.onGameStateChange) {
            this.onGameStateChange(this.state);
        }
    }

    public stopRound(connectionId: string, answers: Record<string, string>): RoomState {
        const userId = this.players.getPlayerId(connectionId);
        if (!userId) throw new Error("Connection not mapped to a player");

        const player = this.state.players.find(p => p.id === userId);
        // Assuming any player can stop round for now? Or just host?
        // Original logic: "if (player && this.state.status === 'PLAYING')"
        // If we want restriction, we add it. For now, strict 'PLAYING' check.

        if (!player) throw new Error("Player not found in state");
        if (this.state.status !== 'PLAYING') throw new Error("Game is not in PLAYING state");

        if (player) {
            // Validate and Sanitize
            const sanitizedAnswers = this.validateAndSanitizeAnswers(answers);
            if (!sanitizedAnswers) return this.state; // Invalid payload

            this.state.answers[userId] = sanitizedAnswers;

            this.state.stoppedBy = userId || 'SYSTEM';

            // Delegate Stop to Manager
            this.rounds.stopRound(this.state, this.state.config);

            // --- 1vs1 GHOST VOTING ---
            // If strictly 2 active players, we automate the "voting" judgment
            // using the Validator Service, but keep the Review Phase for visual feedback.
            const activePlayers = this.state.players.filter(p => p.isConnected);
            if (activePlayers.length === 2) {
                console.log("[1vs1] Injecting Ghost Votes for Automated Judgment");
                this.injectAutomatedVotes(activePlayers);
                // Do NOT return. Fall through to normal REVIEW state.
            }
        }
        return this.state;
    }

    private injectAutomatedVotes(activePlayers: Player[]) {
        const playerA = activePlayers[0];
        const playerB = activePlayers[1];

        // Ensure votes object exists
        if (!this.state.votes) this.state.votes = {};

        // Loop all categories
        for (const category of this.state.categories) {
            // Validate A
            const ansA = this.state.answers[playerA.id]?.[category] || "";
            const valA = validateWord(ansA, category);
            if (!valA.isValid) {
                // Inject vote from B against A
                if (!this.state.votes[playerA.id]) this.state.votes[playerA.id] = {};
                if (!this.state.votes[playerA.id][category]) this.state.votes[playerA.id][category] = [];
                // Check if already voted (unlikely in fresh round but safe)
                if (!this.state.votes[playerA.id][category].includes(playerB.id)) {
                    this.state.votes[playerA.id][category].push(playerB.id);
                }
            }

            // Validate B
            const ansB = this.state.answers[playerB.id]?.[category] || "";
            const valB = validateWord(ansB, category);
            if (!valB.isValid) {
                // Inject vote from A against B
                if (!this.state.votes[playerB.id]) this.state.votes[playerB.id] = {};
                if (!this.state.votes[playerB.id][category]) this.state.votes[playerB.id][category] = [];
                if (!this.state.votes[playerB.id][category].includes(playerA.id)) {
                    this.state.votes[playerB.id][category].push(playerA.id);
                }
            }
        }

        // Note: Duplicates are handled by the 'calculateResults' logic during scoring, 
        // Note: Duplicates are handled by the 'calculateResults' logic during scoring,
        // which runs AFTER the review phase. We only need to inject rejection votes here.
    }

    public submitAnswers(connectionId: string, answers: Record<string, string>): RoomState {
        const userId = this.players.getPlayerId(connectionId);
        if (!userId) throw new Error("Connection not mapped to a player");

        const player = this.state.players.find(p => p.id === userId);
        if (!player) throw new Error("Player not found in state");

        if (this.state.status !== 'PLAYING' && this.state.status !== 'REVIEW') {
            // Allow submission in review for late comers or corrections? 
            // Ideally only if not already confirmed.
            // For safety, let's allow it in REVIEW too as per race condition fix logic.
        }

        // Validate and Sanitize
        const sanitizedAnswers: Record<string, string> = {};
        for (const [cat, val] of Object.entries(answers)) {
            if (typeof val === 'string') {
                sanitizedAnswers[cat] = val.trim().slice(0, 50); // limit length
            }
        }

        this.state.answers[userId] = sanitizedAnswers;
        return this.state;
    }

    public updateAnswers(connectionId: string, answers: Record<string, string>): RoomState {
        const userId = this.players.getPlayerId(connectionId);
        if (!userId) return this.state;

        // Just update the storage. No status changes.
        this.state.answers[userId] = answers;
        return this.state;
    }

    public toggleVote(connectionId: string, targetUserId: string, category: string): RoomState {
        const userId = this.players.getPlayerId(connectionId);
        if (!userId || this.state.status !== 'REVIEW') return this.state;
        if (userId === targetUserId) return this.state; // Cannot vote self

        if (!this.state.votes[targetUserId]) this.state.votes[targetUserId] = {};
        if (!this.state.votes[targetUserId][category]) this.state.votes[targetUserId][category] = [];

        const voters = this.state.votes[targetUserId][category];
        const index = voters.indexOf(userId);
        if (index === -1) {
            voters.push(userId); // Vote negative
        } else {
            voters.splice(index, 1); // Remove negative vote
        }
        return this.state;
    }

    public confirmVotes(connectionId: string): RoomState {
        const userId = this.players.getPlayerId(connectionId);
        if (!userId || this.state.status !== 'REVIEW') return this.state;

        if (!this.state.whoFinishedVoting.includes(userId)) {
            this.state.whoFinishedVoting.push(userId);
        }

        this.checkConsensus();

        return this.state;
    }

    private checkConsensus() {
        const activePlayers = this.state.players.filter(p => p.isConnected);
        const confirmedActivePlayers = activePlayers.filter(p => this.state.whoFinishedVoting.includes(p.id));

        // Check if ALL active players have confirmed
        if (confirmedActivePlayers.length === activePlayers.length && activePlayers.length > 0) {
            this.calculateResults();
        }
    }

    public kickPlayer(hostConnectionId: string, targetUserId: string): RoomState {
        const success = this.players.kick(this.state, hostConnectionId, targetUserId);

        if (success) {

            // Clean up state
            delete this.state.answers[targetUserId];
            delete this.state.votes[targetUserId];
            delete this.state.roundScores[targetUserId];

            // Remove votes made by this player against others
            for (const targetId in this.state.votes) {
                for (const category in this.state.votes[targetId]) {
                    const voters = this.state.votes[targetId][category];
                    const idx = voters.indexOf(targetUserId);
                    if (idx !== -1) {
                        voters.splice(idx, 1);
                    }
                }
            }

            // If kicking unblocked the game
            if (this.state.status === 'REVIEW') {
                this.checkConsensus();
            }
        }
        return this.state;
    }

    private calculateResults() {
        this.scoreSystem.calculate(this.state);
    }





    // Force start next round (Auto-start)
    public forceStartNextRound(): RoomState {
        // If we are already in Playing, ignore
        if (this.state.status === 'PLAYING') return this.state;

        // Delegate Next Round Logic
        const continueGame = this.rounds.nextRound(this.state, this.state.config);

        if (continueGame) {
            // Start the round
            this.rounds.startRound(this.state, this.state.config, () => this.handleTimeUp());
        }

        return this.state;
    }

    public restartGame(requestorId: string): RoomState {
        const userId = this.players.getPlayerId(requestorId);
        const player = this.state.players.find(p => p.id === userId);

        // Validate Host
        if (!player || !player.isHost) {
            console.warn(`[SECURITY] Restart denied. Requestor ${requestorId} is not host.`);
            return this.state;
        }

        this.state.status = 'LOBBY';
        this.state.roundsPlayed = 0;
        this.state.currentLetter = null;
        this.state.categories = [];
        this.state.answers = {};
        this.state.answerStatuses = {};
        this.state.votes = {};
        this.state.whoFinishedVoting = [];
        this.state.roundScores = {};

        // Reset scores
        this.state.players.forEach(p => {
            p.score = 0;
        });

        // Clear timers
        this.state.timers.roundEndsAt = null;
        this.state.timers.votingEndsAt = null;
        this.state.timers.resultsEndsAt = null;
        this.state.stoppedBy = null;

        return this.state;
    }

    private validateAndSanitizeAnswers(rawAnswers: any): Record<string, string> | null {
        // 1. Zod Validation
        const result = RoundAnswersSchema.safeParse(rawAnswers);
        if (!result.success) {
            console.error('Invalid answers payload:', result.error);
            return null;
        }

        const answers = result.data;
        const sanitized: Record<string, string> = {};
        const allowedLetter = this.state.currentLetter?.toUpperCase();

        for (const [key, value] of Object.entries(answers)) {
            let processedValue = value.trim().slice(0, 40); // Hard limit safety

            // 2. Rule Enforcement: Start Letter Check
            if (allowedLetter && processedValue.length > 0) {
                const firstChar = processedValue.charAt(0).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const targetChar = allowedLetter.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                if (firstChar !== targetChar) {
                    console.log(`[RULE BREACH] Word '${processedValue}' does not start with '${allowedLetter}'. Cleared.`);
                    processedValue = ""; // WIPE IT
                }
            }

            sanitized[key] = processedValue;
        }

        return sanitized;
    }

    // --- TIMEOUT / WATCHDOG LOGIC ---
    public checkTimeouts(): RoomState | null {
        const now = Date.now();
        let changed = false;

        if (this.state.status === 'PLAYING' && this.state.timers.roundEndsAt && now >= this.state.timers.roundEndsAt) {
            console.log('[GameEngine] Timeout: Round Ended');
            this.forceEndRound();
            changed = true;
        } else if (this.state.status === 'REVIEW' && this.state.timers.votingEndsAt && now >= this.state.timers.votingEndsAt) {
            console.log('[GameEngine] Timeout: Voting Ended');
            this.forceEndVoting();
            changed = true;
        } else if (this.state.status === 'RESULTS' && this.state.timers.resultsEndsAt && now >= this.state.timers.resultsEndsAt) {
            console.log('[GameEngine] Timeout: Results Ended, Next Round');
            this.forceStartNextRound();
            changed = true;
        }

        return changed ? this.state : null;
    }

    private forceEndRound() {
        this.state.status = 'REVIEW';
        this.state.timers.roundEndsAt = null;
        this.state.timers.votingEndsAt = Date.now() + (this.state.config.votingDuration * 1000);
        this.state.stoppedBy = null; // Fix undefined vs null

        // Auto-check for 1v1 or consensus if needed
        this.checkConsensus();
    }

    private forceEndVoting() {
        this.calculateResults();
    }
}
