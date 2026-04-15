import type * as Party from "partykit/server";
import { BaseHandler } from "./base";
import { sendError } from "../utils/broadcaster";


export class PlayerHandler extends BaseHandler {

    async handleKick(payload: { targetUserId: string }, sender: Party.Connection) {
        try {
            this.engine.kickPlayer(sender.id, payload.targetUserId);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }

    async handleUpdateSettings(payload: any, sender: Party.Connection) {
        try {
            // [Sprint H1 — SEC-2] Defense-in-depth: verify host at handler layer
            if (!this.isHost(sender)) {
                sendError(sender, 'Solo el anfitrión puede cambiar la configuración.');
                return;
            }
            this.engine.updateConfig(sender.id, payload);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }
}
