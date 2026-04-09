import type * as Party from "partykit/server";
import { BaseEngine } from "../../shared/engines/base-engine";

export abstract class BaseHandler {
    protected room: Party.Room;
    protected engine: BaseEngine;

    constructor(room: Party.Room, engine: BaseEngine) {
        this.room = room;
        this.engine = engine;
    }

    /** [Deuda P2] Hot-Swap support: update engine reference without re-instantiation.
     *  Called by server.ts when game mode changes (e.g. CLASSIC → IMPOSTOR). */
    public setEngine(newEngine: BaseEngine): void {
        this.engine = newEngine;
    }
}
