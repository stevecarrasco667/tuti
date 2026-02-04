import type * as Party from "partykit/server";
import { BaseHandler } from "./base";
import { broadcastState, sendError } from "../utils/broadcaster";

import { StopRoundSchema, SubmitAnswersSchema, UpdateAnswersSchema } from "../../shared/schemas";

const STORAGE_KEY = "room_state_v1";

export class GameHandler extends BaseHandler {

    async handleStartGame(sender: Party.Connection) {
        try {
            const state = this.engine.startGame(sender.id);
            await this.persistAndBroadcast(state);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }

    async handleStopRound(rawPayload: unknown, sender: Party.Connection) {
        try {
            // Strict Validation
            const { answers } = StopRoundSchema.shape.payload.parse(rawPayload);

            const state = this.engine.stopRound(sender.id, answers);
            await this.persistAndBroadcast(state);
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
            const state = this.engine.updateAnswers(sender.id, answers);

            // 3. Persist to Disk (Silent)
            await this.room.storage.put(STORAGE_KEY, state);

            // 4. Calculate Delta (Filled Count)
            const filledCount = Object.values(answers).filter((val: any) => val && val.trim().length > 0).length;

            // 5. Lightweight Broadcast (Exclude Sender)
            // Note: RIVAL_UPDATE is server-to-client, so we construct it manually (or use Schema if we want strict output too)
            // Keep generic JSON.stringify for perf in hot path or import ServerMessage types
            const msg = JSON.stringify({
                type: "RIVAL_UPDATE", // We could use EVENTS.RIVAL_UPDATE but keeping string in JSON.stringify is same.
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
            await this.persistAndBroadcast(state);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }

    // Helper to keep DRY
    private async persistAndBroadcast(state: any) {
        await this.room.storage.put(STORAGE_KEY, state);
        broadcastState(this.room, state);
    }
}
