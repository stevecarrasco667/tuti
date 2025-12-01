import { z } from 'zod';

export const PlayerSchema = z.object({
    id: z.string(),
    name: z.string(),
    score: z.number(),
    isHost: z.boolean(),
});

export const RoomStateSchema = z.object({
    status: z.enum(['LOBBY', 'PLAYING', 'REVIEW', 'RESULTS']),
    players: z.array(PlayerSchema),
});

export const JoinRoomSchema = z.object({
    name: z.string().min(1).max(20),
});
