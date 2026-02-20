import type * as Party from "partykit/server";
import { BaseEngine } from "../shared/engines/base-engine.js";
import { TutiEngine } from "../shared/engines/tuti-engine.js";
import { ImpostorEngine } from "../shared/engines/impostor-engine.js";
import { RoomState, RoomSnapshot } from "../shared/types.js";
import { DictionaryManager } from "../shared/dictionaries/manager";
import { EVENTS, APP_VERSION } from "../shared/consts.js";
import { logger } from "../shared/utils/logger";
import { RateLimiter } from "./utils/rate-limiter";
import { ConnectionHandler } from "./handlers/connection";
import { PlayerHandler } from "./handlers/player";
import { GameHandler } from "./handlers/game";
import { VotingHandler } from "./handlers/voting";

import { compare } from "fast-json-patch";

const STORAGE_KEY = "room_state_v1";
const AUTH_TOKENS_KEY = "auth_tokens_v1";

// =============================================
// Engine Factory — Loads the correct game mode
// =============================================
function createEngine(
    mode: string,
    roomId: string,
    onStateChange?: (state: RoomState) => void
): BaseEngine {
    switch (mode) {
        case 'IMPOSTOR':
            return new ImpostorEngine(roomId, onStateChange);
        case 'CLASSIC':
        default:
            return new TutiEngine(roomId, onStateChange);
    }
}

export default class Server implements Party.Server {
    options: Party.ServerOptions = {
        hibernate: true,
    };

    room: Party.Room;
    engine: BaseEngine;

    // Security: Auth Tokens (UserId -> SessionToken)
    authTokens = new Map<string, string>();

    // Optimization: Per-Connection Delta Sync (State Masking)
    private previousStates = new Map<string, RoomState>();

    // Handlers
    connectionHandler: ConnectionHandler;
    playerHandler: PlayerHandler;
    gameHandler: GameHandler;
    votingHandler: VotingHandler;

    // Utilites
    private rateLimiter = new RateLimiter();

    // Write-Behind: Debounced Persistence
    private saveTimeout: ReturnType<typeof setTimeout> | null = null;
    // [Phoenix Lobby] True Heartbeat Interval
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    // Chat State
    messages: import('../shared/types').ChatMessage[] = [];

    // Reusable state change callback for Engine Factory
    private onStateChange = (newState: RoomState) => {
        // 1. Inmediato: Per-connection broadcast with State Masking
        this.broadcastStateDelta(newState);

        // 2. Diferido: Write-Behind a disco (max 1 vez cada 5s)
        if (!this.saveTimeout) {
            this.saveTimeout = setTimeout(async () => {
                await this.room.storage.put(STORAGE_KEY, this.engine.getState());
                this.saveTimeout = null;
            }, 5000);
        }

        // 3. [Phoenix Lobby] Heartbeat RPC to Orchestrator (fire-and-forget)
        if (newState.config.isPublic) {
            const snapshot: RoomSnapshot = {
                id: this.room.id,
                hostName: newState.players.find(p => p.isHost)?.name || 'Host',
                currentPlayers: newState.players.length,
                maxPlayers: newState.config.maxPlayers,
                status: newState.status,
                lastUpdate: Date.now()
            };
            this.room.context.parties.lobby.get("global").fetch("/heartbeat", {
                method: "POST",
                body: JSON.stringify(snapshot),
                headers: { "Content-Type": "application/json" }
            }).catch(e => logger.error('HEARTBEAT_FAILED', { roomId: this.room.id }, e instanceof Error ? e : new Error(String(e))));
        }
    };

    constructor(room: Party.Room) {
        this.room = room;

        // Factory Pattern: Engine is created as TutiEngine by default.
        // If the stored state has mode='IMPOSTOR', it will be re-created in onStart().
        this.engine = createEngine('CLASSIC', room.id, this.onStateChange);

        // Instantiate Handlers (typed against BaseEngine)
        this.connectionHandler = new ConnectionHandler(room, this.engine, this.authTokens);
        this.playerHandler = new PlayerHandler(room, this.engine);
        this.gameHandler = new GameHandler(room, this.engine);
        this.votingHandler = new VotingHandler(room, this.engine);
    }

