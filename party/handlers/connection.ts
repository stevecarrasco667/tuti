import type * as Party from "partykit/server";
import { BaseHandler } from "./base";
import { broadcastState, sendError } from "../utils/broadcaster";
import { EVENTS } from "../../shared/consts";
import { GameEngine } from "../../shared/game-engine";

const AUTH_TOKENS_KEY = "auth_tokens_v1";

export class ConnectionHandler extends BaseHandler {
    authTokens: Map<string, string>;

    constructor(room: Party.Room, engine: GameEngine, authTokens: Map<string, string>) {
        super(room, engine);
        this.authTokens = authTokens;
    }

    async handleConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
        try {
            const url = new URL(ctx.request.url);
            const name = url.searchParams.get("name") || "Guest";
            let userId = url.searchParams.get("userId") || connection.id;
            const avatar = url.searchParams.get("avatar") || "👤";
            let token = url.searchParams.get("token");

            // --- ANTI-SPOOFING SECURITY ---
            let isNewToken = false;

            if (this.authTokens.has(userId)) {
                const storedToken = this.authTokens.get(userId);
                if (!token || token !== storedToken) {
                    console.warn(`[Security] Spoof attempt on ${userId}. Assigning new ID.`);
                    userId = crypto.randomUUID(); // Hijacker gets a NEW identity
                    token = crypto.randomUUID(); // And a NEW token
                    isNewToken = true;
                } else {
                    // Valid credentials
                    // token = storedToken; // Already matches
                }
            } else {
                // New User or Expiration
                if (!token) token = crypto.randomUUID();
                isNewToken = true;
            }

            // Register & Persist if needed
            if (isNewToken || !this.authTokens.has(userId)) {
                this.authTokens.set(userId, token!);
                // [ARCHITECT VETO] Immediate Persistence
                await this.room.storage.put(AUTH_TOKENS_KEY, Object.fromEntries(this.authTokens));
            }

            // --- PRIVATE HANDSHAKE ---
            connection.send(JSON.stringify({
                type: EVENTS.AUTH_GRANTED,
                payload: { userId, sessionToken: token }
            }));

            // Guardar userId en el socket para que sobreviva a la hibernación
            connection.setState({ userId });

            console.log(`[Connect] ${name} (${userId}) joined ${this.room.id}`);

            // Join Player in Engine
            const state = this.engine.joinPlayer(userId, name, avatar, connection.id);


            // Broadcast entire state (New players need full state, others get Delta via Broadcaster optimization if implemented there, but here we call broadcastState utility)
            // Wait, broadcastState utility usually sends UPDATE_STATE.
            // If we want Deltas, we should use the Server's method or update the utility.
            // For now, let's keep robust full update for joiners (safest).
            broadcastState(this.room, state);
        } catch (err) {
            console.error("[Connect Error]", err);
            sendError(connection, "Failed to join room: " + (err instanceof Error ? err.message : String(err)));
        }
    }

    async handleClose(connection: Party.Connection) {
        console.log(`[Disconnect] ${connection.id} left ${this.room.id}`);
        // Engine handles logic (update presence, host protection)
        const state = this.engine.playerDisconnected(connection.id);

        // Broadcast update
        broadcastState(this.room, state);
    }

    async handleExitGame(connection: Party.Connection) {
        const state = this.engine.playerExited(connection.id);

        // Broadcast (Write-Behind handles persistence)

        this.room.broadcast(JSON.stringify({
            type: EVENTS.UPDATE_STATE,
            payload: state
        }));

        // Close connection physically
        connection.close();
    }
}
