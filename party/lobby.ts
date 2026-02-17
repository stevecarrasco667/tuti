import type * as Party from "partykit/server";
import { EVENTS } from "../shared/consts";
import { logger } from "../shared/utils/logger";
import type { RoomSnapshot } from "../shared/types";
import { RoomSnapshotSchema } from "../shared/schemas";

export default class LobbyServer implements Party.Server {
    private rooms = new Map<string, RoomSnapshot>();

    constructor(readonly room: Party.Room) { }

    onStart() {
        // [Phoenix Lobby] Zombie TTL Reaper — every 10s, purge stale rooms
        setInterval(() => {
            const now = Date.now();
            let reaped = false;

            for (const [id, snapshot] of this.rooms.entries()) {
                if (now - snapshot.lastUpdate > 30000) {
                    this.rooms.delete(id);
                    logger.info('ZOMBIE_ROOM_REAPED', { roomId: id, staleSince: snapshot.lastUpdate });
                    reaped = true;
                }
            }

            if (reaped) {
                this.broadcastState();
            }
        }, 10000);
    }

    onConnect(connection: Party.Connection, _ctx: Party.ConnectionContext) {
        // Send current lobby state to newly connected client
        connection.send(JSON.stringify({
            type: EVENTS.LOBBY_STATE_UPDATE,
            payload: Array.from(this.rooms.values())
        }));
        logger.info('LOBBY_CLIENT_CONNECTED', { connectionId: connection.id });
    }

    async onRequest(req: Party.Request): Promise<Response> {
        // Only accept POST (Heartbeats from game rooms)
        if (req.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
        }

        try {
            const raw = await req.json() as unknown;
            const parsed = RoomSnapshotSchema.safeParse(raw);

            if (!parsed.success) {
                logger.warn('INVALID_HEARTBEAT', { error: parsed.error.message });
                return new Response("Bad Request", { status: 400 });
            }

            const snapshot: RoomSnapshot = {
                ...parsed.data,
                lastUpdate: Date.now()
            };

            this.rooms.set(snapshot.id, snapshot);
            this.broadcastState();

            return new Response("OK", { status: 200 });
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            logger.error('HEARTBEAT_PROCESSING_FAILED', {}, error);
            return new Response("Internal Server Error", { status: 500 });
        }
    }

    private broadcastState() {
        const payload = JSON.stringify({
            type: EVENTS.LOBBY_STATE_UPDATE,
            payload: Array.from(this.rooms.values())
        });

        for (const connection of this.room.getConnections()) {
            connection.send(payload);
        }
    }
}

LobbyServer satisfies Party.Worker;