    async onStart() {
        try {
            // 1. Load Game State
            const stored = await this.room.storage.get<RoomState>(STORAGE_KEY);
            if (stored) {
                logger.info('STATE_HYDRATED', { roomId: this.room.id });

                // Factory Pattern: Re-create engine if stored mode differs
                if (stored.config.mode === 'IMPOSTOR') {
                    this.engine = createEngine('IMPOSTOR', this.room.id, this.onStateChange);
                    // Re-wire handlers to new engine
                    this.connectionHandler = new ConnectionHandler(this.room, this.engine, this.authTokens);
                    this.playerHandler = new PlayerHandler(this.room, this.engine);
                    this.gameHandler = new GameHandler(this.room, this.engine);
                    this.votingHandler = new VotingHandler(this.room, this.engine);
                }

                this.engine.hydrate(stored);
            }

            // 2. Load Auth Tokens
            const storedTokens = await this.room.storage.get<Record<string, string>>(AUTH_TOKENS_KEY);
            if (storedTokens) {
                logger.info('TOKENS_HYDRATED', { roomId: this.room.id, count: Object.keys(storedTokens).length });
                this.authTokens = new Map(Object.entries(storedTokens));
            }

            // 3. [Phoenix Lobby] Start True Heartbeat
            this.startHeartbeat();

            // 4. [Phoenix CDN] Hydrate dictionaries from CDN
            await DictionaryManager.hydrate();
            logger.info('DICTIONARIES_HYDRATED', { source: 'CDN', roomId: this.room.id });
        } catch (err) {
            logger.error('ROOM_HYDRATION_FAILED', { roomId: this.room.id }, err instanceof Error ? err : new Error(String(err)));
        }
    }

    /**
     * Per-Connection Delta Broadcast with State Masking.
     * Instead of room.broadcast() (global), we iterate each connection
     * and send personalized JSON Patches via engine.getClientState(userId).
     */
    private broadcastStateDelta(_newState: RoomState) {
        for (const conn of this.room.getConnections()) {
            const userId = (conn.state as any)?.userId || conn.id;
            const clientState = this.engine.getClientState(userId);

            const prevState = this.previousStates.get(conn.id);
            if (!prevState) {
                // First broadcast for this connection — send full state
                conn.send(JSON.stringify({ type: EVENTS.UPDATE_STATE, payload: clientState }));
            } else {
                const patches = compare(prevState, clientState);
                if (patches.length > 0) {
                    conn.send(JSON.stringify({
                        type: EVENTS.PATCH_STATE,
                        payload: patches
                    }));
                }
            }

            // Update per-connection baseline (Deep Copy)
            this.previousStates.set(conn.id, JSON.parse(JSON.stringify(clientState)));
        }
    }

    // [Phoenix Lobby] True Heartbeat — Keeps room alive in Lobby
    private startHeartbeat() {
        if (this.heartbeatInterval) return;

        logger.info('HEARTBEAT_STARTED', { roomId: this.room.id });

        this.heartbeatInterval = setInterval(() => {
            try {
                const state = this.engine.getState();
                if (state.config.isPublic) {
                    logger.info('HEARTBEAT_SENDING', { roomId: this.room.id, players: state.players.length });

                    const snapshot: RoomSnapshot = {
                        id: this.room.id,
                        hostName: state.players.find(p => p.isHost)?.name || 'Host',
                        currentPlayers: state.players.length,
                        maxPlayers: state.config.maxPlayers,
                        status: state.status,
                        lastUpdate: Date.now()
                    };
                    this.room.context.parties.lobby.get("global").fetch("/heartbeat", {
                        method: "POST",
                        body: JSON.stringify(snapshot),
                        headers: { "Content-Type": "application/json" }
                    }).catch(e => logger.error('HEARTBEAT_FETCH_FAILED', { error: String(e) }, e instanceof Error ? e : new Error(String(e))));
                }
            } catch (err) {
                logger.error('HEARTBEAT_CRASH', { roomId: this.room.id }, err instanceof Error ? err : new Error(String(err)));
            }
        }, 10000);
    }

