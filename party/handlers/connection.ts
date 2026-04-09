import type * as Party from "partykit/server";
import { BaseHandler } from "./base";
import { sendError } from "../utils/broadcaster";
import { EVENTS } from "../../shared/consts";
import { BaseEngine } from "../../shared/engines/base-engine";
import { logger } from "../../shared/utils/logger";

import type { ChatMessage } from "../../shared/types";



export class ConnectionHandler extends BaseHandler {
    authTokens: Map<string, string>;
    messages: ChatMessage[];
    // [Sprint P5 — SMELL-3] Callback injected by server.ts — zero coupling, fire-and-forget.
    private onSaveAuthTokens: (ctx: Party.ConnectionContext) => void;

    constructor(
        room: Party.Room,
        engine: BaseEngine,
        authTokens: Map<string, string>,
        messages: ChatMessage[],
        onSaveAuthTokens: (ctx: Party.ConnectionContext) => void
    ) {
        super(room, engine);
        this.authTokens = authTokens;
        this.messages = messages;
        this.onSaveAuthTokens = onSaveAuthTokens;
    }

    async handleConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
        try {
            const url = new URL(ctx.request.url);
            const name = url.searchParams.get("name") || "Guest";
            let userId = url.searchParams.get("userId") || connection.id;
            const avatar = url.searchParams.get("avatar") || "👤";
            let token = url.searchParams.get("token");
            const isPublicRequest = url.searchParams.get('public') === 'true';

            // --- FASE 4: ANTI-SPOOFING & IDENTITY SECURITY ---
            // Validación Real de JWT (Sprint 1): Verificamos contra la API de Supabase para validar la firma.
            let isAuthenticated = false;
            if (token && token.startsWith('eyJ')) {
                try {
                    const supabaseUrl = this.room.env.SUPABASE_URL as string;
                    const apikey = this.room.env.SUPABASE_ANON_KEY as string;
                    if (supabaseUrl && apikey) {
                        const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                apikey: apikey
                            }
                        });
                        isAuthenticated = res.ok;
                    }
                } catch (err) {
                    logger.warn('JWT_VERIFY_ERROR', { error: String(err) });
                }
            }
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
                // [Sprint P5 — SMELL-3] Fire-and-Forget: zero await on the hot path.
                // The debounce + Isolate Shield in server.ts.scheduleAuthSave() guarantees
                // the actual storage.put will happen within 2s without blocking the WebSocket open.
                this.onSaveAuthTokens(ctx);
            }

            // --- PRIVATE HANDSHAKE ---
            connection.send(JSON.stringify({
                type: EVENTS.AUTH_GRANTED,
                payload: { userId, sessionToken: token }
            }));

            connection.setState({ userId });

            // [Sprint P6 — BUG-2] Removed double UPDATE_STATE here.
            // When joinPlayer() is called below, it mutates state and triggers
            // server.ts -> onStateChange -> broadcastStateDelta, which properly
            // initializes previousStates baseline and sends the true initial state.
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
            this.engine.joinPlayer(userId, name, avatar, connection.id, isAuthenticated);
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
