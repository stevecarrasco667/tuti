import type * as Party from "partykit/server";
import { BaseHandler } from "./base";
import { sendError } from "../utils/broadcaster";

import { EVENTS } from "../../shared/consts";

export class GameHandler extends BaseHandler {

    async handleStartGame(sender: Party.Connection) {
        try {
            await this.engine.startGame(sender.id);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }

    async handleStopRound(payload: { answers: Record<string, string> }, sender: Party.Connection) {
        try {
            this.engine.stopRound(sender.id, payload.answers);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }

    // [SILENT UPDATE] Optimized for bandwidth (O(n) instead of O(n^2))
    async handleUpdateAnswers(payload: { answers: Record<string, string> }, sender: Party.Connection) {
        try {
            const userId = this.engine.players.getPlayerId(sender.id);
            if (!userId) return;

            this.engine.updateAnswers(sender.id, payload.answers);

            const filledCount = Object.values(payload.answers).filter((val: any) => val && val.trim().length > 0).length;

            // Fix: Persist filledCount in canonical state so that:
            // 1. broadcastStateDelta()'s compare() detects the change in previousStates
            // 2. startRound()'s reset to 0 generates a proper patch delta
            const state = this.engine.getState();
            const player = state.players.find((p: any) => p.id === userId);
            if (player) {
                player.filledCount = filledCount;
            }

            // Also send lightweight RIVAL_UPDATE for instant UI feedback (no full delta needed)
            const msg = JSON.stringify({
                type: EVENTS.RIVAL_UPDATE,
                payload: {
                    playerId: userId,
                    filledCount
                }
            });
            this.room.broadcast(msg, [sender.id]);

        } catch (err) {
            console.warn(`[SilentUpdate] Failed for ${sender.id}`, err);
        }
    }

    async handleSubmitAnswers(payload: { answers: Record<string, string> }, sender: Party.Connection) {
        try {
            this.engine.submitAnswers(sender.id, payload.answers);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }

    async handleRestartGame(sender: Party.Connection) {
        try {
            await this.engine.restartGame(sender.id);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }
}
