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
    { id: '41', name: 'Ingrediente de Cocina', tags: ['COMIDA', 'HOGAR'] },
    { id: '42', name: 'Postre', tags: ['COMIDA', 'DULCE'] },
    { id: '43', name: 'Bebida', tags: ['COMIDA', 'FACIL'] },

    // SPORTS
    { id: '50', name: 'Deporte', tags: ['DEPORTE', 'ACTIVIDAD'] },
    { id: '51', name: 'Atleta/Deportista', tags: ['DEPORTE', 'FAMOSO'] },
    { id: '52', name: 'Equipo Deportivo', tags: ['DEPORTE', 'GRUPO'] },

    // RANDOM & FUN
    { id: '60', name: 'Excusa para llegar tarde', tags: ['FUN', 'CREATIVO'] },
    { id: '61', name: 'Motivo de ruptura', tags: ['FUN', 'SOCIAL'] },
    { id: '62', name: 'Lo primero que harías si ganas la lotería', tags: ['FUN', 'CREATIVO'] },
    { id: '63', name: 'Nombre de banda de rock', tags: ['FUN', 'MUSICA'] },
    { id: '64', name: 'Insulto (suave)', tags: ['FUN', 'SOCIAL'] }, // Risky but fun
    { id: '65', name: 'Palabra que rime con "Amor"', tags: ['LENGUAJE', 'FACIL'] },
    { id: '66', name: 'Objeto en esta habitación', tags: ['ENTORNO', 'OBSERVACION'] },
    { id: '67', name: 'Regalo terrible', tags: ['FUN', 'SOCIAL'] },
];

export class GameEngine {
    private state: RoomState;
    public scoreSystem = new ScoreSystem();
    public rounds = new RoundManager();
    public players = new PlayerManager();

    constructor(roomId: string, private onGameStateChange?: (state: RoomState) => void) {
        this.state = {
            status: 'LOBBY',
            roomId: roomId,
            players: [],
            roundsPlayed: 0,
            currentLetter: null,
            categories: [],
            answers: {}, // UserId -> { Category -> Word }
            answerStatuses: {},
            votes: {}, // TargetId -> { Category -> [VoterIds] } (Votos negativos)
            whoFinishedVoting: [],
            roundScores: {},

            // Default Config
            config: {
                totalRounds: 5,
                roundDuration: 60,
                votingDuration: 30, // seconds
                categoriesCount: 5,
                mode: 'RANDOM', // 'RANDOM' | 'MANUAL'
                selectedCategories: [], // For manual mode
                customCategories: []    // User created
            },

            // Timers
            timers: {
                roundEndsAt: null,
                votingEndsAt: null,
                resultsEndsAt: null
            },
            stoppedBy: null
        };
    }

    // --- STATE ACCESS ---
    public getState(): RoomState {
        return this.state;
    }

    public hydrate(newState: RoomState): void {
        this.state = newState;
        console.log("[ENGINE] State hydrated from storage");
    }

    // --- CONNECTION MANAGEMENT (Delegated to PlayerManager) ---

    // Formerly handleConnection / registerConnection
    // Now implicitly handled via joinPlayer which tries reconnect first

    public joinPlayer(userId: string, name: string, avatar: string, connectionId: string): RoomState {
        // Try Reconnect First
        if (this.players.reconnect(this.state, connectionId, userId)) {
            return this.state;
        }

        // Add New Player (Manager handles name handling & host assignment)
        this.players.add(this.state, connectionId, { id: userId, name, avatar });

        return this.state;
    }

    // Formerly handleDisconnection
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

