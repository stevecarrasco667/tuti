import type * as Party from "partykit/server";
import { EVENTS } from "../shared/consts";
import { logger } from "../shared/utils/logger";
import type { RoomSnapshot } from "../shared/types";
import { RoomSnapshotSchema } from "../shared/schemas";

// Score de prioridad: salas disponibles arriba, más llenas primero, más frescas primero
function roomScore(r: RoomSnapshot): number {
    const staleness = (Date.now() - r.lastUpdate) / 1000;
    return (r.joinable ? 1000 : 0) + (r.currentPlayers * 10) - (staleness * 2);
}

export default class LobbyServer implements Party.Server {
    private rooms = new Map<string, RoomSnapshot>();

    constructor(readonly room: Party.Room) { }

    async onStart() {
        const stored = await this.room.storage.get<RoomSnapshot[]>('public_rooms');
        if (stored) {
            for (const room of stored) {
                this.rooms.set(room.id, room);
            }
            logger.info('LOBBY_STATE_HYDRATED', { count: this.rooms.size });
        }

        // Zombie TTL Reaper: purga salas sin heartbeat > 30s
        setInterval(() => {
            const now = Date.now();
            for (const [id, snapshot] of this.rooms.entries()) {
                if (now - snapshot.lastUpdate > 30000) {
                    this.rooms.delete(id);
                    this.broadcast(EVENTS.ROOM_REMOVED, { id });
                    logger.info('ZOMBIE_ROOM_REAPED', { roomId: id });
                }
            }
        }, 10000);

        // Persistencia periódica (solo storage, sin broadcast)
        setInterval(async () => {
            await this.room.storage.put('public_rooms', Array.from(this.rooms.values()));
        }, 15000);
    }

    onConnect(connection: Party.Connection) {
        // Enviar snapshot inicial ordenado por prioridad (máx 50 salas)
        const sorted = Array.from(this.rooms.values())
            .sort((a, b) => roomScore(b) - roomScore(a))
            .slice(0, 50);

        connection.send(JSON.stringify({
            type: EVENTS.LOBBY_STATE_UPDATE,
            payload: sorted
        }));
    }

    onMessage(_message: string, sender: Party.Connection) {
        // Refresh manual: re-envía el snapshot al cliente que lo pide
        const sorted = Array.from(this.rooms.values())
            .sort((a, b) => roomScore(b) - roomScore(a))
            .slice(0, 50);

        sender.send(JSON.stringify({
            type: EVENTS.LOBBY_STATE_UPDATE,
            payload: sorted
        }));
    }

    async onRequest(req: Party.Request): Promise<Response> {
        // [S1-T5] CORS headers — allow cross-origin requests from the frontend domain
        const corsHeaders: Record<string, string> = {
            'Access-Control-Allow-Origin': (this.room.env.FRONTEND_URL as string) || '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Room-Secret',
        };

        // Handle OPTIONS preflight
        if (req.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        if (req.method !== 'POST') {
            return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
        }

        // [S1-T3] Secret validation — only room servers with the correct secret can publish heartbeats
        const roomSecret = req.headers.get('X-Room-Secret');
        const expectedSecret = this.room.env.LOBBY_SECRET as string | undefined;
        if (expectedSecret && roomSecret !== expectedSecret) {
            logger.warn('UNAUTHORIZED_HEARTBEAT', { hasSecret: !!roomSecret });
            return new Response('Unauthorized', { status: 401, headers: corsHeaders });
        }

        try {
            const raw = await req.json() as unknown;
            const parsed = RoomSnapshotSchema.safeParse(raw);

            if (!parsed.success) {
                logger.warn('INVALID_HEARTBEAT', { error: parsed.error.message });
                return new Response("Bad Request", { status: 400 });
            }

            const snapshot: RoomSnapshot = { ...parsed.data, lastUpdate: Date.now() };

            if (snapshot.currentPlayers === 0) {
                this.rooms.delete(snapshot.id);
                this.broadcast(EVENTS.ROOM_REMOVED, { id: snapshot.id });
                return new Response('OK', { status: 200, headers: corsHeaders });
            }

            const existed = this.rooms.has(snapshot.id);
            this.rooms.set(snapshot.id, snapshot);

            // Evento discreto: ROOM_ADDED o ROOM_UPDATED según si ya existía
            this.broadcast(existed ? EVENTS.ROOM_UPDATED : EVENTS.ROOM_ADDED, snapshot);

            return new Response('OK', { status: 200, headers: corsHeaders });
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            logger.error('HEARTBEAT_PROCESSING_FAILED', {}, error);
            return new Response('Internal Server Error', { status: 500, headers: corsHeaders });
        }
    }

    private broadcast(type: string, payload: unknown) {
        const msg = JSON.stringify({ type, payload });
        for (const conn of this.room.getConnections()) {
            conn.send(msg);
        }
    }
}

LobbyServer satisfies Party.Worker;
