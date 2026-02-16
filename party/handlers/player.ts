import type * as Party from "partykit/server";
import { BaseHandler } from "./base";
import { broadcastState, sendError } from "../utils/broadcaster";
import { KickPlayerSchema, UpdateConfigSchema } from "../../shared/schemas";

export class PlayerHandler extends BaseHandler {

    async handleKick(rawPayload: unknown, sender: Party.Connection) {
        try {
            const { targetUserId } = KickPlayerSchema.shape.payload.parse(rawPayload);

            // Engine logic
            const state = this.engine.kickPlayer(sender.id, targetUserId);

            // Broadcast (Write-Behind handles persistence)
            broadcastState(this.room, state);

        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }

    async handleUpdateSettings(rawPayload: unknown, sender: Party.Connection) {
        try {
            // Strict Validation
            const payload = UpdateConfigSchema.shape.payload.parse(rawPayload);

            // Engine logic
            const state = this.engine.updateConfig(sender.id, payload);

            // Broadcast (Write-Behind handles persistence)
            broadcastState(this.room, state);

        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }
}
