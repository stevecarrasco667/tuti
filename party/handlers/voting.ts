import type * as Party from "partykit/server";
import { BaseHandler } from "./base";
import { sendError } from "../utils/broadcaster";
import { ToggleVoteSchema } from "../../shared/schemas";

export class VotingHandler extends BaseHandler {

    async handleVote(rawPayload: unknown, sender: Party.Connection) {
        try {
            const { targetUserId, category } = ToggleVoteSchema.shape.payload.parse(rawPayload);
            this.engine.toggleVote(sender.id, targetUserId, category);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }

    async handleConfirmVotes(sender: Party.Connection) {
        try {
            this.engine.confirmVotes(sender.id);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }
}
