import type * as Party from "partykit/server";
import { BaseHandler } from "./base";
import { sendError } from "../utils/broadcaster";
import { ERROR_CODES } from "../../shared/consts";


import { GameConfig, DeepPartial } from "../../shared/types";

export class PlayerHandler extends BaseHandler {

    async handleKick(payload: { targetUserId: string }, sender: Party.Connection) {
        try {
            // [Sprint H6 — SEC-1] Defense-in-depth: verify host at handler layer before engine processes anything.
            if (!this.isHost(sender)) {
                sendError(sender, ERROR_CODES.NOT_HOST);
                return;
            }
            this.engine.kickPlayer(sender.id, payload.targetUserId);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }

    async handleUpdateSettings(payload: DeepPartial<GameConfig>, sender: Party.Connection) {
        try {
            // [Sprint H1 — SEC-2] Defense-in-depth: verify host at handler layer
            if (!this.isHost(sender)) {
                sendError(sender, ERROR_CODES.NOT_HOST);
                return;
            }

            // Validar propiedad de la expansión si el host intenta activarla
            if (payload.activePackId) {
                const userId = this.engine.players.getPlayerId(sender.id);
                if (userId && !userId.startsWith('guest_')) {
                    const { data, error } = await this.engine.supabase
                        .from('user_inventory')
                        .select('id')
                        .eq('user_id', userId)
                        .eq('item_id', payload.activePackId)
                        .maybeSingle();
                    
                    if (error || !data) {
                        sendError(sender, 'No eres dueño de esta expansión de categorías.');
                        return;
                    }
                }
            }

            this.engine.updateConfig(sender.id, payload);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }
}
