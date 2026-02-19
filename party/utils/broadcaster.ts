import type * as Party from "partykit/server";
import { RoomState } from "../../shared/types";
import { BaseEngine } from "../../shared/engines/base-engine";

/**
 * Per-connection broadcast with State Masking.
 * Each player receives their personalized view of the state
 * via engine.getClientState(userId).
 */
export function broadcastState(room: Party.Room, _state: RoomState, engine: BaseEngine) {
    for (const conn of room.getConnections()) {
        const userId = (conn.state as any)?.userId || conn.id;
        const clientState = engine.getClientState(userId);
        conn.send(JSON.stringify({
            type: "UPDATE_STATE",
            payload: clientState
        }));
    }
}

export function sendError(connection: Party.Connection, message: string) {
    connection.send(JSON.stringify({
        type: "ERROR",
        payload: { message }
    }));
}
