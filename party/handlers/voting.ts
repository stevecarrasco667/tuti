import type * as Party from "partykit/server";
import { BaseHandler } from "./base";
import { broadcastState, sendError } from "../utils/broadcaster";
import { ToggleVoteSchema } from "../../shared/schemas";

export class VotingHandler extends BaseHandler {

    async handleVote(rawPayload: unknown, sender: Party.Connection) {
        try {
            const { targetUserId, category } = ToggleVoteSchema.shape.payload.parse(rawPayload);

            const state = this.engine.toggleVote(sender.id, targetUserId, category);
            broadcastState(this.room, state);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }

    async handleConfirmVotes(sender: Party.Connection) {
        try {
            const state = this.engine.confirmVotes(sender.id);
            broadcastState(this.room, state);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }
}
