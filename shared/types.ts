import { z } from 'zod';
import { EVENTS } from './consts';
import { RoomSnapshotSchema } from './schemas';

export type GameStatus = 'LOBBY' | 'LOADING_ROUND' | 'PLAYING' | 'REVIEW' | 'RESULTS' | 'GAME_OVER' | 'ROLE_REVEAL' | 'TYPING' | 'VOTING' | 'LAST_WISH' | 'ENDING_COUNTDOWN';

/** Reference to a game category — id used for DB queries, name for UI display */
export interface CategoryRef {
    id: string;
    name: string;
}

export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    type: 'USER' | 'SYSTEM';
    timestamp: number;
}

export interface Player {
    id: string;
    name: string;
    score: number;
    isHost: boolean;
    isConnected: boolean;
    lastSeenAt: number;
    disconnectedAt?: number; // For Zombie State
    avatar: string;
    filledCount?: number;
    isAuthenticated?: boolean;
}

export interface GameConfig {
    mode: 'CLASSIC' | 'IMPOSTOR';
    isPublic: boolean;
    maxPlayers: number;
    classic: {
        rounds: number;
        timeLimit: number;
        votingDuration: number;
        categoryCount?: number; // Number of random categories when none are manually selected
        categories: CategoryRef[];
        customCategories: string[];
        mutators: {
            suicidalStop: boolean;
            anonymousVoting: boolean;
        };
    };
    impostor: {
        rounds: number;
        typingTime: number;
        votingTime: number;
        categoryCount?: number; // Number of categories per Impostor match (Sprint 3.2)
    };
}

export type AnswerStatus = 'VALID' | 'VALID_AUTO' | 'DUPLICATE' | 'INVALID' | 'EMPTY' | 'PENDING';

export interface ImpostorData {
    currentCategoryName: string;  // Public: the theme of the round (no word secrets)
    alivePlayers: string[];
    words: Record<string, string>; // userId -> palabra
    votes: Record<string, string>; // voterId -> accusedId
    voteCounts?: Record<string, number>; // targetUserId -> count
    readyPlayers: string[];         // [P12] userId[] que ya confirmaron su borrador
    cycleResult?: {
        eliminatedId: string | null;
        matchOver: boolean;
        winner?: 'IMPOSTOR' | 'CREW';
        revealedImpostorIds?: string[]; // Revealed AFTER match ends for results screen
        lastWishGuess?: string;         // [P10] La adivinanza del Impostor (si hubo last_wish)
        lastWishSuccess?: boolean;      // [P10] true si acertó la categoría
        revealedSecretWord?: string;    // [P10] Palabra secreta revelada tras resolver el last_wish
    };
}

// Sprint 3.4: Private Role Payload — delivered via per-connection WebSocket whisper
export interface PrivateRolePayload {
    role: 'impostor' | 'crewmate';
    word: string | null;   // null for impostor (they must bluff without knowing the word)
    category: string;
    allies: string[];      // Co-impostor IDs (empty for crewmates)
}

// --- IMPOSTOR DATA LAYER (Sprint 3.1) ---
export type ImpostorDifficulty = 1 | 2 | 3;

export interface ImpostorWord {
    id: string;
    word: string;
    difficulty: ImpostorDifficulty;
    tags?: string[];
}

export interface ImpostorCategoryData {
    categoryId: string;
    name: string;
    words: ImpostorWord[];
}

export interface RoomState {
    stateVersion: number; // Integrity vector
    status: GameStatus;
    players: Player[];
    spectators: Player[];  // [Phoenix] Late joiners waiting for next round
    roomId: string | null;
    currentLetter: string | null;
    categories: CategoryRef[];
    answers: Record<string, Record<string, string>>; // PlayerID -> { Category -> Answer }
    answerStatuses: Record<string, Record<string, AnswerStatus>>; // PlayerID -> { Category -> AnswerStatus }
    roundsPlayed: number;
    // Voting System
    votes: Record<string, Record<string, string[]>>; // targetPlayerId -> category -> voterIds[]
    whoFinishedVoting: string[];
    roundScores: Record<string, number>;
    impostorData?: ImpostorData;
    // Time Controls
    config: GameConfig;
    timers: {
        roundEndsAt: number | null;
        votingEndsAt: number | null;
        resultsEndsAt: number | null;
        graceEndsAt: number | null; // [Sync] Timestamp absoluto del servidor → fin del Grace Period (Anti-Troll lock)
    };
    remainingTime: number; // Server-canonical countdown in seconds (emitted every tick)
    stoppedBy: string | null;
    endingCountdownBy?: string | null;  // [P11] Nombre del jugador que activó ENDING_COUNTDOWN
    // [Sprint P1 — Fase 2] 'IMPOSTOR_DISCONNECTED' triggers when the Impostor abandons mid-game
    gameOverReason?: 'NORMAL' | 'ABANDONED' | 'IMPOSTOR_DISCONNECTED';
    uiMetadata: {
        activeView: 'LOBBY' | 'GAME' | 'GAME_OVER';
        showTimer: boolean;
        targetTime: number | null;
    };
}

