import type * as Party from "partykit/server";
import { GameEngine } from "../shared/game-engine.js";
import { RoomState } from "../shared/types.js";
import { EVENTS } from "../shared/consts.js"; // Import Consolidado
import { sendError } from "./utils/broadcaster";
import { ConnectionHandler } from "./handlers/connection";
import { PlayerHandler } from "./handlers/player";
import { GameHandler } from "./handlers/game";
import { VotingHandler } from "./handlers/voting";

const STORAGE_KEY = "room_state_v1";

export default class Server implements Party.Server {
    options: Party.ServerOptions = {
        hibernate: true,
    };

    room: Party.Room;
    engine: GameEngine;

    // Handlers
    connectionHandler: ConnectionHandler;
    playerHandler: PlayerHandler;
    gameHandler: GameHandler;
    votingHandler: VotingHandler;

    constructor(room: Party.Room) {
        this.room = room;
        this.engine = new GameEngine(room.id, (newState) => {
            // [Broadcast Bridge]
            // When the engine changes state internally (e.g. timeout), notify all clients.
            this.room.broadcast(JSON.stringify({ type: EVENTS.UPDATE_STATE, payload: newState }));
        });

        // Instantiate Handlers
        this.connectionHandler = new ConnectionHandler(room, this.engine);
        this.playerHandler = new PlayerHandler(room, this.engine);
        this.gameHandler = new GameHandler(room, this.engine);
        this.votingHandler = new VotingHandler(room, this.engine);
    }

    async onStart() {
        try {
            const stored = await this.room.storage.get<RoomState>(STORAGE_KEY);
            if (stored) {
                console.log(`[Hydrate] Loaded state for room ${this.room.id}`);
                this.engine['state'] = stored;
            }
        } catch (err) {
            console.error(`[CRITICAL] Failed to load state for room ${this.room.id}. Resetting.`, err);
            // Engine is already fresh from constructor, so we just don't hydrate it.
            // Possibly persist the empty state to overwrite corrupt data?
            // Safer to just let it start fresh and overwrite on next action.
        }
    }

    async onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
        // CANCEL AUTO-DESTRUCT if a human connects
        await this.room.storage.deleteAlarm();

