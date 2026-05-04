import { z } from "zod";
import { EVENTS } from "./consts";

export const PlayerSchema = z.object({
    id: z.string(),
    name: z.string().min(1).max(20),
    score: z.number(),
    isHost: z.boolean(),
    isConnected: z.boolean(),
    lastSeenAt: z.number(),
    isAuthenticated: z.boolean().optional()
});

export const CategoryRefSchema = z.object({
    // [Sprint 5 — S5-T4] Max lengths prevent host from inflating category names
    id: z.string().max(60),
    name: z.string().max(60)
});

export const GameStatusSchema = z.enum(['LOBBY', 'LOADING_ROUND', 'PLAYING', 'REVIEW', 'RESULTS', 'GAME_OVER', 'ROLE_REVEAL', 'TYPING', 'VOTING', 'LAST_WISH', 'ENDING_COUNTDOWN']);

// [Patch 1.5] Sync with AnswerStatus type in types.ts: 'VALID' | 'VALID_AUTO' | 'DUPLICATE' | 'INVALID' | 'EMPTY' | 'PENDING'
export const AnswerStatusSchema = z.enum(['VALID', 'VALID_AUTO', 'DUPLICATE', 'INVALID', 'EMPTY', 'PENDING']);

export const GameConfigSchema = z.object({
    mode: z.enum(['CLASSIC', 'IMPOSTOR']),
    isPublic: z.boolean(),
    maxPlayers: z.number().min(2).max(10),
    lang: z.string().optional().default('es'),
    classic: z.object({
        rounds: z.number().min(1).max(20),
        timeLimit: z.number().min(30).max(180),
        votingDuration: z.number().min(10).max(120),
        categoryCount: z.number().min(1).max(10).optional().default(5),
        // [Sprint 5 — S5-T4] Limit category arrays to prevent state inflation.
        // A malicious host can't push 100+ categories and blow up JSON Patch and Durable Storage.
        categories: z.array(CategoryRefSchema).max(10),
        // [Sprint 5 — S5-T4] Custom category names must be short and bounded.
        customCategories: z.array(z.string().max(40)).max(10),
        mutators: z.object({
            suicidalStop: z.boolean(),
            anonymousVoting: z.boolean()
        })
    }),
    impostor: z.object({
        rounds: z.number().min(1).max(10),
        typingTime: z.number().min(10).max(60),
        votingTime: z.number().min(15).max(120),
        categoryCount: z.number().min(1).max(8).optional().default(3)
    })
});

export const ImpostorDataSchema = z.object({
    secretWord: z.string(),
    secretCategory: z.string(),
    impostorIds: z.array(z.string()),
    alivePlayers: z.array(z.string()),
    words: z.record(z.string(), z.string()),
    votes: z.record(z.string(), z.string()),
    voteCounts: z.record(z.string(), z.number()).optional(),
    readyPlayers: z.array(z.string()).default([]),   // [P12]
    cycleResult: z.object({
        eliminatedId: z.string().nullable(),
        matchOver: z.boolean(),
        winner: z.enum(['IMPOSTOR', 'CREW']).optional()
    }).optional()
});

export const RoomStateSchema = z.object({
    stateVersion: z.number(),
    status: GameStatusSchema,
    players: z.array(PlayerSchema),
    spectators: z.array(PlayerSchema).default([]),  // [Phoenix] Late joiners
    // We can't strictly validate everything easily since it's dynamic keys
    roomId: z.string().nullable(),
    currentLetter: z.string().nullable(),
    categories: z.array(CategoryRefSchema),
    answers: z.record(z.string(), z.record(z.string(), z.string())),
    answerStatuses: z.record(z.string(), z.record(z.string(), AnswerStatusSchema)),
    roundsPlayed: z.number(),
    votes: z.record(z.string(), z.record(z.string(), z.array(z.string()))),
    whoFinishedVoting: z.array(z.string()),
    roundScores: z.record(z.string(), z.number()),
    impostorData: ImpostorDataSchema.optional(),
    config: GameConfigSchema,
    timers: z.object({
        roundEndsAt: z.number().nullable(),
        votingEndsAt: z.number().nullable(),
        resultsEndsAt: z.number().nullable(),
        graceEndsAt: z.number().nullable() // [Sync] Grace Period end timestamp from server
    }),
    uiMetadata: z.object({
        activeView: z.enum(['LOBBY', 'GAME', 'GAME_OVER']),
        showTimer: z.boolean(),
        targetTime: z.number().nullable()
    })
});