    async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
        try {
            // [Phoenix Lobby] Ensure heartbeat is running (wakes up hibernated room)
            this.startHeartbeat();

            // CANCEL AUTO-DESTRUCT if a human connects
            await this.room.storage.deleteAlarm();

            // 0. Send Version
            const versionMsg = JSON.stringify({
                type: EVENTS.SYSTEM_VERSION,
                payload: { version: APP_VERSION }
            });
            conn.send(versionMsg);

            // 1. Handle Identity FIRST (adds/reconnects player in engine)
            await this.connectionHandler.handleConnect(conn, ctx);

            // 2. Send current Game State to NEW client (AFTER player is added)
            //    AND register the baseline to prevent duplicate UPDATE_STATE from broadcastStateDelta
            const userId = (conn.state as any)?.userId || conn.id;
            const initialClientState = this.engine.getClientState(userId);
            conn.send(JSON.stringify({
                type: EVENTS.UPDATE_STATE,
                payload: initialClientState
            }));
            this.previousStates.set(conn.id, JSON.parse(JSON.stringify(initialClientState)));

            // 3. Send Chat History
            conn.send(JSON.stringify({
                type: EVENTS.CHAT_HISTORY,
                payload: this.messages
            }));

            // 4. Unified Delta Broadcast — sends PATCHES (not full state) to existing clients
            this.broadcastStateDelta(this.engine.getState());
        } catch (err) {
            logger.error('ON_CONNECT_FAILED', { connectionId: conn.id, roomId: this.room.id }, err instanceof Error ? err : new Error(String(err)));
            conn.close(1011, 'Internal Server Error');
        }
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
                case EVENTS.UPDATE_CONFIG: {
                    const oldMode = this.engine.getState().config.mode;
                    await this.playerHandler.handleUpdateSettings(payload, sender);
                    const newMode = this.engine.getState().config.mode;

                    if (oldMode !== newMode) {
                        console.log(`[HOT-SWAP] Cambiando motor de ${oldMode} a ${newMode}`);
                        const currentState = this.engine.getState();
                        this.engine = createEngine(newMode, this.room.id, this.onStateChange);
                        this.engine.hydrate(currentState);

                        // Re-instanciar los handlers inyectando el nuevo motor
                        this.connectionHandler = new ConnectionHandler(this.room, this.engine, this.authTokens);
                        this.playerHandler = new PlayerHandler(this.room, this.engine);
                        this.gameHandler = new GameHandler(this.room, this.engine);
                        this.votingHandler = new VotingHandler(this.room, this.engine);

                        // Forzar broadcast inmediato del estado (enmascarado por el nuevo motor)
                        this.broadcastStateDelta(this.engine.getState());
                    }
                    break;
                }

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
                        return;
                    }

                    const rawText = (payload as { text?: string }).text;
                    if (!rawText || typeof rawText !== 'string') return;

                    // 2. Sanitization (The Filter)
                    const trimmed = rawText.trim();
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

                    // Broadcast chat (no masking needed for chat messages)
                    this.room.broadcast(JSON.stringify({
                        type: EVENTS.CHAT_NEW,
                        payload: chatMsg
                    }));
                    break;
                }

                case "PONG":
                    return;

                // [Phoenix CDN] Admin: Force reload dictionaries
                case EVENTS.ADMIN_RELOAD_DICTS: {
                    await DictionaryManager.hydrate(true);
                    const adminUserId = (sender.state as any)?.userId || sender.id;
                    logger.info('ADMIN_FORCED_DICTIONARY_RELOAD', { roomId: this.room.id, userId: adminUserId });
                    return;
                }

                default:
                    console.warn(`Unknown message type: ${type}`);
            }

            // === UNIFIED DELTA SYNC ===
            // After any handler mutates the engine, broadcast the delta to all clients.
            // Exceptions: PONG (no-op), CHAT_SEND (uses its own chat broadcast), ADMIN_RELOAD_DICTS (no state change)
            this.broadcastStateDelta(this.engine.getState());

            await this.scheduleAlarms(this.engine.getState());

        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            logger.error('ON_MESSAGE_FAILED', { roomId: this.room.id, connectionId: sender.id }, error);
            sender.send(JSON.stringify({
                type: EVENTS.SERVER_ERROR,
                payload: { message: 'Internal server error processing message' }
            }));
        }
    }

    async scheduleAlarms(state: RoomState) {
        const now = Date.now();
        let nextTarget: number | null = null;

        // Classic mode phases
        if (state.status === 'PLAYING' && state.timers.roundEndsAt) {
            nextTarget = state.timers.roundEndsAt;
        } else if (state.status === 'REVIEW' && state.timers.votingEndsAt) {
            nextTarget = state.timers.votingEndsAt;
        } else if (state.status === 'RESULTS' && state.timers.resultsEndsAt) {
            nextTarget = state.timers.resultsEndsAt;

            // Impostor mode phases
        } else if (state.status === 'ROLE_REVEAL' && state.timers.roundEndsAt) {
            nextTarget = state.timers.roundEndsAt;
        } else if (state.status === 'TYPING' && state.timers.roundEndsAt) {
            nextTarget = state.timers.roundEndsAt;
        } else if (state.status === 'VOTING' && state.timers.votingEndsAt) {
            nextTarget = state.timers.votingEndsAt;
        }
        // Note: RESULTS for Impostor also uses resultsEndsAt, already covered above

        if (nextTarget && nextTarget > now) {
            await this.room.storage.setAlarm(nextTarget);
        }
    }

    async onAlarm() {
        // [AUTO-WIPE] Check for inactivity
        const activeConnections = [...this.room.getConnections()].length;
        if (activeConnections === 0) {
            console.log('[Auto-Wipe] Room purged due to inactivity (10m).');
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
                this.saveTimeout = null;
            }
            await this.room.storage.deleteAll();
            // Reset engine via factory (default to CLASSIC for empty room)
            this.engine = createEngine('CLASSIC', 'purged-room');
            this.previousStates.clear();
            return;
        }

        console.log('⏰ Watchdog triggered (Anti-Freeze routines).');

        const zombiesPurged = this.engine.checkInactivePlayers();
        const stateMutatedByTimer = this.engine.handleTimeUp(); // Anti-Freeze: Execute late timeouts

        if (zombiesPurged || stateMutatedByTimer) {
            console.log(`[SERVER] State mutated by watchdog (Zombies: ${zombiesPurged}, AntiFreeze: ${stateMutatedByTimer})`);

            // Si el motor fue rescatado de la hibernación, forzamos un salvado y broadcast
            if (stateMutatedByTimer) {
                this.broadcastStateDelta(this.engine.getState());
            }
            await this.room.storage.put(STORAGE_KEY, this.engine.getState());
        }
    }

    onClose(connection: Party.Connection) {
        this.rateLimiter.cleanup(connection.id);
        this.connectionHandler.handleClose(connection);

        // Unified Delta Broadcast (notify remaining players)
        this.broadcastStateDelta(this.engine.getState());

        // Clean up per-connection state for State Masking
        this.previousStates.delete(connection.id);

        // ZOMBIE ALARM: Schedule cleanup check in 60s
        this.room.storage.setAlarm(Date.now() + 60000);

        // Check if room is now empty
        const connections = [...this.room.getConnections()];
        if (connections.length === 0) {
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
                this.saveTimeout = null;
            }
            this.room.storage.put(STORAGE_KEY, this.engine.getState());

            // [Phoenix Lobby] Stop Heartbeat to allow hibernation
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
                logger.info('HEARTBEAT_STOPPED', { roomId: this.room.id });
            }

            // Clear all per-connection baselines
            this.previousStates.clear();

            console.log(`[Auto-Wipe] Room ${this.room.id} is empty. Self-destruct in 10m.`);
            this.room.storage.setAlarm(Date.now() + 10 * 60 * 1000);
        }
    }
}
