import type * as Party from "partykit/server";
import { BaseHandler } from "./base";
import { broadcastState, sendError } from "../utils/broadcaster";

import { StopRoundSchema, SubmitAnswersSchema, UpdateAnswersSchema } from "../../shared/schemas";
import { EVENTS } from "../../shared/consts";

export class GameHandler extends BaseHandler {

    async handleStartGame(sender: Party.Connection) {
        try {
            const state = this.engine.startGame(sender.id);
            broadcastState(this.room, state);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }

    async handleStopRound(rawPayload: unknown, sender: Party.Connection) {
        try {
            // Strict Validation
            const { answers } = StopRoundSchema.shape.payload.parse(rawPayload);

            const state = this.engine.stopRound(sender.id, answers);
            broadcastState(this.room, state);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }

    // [SILENT UPDATE] Optimized for bandwidth (O(n) instead of O(n^2))
    async handleUpdateAnswers(rawPayload: unknown, sender: Party.Connection) {
        try {
            // Strict Validation
            const { answers } = UpdateAnswersSchema.shape.payload.parse(rawPayload);

            // 1. Resolve Identity (FIX)
            const userId = this.engine.players.getPlayerId(sender.id);
            if (!userId) return; // Ignore unmapped connections

            // 2. Update Engine (RAM)
            this.engine.updateAnswers(sender.id, answers);

            // 3. Calculate Delta (Filled Count)
            const filledCount = Object.values(answers).filter((val: any) => val && val.trim().length > 0).length;

            // 4. Lightweight Broadcast (Exclude Sender)
            const msg = JSON.stringify({
                type: EVENTS.RIVAL_UPDATE,
                payload: {
                    playerId: userId,
                    filledCount
                }
            });
            this.room.broadcast(msg, [sender.id]);

        } catch (err) {
            // Non-critical error, don't crash connection, just log
            console.warn(`[SilentUpdate] Failed for ${sender.id}`, err);
        }
    }

    async handleSubmitAnswers(rawPayload: unknown, sender: Party.Connection) {
        try {
            // Strict Validation
            const { answers } = SubmitAnswersSchema.shape.payload.parse(rawPayload);

            const state = this.engine.submitAnswers(sender.id, answers);
            broadcastState(this.room, state);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }
}
