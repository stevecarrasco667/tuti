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

    /** [Sprint H1 — SEC-2] Defense-in-depth host check at the handler layer.
     *  Returns true if the sender is the current Host. Used by Game/Player handlers
     *  to reject unauthorized admin actions BEFORE they reach the engine. */
    protected isHost(sender: Party.Connection): boolean {
        const userId = this.engine.players.getPlayerId(sender.id);
        if (!userId) return false;
        const player = this.engine.getState().players.find(p => p.id === userId);
        return !!player?.isHost;
    }
}
