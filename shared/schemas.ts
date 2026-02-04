import { z } from "zod";
import { EVENTS } from "./consts";

export const PlayerSchema = z.object({
    id: z.string(),
    name: z.string().min(1).max(20),
    score: z.number(),
    isHost: z.boolean(),
    isConnected: z.boolean(),
    lastSeenAt: z.number()
});

export const GameStatusSchema = z.enum(['LOBBY', 'PLAYING', 'REVIEW', 'RESULTS', 'GAME_OVER']);

export const AnswerStatusSchema = z.enum(['VALID', 'DUPLICATE', 'INVALID']);

export const GameConfigSchema = z.object({
    roundDuration: z.number().min(30).max(180),
    votingDuration: z.number().min(15).max(120),
    categoriesCount: z.number().min(4).max(8),
    totalRounds: z.number().min(1).max(20)
});

export const RoomStateSchema = z.object({
    status: GameStatusSchema,
    players: z.array(PlayerSchema),
    // We can't strictly validate everything easily since it's dynamic keys
    roomId: z.string().nullable(),
    currentLetter: z.string().nullable(),
    categories: z.array(z.string()),
    answers: z.record(z.string(), z.record(z.string(), z.string())),
    answerStatuses: z.record(z.string(), z.record(z.string(), AnswerStatusSchema)),
    roundsPlayed: z.number(),
    votes: z.record(z.string(), z.record(z.string(), z.array(z.string()))),
    whoFinishedVoting: z.array(z.string()),
    roundScores: z.record(z.string(), z.number()),
    config: GameConfigSchema,
    timers: z.object({
        roundEndsAt: z.number().nullable(),
        votingEndsAt: z.number().nullable(),
        resultsEndsAt: z.number().nullable()
    })
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
    payload: GameConfigSchema.partial()
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
