import { EVENTS } from './consts';

export type GameStatus = 'LOBBY' | 'PLAYING' | 'REVIEW' | 'RESULTS' | 'GAME_OVER';

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
    roundDuration: number;
    votingDuration: number;
    categoriesCount: number;
    totalRounds: number;
    mode: 'RANDOM' | 'MANUAL';
    selectedCategories: string[];
    customCategories: string[];
}

export type AnswerStatus = 'VALID' | 'DUPLICATE' | 'INVALID' | 'EMPTY' | 'PENDING';

export interface RoomState {
    status: GameStatus;
    players: Player[];
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
    | { type: typeof EVENTS.RIVAL_UPDATE; payload: { playerId: string; filledCount: number } }
    | { type: typeof EVENTS.SYSTEM_MESSAGE; payload: string }
    | { type: typeof EVENTS.SYSTEM_VERSION; payload: { version: string } }
    | { type: typeof EVENTS.CHAT_NEW; payload: ChatMessage }
    | { type: typeof EVENTS.CHAT_HISTORY; payload: ChatMessage[] };
