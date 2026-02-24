import type * as Party from "partykit/server";
import { BaseHandler } from "./base";
import { sendError } from "../utils/broadcaster";
import { EVENTS } from "../../shared/consts";
import { BaseEngine } from "../../shared/engines/base-engine";
import { logger } from "../../shared/utils/logger";

import type { ChatMessage } from "../../shared/types";

const AUTH_TOKENS_KEY = "auth_tokens_v1";

export class ConnectionHandler extends BaseHandler {
    authTokens: Map<string, string>;
    messages: ChatMessage[];

    constructor(room: Party.Room, engine: BaseEngine, authTokens: Map<string, string>, messages: ChatMessage[]) {
        super(room, engine);
        this.authTokens = authTokens;
        this.messages = messages;
    }

    async handleConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
        try {
            const url = new URL(ctx.request.url);
            const name = url.searchParams.get("name") || "Guest";
            let userId = url.searchParams.get("userId") || connection.id;
            const avatar = url.searchParams.get("avatar") || "👤";
            let token = url.searchParams.get("token");
            const isPublicRequest = url.searchParams.get('public') === 'true';

            // --- ANTI-SPOOFING SECURITY ---
            let isNewToken = false;

            if (this.authTokens.has(userId)) {
                const storedToken = this.authTokens.get(userId);
                if (!token || token !== storedToken) {
                    logger.warn('SPOOF_ATTEMPT', { userId, connectionId: connection.id });
                    userId = crypto.randomUUID();
                    token = crypto.randomUUID();
                    isNewToken = true;
                }
            } else {
                if (!token) token = crypto.randomUUID();
                isNewToken = true;
            }

            if (isNewToken || !this.authTokens.has(userId)) {
                this.authTokens.set(userId, token!);
                await this.room.storage.put(AUTH_TOKENS_KEY, Object.fromEntries(this.authTokens));
            }

            // --- PRIVATE HANDSHAKE ---
            connection.send(JSON.stringify({
                type: EVENTS.AUTH_GRANTED,
                payload: { userId, sessionToken: token }
            }));

            connection.setState({ userId });

            // [SPRINT 10+11] COLD SYNC: Rehidratación Total de Retorno
            connection.send(JSON.stringify({
                type: EVENTS.UPDATE_STATE,
                payload: this.engine.getClientState(userId)
            }));

            if (this.messages.length > 0) {
                connection.send(JSON.stringify({
                    type: EVENTS.CHAT_HISTORY,
                    payload: this.messages
                }));
            }

            logger.info('NEW_CONNECTION', { userId, roomId: this.room.id, connectionId: connection.id });

            // [Phoenix Lobby] Mark room as public if creator requested it
            if (isPublicRequest && this.engine.getState().players.length === 0) {
                this.engine.getState().config.isPublic = true;
                logger.info('ROOM_MARKED_PUBLIC', { roomId: this.room.id, userId });
            }

            // Join Player in Engine (state mutation only — server.ts broadcasts)
            this.engine.joinPlayer(userId, name, avatar, connection.id);
        } catch (err) {
            logger.error('CONNECT_FAILED', { connectionId: connection.id, roomId: this.room.id }, err instanceof Error ? err : new Error(String(err)));
            sendError(connection, "Failed to join room: " + (err instanceof Error ? err.message : String(err)));
        }
    }

    async handleClose(connection: Party.Connection) {
        logger.info('DISCONNECTED', { connectionId: connection.id, roomId: this.room.id });
        // State mutation only — server.ts broadcasts
        this.engine.playerDisconnected(connection.id);
    }

    async handleExitGame(connection: Party.Connection) {
        // State mutation only — server.ts broadcasts
        this.engine.playerExited(connection.id);

        // Close connection physically
        connection.close();
    }
}
