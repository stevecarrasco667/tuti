import type * as Party from "partykit/server";
import { BaseHandler } from "./base";
import { sendError } from "../utils/broadcaster";


export class VotingHandler extends BaseHandler {

    async handleVote(payload: { targetUserId: string, category: string }, sender: Party.Connection) {
        try {
            this.engine.toggleVote(sender.id, payload.targetUserId, payload.category);
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
