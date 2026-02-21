import { z } from 'zod';
import { EVENTS } from './consts';
import { RoomSnapshotSchema } from './schemas';

export type GameStatus = 'LOBBY' | 'PLAYING' | 'REVIEW' | 'RESULTS' | 'GAME_OVER' | 'ROLE_REVEAL' | 'TYPING' | 'VOTING';

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
}

export interface GameConfig {
    mode: 'CLASSIC' | 'IMPOSTOR';
    isPublic: boolean;
    maxPlayers: number;
    classic: {
        rounds: number;
        timeLimit: number;
        votingDuration: number;
        categories: string[];
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
    };
}

export type AnswerStatus = 'VALID' | 'VALID_AUTO' | 'DUPLICATE' | 'INVALID' | 'EMPTY' | 'PENDING';

export interface ImpostorData {
    secretWord: string;
    secretCategory: string;
    impostorId: string;
    words: Record<string, string>; // userId -> palabra escrita (camuflaje)
    votes: Record<string, string>; // voterId -> accusedId
    result?: {
        winner: 'IMPOSTOR' | 'CREW';
        mostVotedId: string | null;
    };
}

export interface RoomState {
    status: GameStatus;
    players: Player[];
    spectators: Player[];  // [Phoenix] Late joiners waiting for next round
    roomId: string | null;
    currentLetter: string | null;
    categories: string[];
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
    };
    stoppedBy: string | null;
    gameOverReason?: 'NORMAL' | 'ABANDONED';
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
    | { type: typeof EVENTS.CHAT_SEND; payload: { text: string } };

// Messages sent from Server to Client
export type ServerMessage =
    | { type: typeof EVENTS.UPDATE_STATE; payload: RoomState }
    | { type: typeof EVENTS.PATCH_STATE; payload: any[] } // [Phoenix] Delta Sync
    | { type: typeof EVENTS.AUTH_GRANTED; payload: { userId: string; sessionToken: string } } // [Phoenix] Anti-Spoofing
    | { type: typeof EVENTS.RIVAL_UPDATE; payload: { playerId: string; filledCount: number } }
    | { type: typeof EVENTS.SYSTEM_MESSAGE; payload: string }
    | { type: typeof EVENTS.SYSTEM_VERSION; payload: { version: string } }
    | { type: typeof EVENTS.CHAT_NEW; payload: ChatMessage }
    | { type: typeof EVENTS.CHAT_HISTORY; payload: ChatMessage[] }
    | { type: typeof EVENTS.SERVER_ERROR; payload: { message: string } } // [Phoenix P0] Error Telemetry
    | { type: typeof EVENTS.LOBBY_STATE_UPDATE; payload: RoomSnapshot[] }; // [Phoenix Lobby]
