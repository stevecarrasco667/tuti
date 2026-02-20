import type * as Party from "partykit/server";
import { BaseHandler } from "./base";
import { sendError } from "../utils/broadcaster";
import { KickPlayerSchema, UpdateConfigSchema } from "../../shared/schemas";

export class PlayerHandler extends BaseHandler {

    async handleKick(rawPayload: unknown, sender: Party.Connection) {
        try {
            const { targetUserId } = KickPlayerSchema.shape.payload.parse(rawPayload);
            this.engine.kickPlayer(sender.id, targetUserId);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }

    async handleUpdateSettings(rawPayload: unknown, sender: Party.Connection) {
        try {
            const payload = UpdateConfigSchema.shape.payload.parse(rawPayload);
            this.engine.updateConfig(sender.id, payload);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }
}
