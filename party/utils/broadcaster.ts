import type * as Party from "partykit/server";

export function sendError(connection: Party.Connection, message: string) {
    connection.send(JSON.stringify({
        type: "ERROR",
        payload: { message }
    }));
}