// [Phoenix Lobby] Lightweight snapshot for lobby list
export type RoomSnapshot = z.infer<typeof RoomSnapshotSchema>;

// Messages sent from Client to Server
export type RoundAnswers = Record<string, string>;

export type ClientMessage =
    | { type: typeof EVENTS.JOIN; payload: { name: string; roomId: string; userId: string; avatar: string } }
    | { type: typeof EVENTS.START_GAME }
    | { type: typeof EVENTS.STOP_ROUND; payload: { answers: RoundAnswers } }
    | { type: typeof EVENTS.SUBMIT_ANSWERS; payload: { answers: RoundAnswers } }
    | { type: typeof EVENTS.UPDATE_ANSWERS; payload: { answers: RoundAnswers } }
    | { type: typeof EVENTS.TOGGLE_VOTE; payload: { targetUserId: string; category: string } }
    | { type: typeof EVENTS.CONFIRM_VOTES }
    | { type: typeof EVENTS.UPDATE_CONFIG; payload: Partial<GameConfig> }
    | { type: typeof EVENTS.RESTART_GAME }
    | { type: typeof EVENTS.KICK_PLAYER; payload: { targetUserId: string } }
    | { type: typeof EVENTS.EXIT_GAME }
    | { type: typeof EVENTS.REQUEST_FULL_SYNC }
    | { type: typeof EVENTS.WORD_REACT; payload: { targetPlayerId: string; categoryId: string; emoji: string; senderId: string } }
    | { type: typeof EVENTS.SUBMIT_LAST_WISH; payload: { guess: string } }             // [P10]
    | { type: typeof EVENTS.LAST_WISH_TYPING; payload: { text: string } }              // [P10]
    | { type: typeof EVENTS.UPDATE_IMPOSTOR_DRAFT; payload: { word: string } }         // [P12] Live draft autoguardado
    | { type: typeof EVENTS.CONFIRM_IMPOSTOR_WORD }                                    // [P12] Jugador listo
    | { type: typeof EVENTS.CHAT_SEND; payload: { text: string } };

// Messages sent from Server to Client
export type ServerMessage =
    | { type: typeof EVENTS.UPDATE_STATE; payload: RoomState }
    | { type: typeof EVENTS.PATCH_STATE; payload: { stateVersion: number, patches: any[] } } // [Phoenix] Checked Delta Sync
    | { type: typeof EVENTS.AUTH_GRANTED; payload: { userId: string; sessionToken: string } } // [Phoenix] Anti-Spoofing
    | { type: typeof EVENTS.WORD_REACT; payload: { targetPlayerId: string; categoryId: string; emoji: string; senderId: string } }
    | { type: typeof EVENTS.LAST_WISH_TYPING; payload: { text: string } }              // [P10] broadcast en vivo
    | { type: typeof EVENTS.RIVAL_UPDATE; payload: { playerId: string; filledCount: number } }
    | { type: typeof EVENTS.PRIVATE_ROLE_ASSIGNMENT; payload: PrivateRolePayload } // [Sprint 3.4] Whisper
    | { type: typeof EVENTS.SYSTEM_MESSAGE; payload: string }
    | { type: typeof EVENTS.SYSTEM_VERSION; payload: { version: string } }
    | { type: typeof EVENTS.CHAT_NEW; payload: ChatMessage }
    | { type: typeof EVENTS.CHAT_HISTORY; payload: ChatMessage[] }
    | { type: typeof EVENTS.SERVER_ERROR; payload: { message: string } } // [Phoenix P0] Error Telemetry
    | { type: typeof EVENTS.LOBBY_STATE_UPDATE; payload: RoomSnapshot[] }; // [Phoenix Lobby]

// [Patch 2.4] Single source of truth for the default RoomState.
// Import this instead of duplicating the object literal across engines and composables.
export function createDefaultRoomState(roomId: string | null = null): RoomState {
    return {
        stateVersion: 0,
        status: 'LOBBY',
        players: [],
        spectators: [],
        roomId,
        currentLetter: null,
        categories: [],
        answers: {},
        answerStatuses: {},
        roundsPlayed: 0,
        votes: {},
        whoFinishedVoting: [],
        roundScores: {},
        config: {
            mode: 'CLASSIC',
            isPublic: false,
            maxPlayers: 8,
            classic: {
                rounds: 5,
                timeLimit: 60,
                votingDuration: 30,
                categories: [],
                customCategories: [],
                mutators: {
                    suicidalStop: false,
                    anonymousVoting: false
                }
            },
            impostor: {
                rounds: 3,
                typingTime: 30,
                votingTime: 40
            }
        },
        timers: {
            roundEndsAt: null,
            votingEndsAt: null,
            resultsEndsAt: null,
            graceEndsAt: null
        },
        remainingTime: 0,
        stoppedBy: null,
        gameOverReason: undefined,
        uiMetadata: {
            activeView: 'LOBBY',
            showTimer: false,
            targetTime: null
        }
    };
}