        await this.connectionHandler.handleConnect(connection, ctx);
    }

    async onMessage(message: string, sender: Party.Connection) {
        try {
            const data = JSON.parse(message);
            const { type, payload } = data;

            // 1. Recuperar identidad
            const state = sender.state as { userId: string } | null;
            if (state && state.userId) {
                // 2. Reparar el mapa del engine antes de procesar nada
                this.engine.players.reconnect(this.engine.getState(), sender.id, state.userId);
            }

            console.log(`[Message] ${type} from ${sender.id}`);

            switch (type) {
                // --- Game Logic ---
                case EVENTS.START_GAME:
                    await this.gameHandler.handleStartGame(sender);
                    break;

                case EVENTS.STOP_ROUND:
                    await this.gameHandler.handleStopRound(payload, sender);
                    break;

                case EVENTS.UPDATE_ANSWERS:
                    await this.gameHandler.handleUpdateAnswers(payload, sender);
                    break;

                case EVENTS.SUBMIT_ANSWERS:
                    await this.gameHandler.handleSubmitAnswers(payload, sender);
                    break;

                // --- Voting Logic ---
                case EVENTS.TOGGLE_VOTE:
                    await this.votingHandler.handleVote(payload, sender);
                    break;

                case EVENTS.CONFIRM_VOTES:
                    await this.votingHandler.handleConfirmVotes(sender);
                    break;

                // --- Admin Logic ---
                case EVENTS.UPDATE_CONFIG:
                    await this.playerHandler.handleUpdateSettings(payload, sender);
                    break;

                case EVENTS.KICK_PLAYER:
                    await this.playerHandler.handleKick(payload, sender);
                    break;

                // --- Lifecycle ---
                case EVENTS.RESTART_GAME:
                    // Needs Handler Implementation if not already present or direct?
                    // GameHandler doesn't expose restart yet? Check shared/game-engine.ts has `restartGame`.
                    // Let's assume GameHandler or BaseHandler might expose it, or I add it.
                    // The original switch case didn't show RESTART_GAME?
                    // Wait, `shared/types` has RESTART_GAME.
                    // Original code onMessage switch didn't show it?
                    // Looking at original file... No, it wasn't there!
                    // But `shared/types.ts` had it.
                    // I should probably add it if it's expected, but for "Diamond Polish" I stick to existing behavior mostly unless instructed.
                    // However, the instruction said "Actualiza party/server.ts y todos los archivos en party/handlers/ para usar las nuevas constantes/enums".
                    // If it wasn't there, I won't add it unless I see a handler for it.
                    // Leaving it out for now to avoid breaking changes if implementation is missing.
                    // Wait, `PONG` was there.
                    break;

                case "PONG": // Keep PONG as string or add to consts? Usually keep PONG/PING separate/internal.
                    return;

                default:
                    console.warn(`Unknown message type: ${type}`);
            }

            // Note: Handlers are now responsible for Persist & Broadcast.
            // But Alarms still need to be scheduled if state changes imply it.
            // Ideally, handlers should return checking if alarms needed, or we just check every time.
            // For Safety/Simplicity in Phase 5, let's trigger alarm check here using current state.
            await this.scheduleAlarms(this.engine['state']);

        } catch (err) {
            console.error(`[CRITICAL ERROR] Message failed:`, err);
            sendError(sender, (err as Error).message || "Unknown error processing request");
        }
    }

    async scheduleAlarms(state: RoomState) {
        const now = Date.now();
        let nextTarget: number | null = null;

        if (state.status === 'PLAYING' && state.timers.roundEndsAt) {
            nextTarget = state.timers.roundEndsAt;
        } else if (state.status === 'REVIEW' && state.timers.votingEndsAt) {
            nextTarget = state.timers.votingEndsAt;
        } else if (state.status === 'RESULTS' && state.timers.resultsEndsAt) {
            nextTarget = state.timers.resultsEndsAt;
        }

        if (nextTarget && nextTarget > now) {
            // Only set if different? PartyKit optimizes usually.
            // console.log(`⏰ Watchdog scheduled for room ${this.room.id}`);
            await this.room.storage.setAlarm(nextTarget);
        }
    }

    async onAlarm() {
        // [AUTO-WIPE] Check for inactivity
        const activeConnections = [...this.room.getConnections()].length;
        if (activeConnections === 0) {
            console.log(`[Auto-Wipe] Room ${this.room.id} purged due to inactivity (10m).`);
            await this.room.storage.deleteAll();
            this.engine = new GameEngine(this.room.id); // Reset RAM
            return;
        }

        console.log(`⏰ Watchdog triggered for room ${this.room.id}.`);

        // 1. Check for Zombies (Hard Delete)
        // If changed, engine calls onGameStateChange -> we persist/broadcast via bridge
        const zombiesPurged = this.engine.checkInactivePlayers();
        if (zombiesPurged) {
            console.log(`[SERVER] Zombies purged in ${this.room.id}`);
            await this.room.storage.put(STORAGE_KEY, this.engine.getState());
            // Broadcast is handled by engine callback
        }

        // 2. Schedule next alarms if needed (e.g. for Round/Vote timers)
        // Note: RoundManager uses setTimeout, but we might want redundancy or other checks here.
    }

    onClose(connection: Party.Connection) {
        this.connectionHandler.handleClose(connection);

        // ZOMBIE ALARM: Schedule cleanup check in 60s
        // If they reconnect before this, they are restored.
        // If they don't, this alarm will purge them.
        this.room.storage.setAlarm(Date.now() + 60000);

        // START SELF-DESTRUCT TIMER if room is empty (override/add logic)
        const connections = [...this.room.getConnections()];
        if (connections.length === 0) {
            console.log(`[Auto-Wipe] Room ${this.room.id} is empty. Self-destruct in 10m.`);
            // 10 minutes in milliseconds
            this.room.storage.setAlarm(Date.now() + 10 * 60 * 1000);
        }
    }
}