                // Clear timers
                this.state.timers.roundEndsAt = null;
                this.state.timers.votingEndsAt = null;
                this.state.timers.resultsEndsAt = null;
            }
        }

        return this.state;
    }

    // CHECK ZOMBIES
    public checkInactivePlayers(): boolean {
        // Purge players disconnected > 60s
        const changed = this.players.removeInactive(this.state, 60000);

        if (changed) {
            // If anyone was purged, we must broadcast the updated list
            if (this.onGameStateChange) {
                this.onGameStateChange(this.state);
            }
        }
        return changed; // Return true to let caller know state mutated
    }

    // --- CONFIGURATION ---

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

    // --- GAME LIFECYCLE (Delegated to RoundManager) ---

    public startGame(connectionId: string): RoomState {
        const userId = this.players.getPlayerId(connectionId);
        if (!userId) throw new Error("Connection not mapped to a player");

        const player = this.state.players.find(p => p.id === userId);
        if (!player) throw new Error("Player not found in state");
        if (!player.isHost) throw new Error("Only the host can start the game");

        // CASE 1: Manual "Next Round" from Results screen
        if (this.state.status === 'RESULTS') {
            // Delegate Next Round Logic directly
            const continueGame = this.rounds.nextRound(this.state, this.state.config);
            if (continueGame) {
                this.rounds.startRound(this.state, this.state.config, () => this.handleTimeUp());
            }
            return this.state;
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

    // [New] Callback for RoundManager when time is up
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

        if (!player) throw new Error("Player not found in state");
        if (this.state.status !== 'PLAYING') throw new Error("Game is not in PLAYING state");

        // Validate and Sanitize
        const sanitizedAnswers = this.validateAndSanitizeAnswers(answers);
        if (!sanitizedAnswers) return this.state; // Invalid payload

        this.state.answers[userId] = sanitizedAnswers;
        this.state.stoppedBy = userId || 'SYSTEM';

        // Delegate Stop to Manager
        this.rounds.stopRound(this.state, this.state.config);

        // --- 1vs1 GHOST VOTING ---
        const activePlayers = this.state.players.filter(p => p.isConnected);
        if (activePlayers.length === 2) {
            console.log("[1vs1] Injecting Ghost Votes for Automated Judgment");
            this.injectAutomatedVotes(activePlayers);
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

    // --- GAMEPLAY ACTIONS ---

    public submitAnswers(connectionId: string, answers: Record<string, string>): RoomState {
        const userId = this.players.getPlayerId(connectionId);
        if (!userId) throw new Error("Connection not mapped to a player");

        const player = this.state.players.find(p => p.id === userId);
        if (!player) throw new Error("Player not found in state");

        if (this.state.status !== 'PLAYING' && this.state.status !== 'REVIEW') {
            // Strict check? For now allow in review for corrections just in case
        }

        // Validate and Sanitize
        const sanitizedAnswers = this.validateAndSanitizeAnswers(answers);
        if (sanitizedAnswers) {
            this.state.answers[userId] = sanitizedAnswers;
        }
        return this.state;
    }

    public updateAnswers(connectionId: string, answers: Record<string, string>): RoomState {
        const userId = this.players.getPlayerId(connectionId);
        if (!userId) return this.state;

        // Just update the storage (Partial updates during typing? No, full object)
        // Ideally we validate here too but for speed, we trust client slightly or just store raw?
        // Let's store raw for now or minimal sanitize
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

    // --- SYSTEMS DELEGATION ---

    private checkConsensus() {
        const activePlayers = this.state.players.filter(p => p.isConnected);
        const confirmedActivePlayers = activePlayers.filter(p => this.state.whoFinishedVoting.includes(p.id));

        // Check if ALL active players have confirmed
        if (confirmedActivePlayers.length === activePlayers.length && activePlayers.length > 0) {
            this.calculateResults();
        }
    }

    private calculateResults() {
        // Delegate to ScoreSystem
        this.scoreSystem.calculate(this.state);

        // Start "Results" phase timer? Or let ScoreSystem handle status?
        // ScoreSystem.calculate sets status to 'RESULTS' and sets timers.resultsEndsAt
    }

    // --- HELPER LOGIC ---

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
}
