import type * as Party from "partykit/server";
import { GameEngine } from "../shared/game-engine.js";
import { RoomState } from "../shared/types.js";
import { EVENTS, APP_VERSION } from "../shared/consts.js"; // Import Consolidado
import { sendError } from "./utils/broadcaster";
import { RateLimiter } from "./utils/rate-limiter";
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

    // Utilites
    private rateLimiter = new RateLimiter(); // 5 burst, 1 refill/2s

    // Chat State
    messages: import('../shared/types').ChatMessage[] = [];

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

    async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
        // CANCEL AUTO-DESTRUCT if a human connects
        await this.room.storage.deleteAlarm();

        // 0. Send Version
        const versionMsg = JSON.stringify({
            type: EVENTS.SYSTEM_VERSION,
            payload: { version: APP_VERSION }
        });
        conn.send(versionMsg);

        // 1. Send current Game State
        conn.send(JSON.stringify({
            type: EVENTS.UPDATE_STATE,
            payload: this.engine.getState()
        }));

        // 2. Send Chat History
        conn.send(JSON.stringify({
            type: EVENTS.CHAT_HISTORY,
            payload: this.messages
        }));

        // 3. Handle Identity via ConnectionHandler
        await this.connectionHandler.handleConnect(conn, ctx);
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

                case EVENTS.EXIT_GAME:
                    this.connectionHandler.handleExitGame(sender);
                    break;

                // --- CHAT SYSTEM (Phase 2.A + 2.E Security) ---
                case EVENTS.CHAT_SEND: {
                    // 1. Rate Limiting (The Wall)
                    if (!this.rateLimiter.checkLimit(sender.id)) {
                        // Silent drop or debug log
                        // console.warn(`[Spam Blocked] ${sender.id}`);
                        return;
                    }

                    const rawText = (payload as { text?: string }).text;
                    if (!rawText || typeof rawText !== 'string') return;

                    // 2. Sanitization (The Filter)
                    const trimmed = rawText.trim();
                    // Hard cap 140 chars
                    if (trimmed.length === 0) return;
                    const finalText = trimmed.slice(0, 140);

                    const senderId = (sender.state as any)?.userId || sender.id;
                    const player = this.engine.getState().players.find(p => p.id === senderId);
                    const senderName = player ? player.name : 'Voz Misteriosa';

                    const chatMsg: import('../shared/types').ChatMessage = {
                        id: `${senderId}-${Date.now()}`,
                        senderId,
                        senderName,
                        text: finalText,
                        type: 'USER',
                        timestamp: Date.now()
                    };

                    // Store & Limit
                    this.messages.push(chatMsg);
                    if (this.messages.length > 50) this.messages.shift();

                    // Broadcast
                    this.room.broadcast(JSON.stringify({
                        type: EVENTS.CHAT_NEW,
                        payload: chatMsg
                    }));
                    break;
                }

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
        this.rateLimiter.cleanup(connection.id);
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
