import type * as Party from "partykit/server";
import { BaseEngine } from "../../shared/engines/base-engine";

export abstract class BaseHandler {
    protected room: Party.Room;
    protected engine: BaseEngine;

    constructor(room: Party.Room, engine: BaseEngine) {
        this.room = room;
        this.engine = engine;
    }
}