// [Phoenix Lobby] Lightweight public room metadata
export const RoomSnapshotSchema = z.object({
    id: z.string(),
    hostName: z.string(),
    hostAvatar: z.string().default('👑'),
    currentPlayers: z.number(),
    maxPlayers: z.number(),
    status: GameStatusSchema,
    mode: z.enum(['CLASSIC', 'IMPOSTOR']),
    roundsTotal: z.number(),
    currentRound: z.number(),
    lang: z.string().default('es'),
    region: z.string().default('NA'),
    joinable: z.boolean(),
    lastUpdate: z.number()
});

export const JoinRoomSchema = z.object({
    type: z.literal(EVENTS.JOIN),
    payload: z.object({
        name: z.string().min(1, "El nombre es obligatorio").max(20, "El nombre es muy largo"),
        userId: z.string(),
        avatar: z.string()
    }),
});


export const RoundAnswersSchema = z.record(z.string(), z.string().trim().max(40));

export const UpdateStateSchema = z.object({
    type: z.literal(EVENTS.UPDATE_STATE),
    payload: RoomStateSchema,
});

export const UpdateAnswersSchema = z.object({
    type: z.literal(EVENTS.UPDATE_ANSWERS),
    payload: z.object({
        answers: RoundAnswersSchema
    })
});

export const StopRoundSchema = z.object({
    type: z.literal(EVENTS.STOP_ROUND),
    payload: z.object({
        answers: RoundAnswersSchema
    })
});

export const SubmitAnswersSchema = z.object({
    type: z.literal(EVENTS.SUBMIT_ANSWERS),
    payload: z.object({
        answers: RoundAnswersSchema
    })
});

export const ToggleVoteSchema = z.object({
    type: z.literal(EVENTS.TOGGLE_VOTE),
    payload: z.object({
        targetUserId: z.string(),
        category: z.string()
    })
});

export const ConfirmVotesSchema = z.object({
    type: z.literal(EVENTS.CONFIRM_VOTES)
});

export const UpdateConfigSchema = z.object({
    type: z.literal(EVENTS.UPDATE_CONFIG),
    payload: GameConfigSchema.deepPartial()
});

export const RestartGameSchema = z.object({
    type: z.literal(EVENTS.RESTART_GAME)
});

export const KickPlayerSchema = z.object({
    type: z.literal(EVENTS.KICK_PLAYER),
    payload: z.object({
        targetUserId: z.string()
    })
});

export const StartGameSchema = z.object({
    type: z.literal(EVENTS.START_GAME)
});

export const ExitGameSchema = z.object({
    type: z.literal(EVENTS.EXIT_GAME)
});

export const RequestFullSyncSchema = z.object({
    type: z.literal(EVENTS.REQUEST_FULL_SYNC)
});

export const ChatSendSchema = z.object({
    type: z.literal(EVENTS.CHAT_SEND),
    payload: z.object({
        text: z.string().min(1).max(250)
    })
});

export const WordReactSchema = z.object({
    type: z.literal(EVENTS.WORD_REACT),
    payload: z.object({
        targetPlayerId: z.string(),
        categoryId: z.string(),
        emoji: z.string(),
        senderId: z.string().optional() // Solo server -> client, por seguridad lo valida el backend 
    })
});

// [P10] El Último Deseo
export const LastWishTypingSchema = z.object({
    type: z.literal(EVENTS.LAST_WISH_TYPING),
    payload: z.object({
        text: z.string().max(120)
    })
});

export const SubmitLastWishSchema = z.object({
    type: z.literal(EVENTS.SUBMIT_LAST_WISH),
    payload: z.object({
        guess: z.string().min(1).max(120)
    })
});

// [P12] Live Drafts
export const UpdateImpostorDraftSchema = z.object({
    type: z.literal(EVENTS.UPDATE_IMPOSTOR_DRAFT),
    payload: z.object({
        word: z.string().max(60)
    })
});

export const ConfirmImpostorWordSchema = z.object({
    type: z.literal(EVENTS.CONFIRM_IMPOSTOR_WORD)
});

export const ClientMessageSchema = z.discriminatedUnion('type', [
    JoinRoomSchema,
    StartGameSchema,
    StopRoundSchema,
    SubmitAnswersSchema,
    UpdateAnswersSchema,
    ToggleVoteSchema,
    ConfirmVotesSchema,
    UpdateConfigSchema,
    RestartGameSchema,
    KickPlayerSchema,
    ExitGameSchema,
    RequestFullSyncSchema,
    WordReactSchema,
    ChatSendSchema,
    LastWishTypingSchema,   // [P10]
    SubmitLastWishSchema,   // [P10]
    UpdateImpostorDraftSchema,  // [P12]
    ConfirmImpostorWordSchema,  // [P12]
]);
