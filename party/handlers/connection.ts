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

    constructor(
        room: Party.Room,
        engine: BaseEngine,
        authTokens: Map<string, string>,
        messages: ChatMessage[]
    ) {
        super(room, engine);
        this.authTokens = authTokens;
        this.messages = messages;
    }

    async handleConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
        try {
            // [S1-T2] Origin Validation — Reject unauthorized cross-origin WebSocket connections (CSWSH defense)
            // Optional chaining handles test environments where mock requests may not have a headers object.
            const origin = ctx.request.headers?.get?.('Origin') ?? null;
            const allowedOriginsEnv = (this.room.env.ALLOWED_ORIGINS as string) || '';
            const ALLOWED_ORIGINS = [
                'https://tutigame.com',
                'https://www.tutigame.com',
                ...allowedOriginsEnv.split(',').map(o => o.trim()).filter(Boolean)
            ];
            // null origin (no header / test environment) and localhost are always allowed
            const isDevOrigin = !origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
            if (!isDevOrigin && !ALLOWED_ORIGINS.includes(origin)) {
                logger.warn('ORIGIN_REJECTED', { origin, roomId: this.room.id });
                connection.close(4403, 'FORBIDDEN_ORIGIN');
                return;
            }

            const url = new URL(ctx.request.url);
            const name = url.searchParams.get("name") || "Guest";
            let userId = url.searchParams.get("userId") || connection.id;
            // [Sprint H6 — SEC-3] Sanitize avatar before it enters engine state and Durable Storage.
            // Strip control characters (nullbyte, tab, newline) that could corrupt JSON serialization,
            // then truncate to 10 chars (covers ZWJ emoji sequences like 👨‍👩‍👧‍👦 = 8 chars).
            const rawAvatar = url.searchParams.get("avatar") || "👤";
            const avatar = rawAvatar.replace(/[\u0000-\u001F\u007F]/g, '').slice(0, 10) || "👤";
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
                // [BUG-2 FIX] Persistir INMEDIATAMENTE para nuevos tokens.
                // El debounce anterior (2s) creaba una race condition: si el Worker
                // hibernaba antes de que el timer se disparara, el token se perdía
                // y la próxima reconexión generaba un userId nuevo → jugador fantasma.
                // Ahora el await bloquea solo para tokens nuevos (primera conexión);
                // las reconexiones con token existente no pasan por aquí.
                try {
                    await this.room.storage.put('auth_tokens_v1', Object.fromEntries(this.authTokens));
                    logger.info('AUTH_TOKENS_SAVED_IMMEDIATE', { roomId: this.room.id, userId, count: this.authTokens.size });
                } catch (err) {
                    logger.error('AUTH_TOKENS_SAVE_FAILED', { roomId: this.room.id }, err instanceof Error ? err : new Error(String(err)));
                }
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
                this.engine.markAsPublic();
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
