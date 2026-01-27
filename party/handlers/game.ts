import type * as Party from "partykit/server";
import { BaseHandler } from "./base";
import { broadcastState, sendError } from "../utils/broadcaster";

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

    async handleStopRound(payload: any, sender: Party.Connection) {
        try {
            const state = this.engine.stopRound(sender.id, payload.answers);
            await this.persistAndBroadcast(state);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }

    // [SILENT UPDATE] Optimized for bandwidth (O(n) instead of O(n^2))
    async handleUpdateAnswers(payload: any, sender: Party.Connection) {
        try {
            // 1. Update Engine (RAM)
            const state = this.engine.updateAnswers(sender.id, payload.answers);

            // 2. Persist to Disk (Silent)
            await this.room.storage.put(STORAGE_KEY, state);

            // 3. Calculate Delta (Filled Count)
            const filledCount = Object.values(payload.answers).filter((val: any) => val && val.trim().length > 0).length;

            // 4. Lightweight Broadcast (Exclude Sender)
            const msg = JSON.stringify({
                type: "RIVAL_UPDATE",
                payload: {
                    playerId: sender.id,
                    filledCount
                }
            });
            this.room.broadcast(msg, [sender.id]);

        } catch (err) {
            // Non-critical error, don't crash connection, just log
            console.warn(`[SilentUpdate] Failed for ${sender.id}`, err);
        }
    }

    async handleSubmitAnswers(payload: any, sender: Party.Connection) {
        try {
            const state = this.engine.submitAnswers(sender.id, payload.answers);
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
