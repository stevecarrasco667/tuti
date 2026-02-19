import type * as Party from "partykit/server";
import { BaseEngine } from "../shared/engines/base-engine";

export interface HandlerContext {
    engine: BaseEngine;
    room: Party.Room;
    sender?: Party.Connection;
}
