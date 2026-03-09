import type * as Party from "partykit/server";
import { BaseEngine } from "../shared/engines/base-engine.js";
import { TutiEngine } from "../shared/engines/tuti-engine.js";
import { ImpostorEngine } from "../shared/engines/impostor-engine.js";
import { RoomState, RoomSnapshot } from "../shared/types.js";
import { ClientMessageSchema } from "../shared/schemas.js";
import { EVENTS, APP_VERSION } from "../shared/consts.js";
import { logger } from "../shared/utils/logger";
import { RateLimiter } from "./utils/rate-limiter";
import { ConnectionHandler } from "./handlers/connection";
import { PlayerHandler } from "./handlers/player";
import { GameHandler } from "./handlers/game";
import { VotingHandler } from "./handlers/voting";
import { ChatHandler } from "./handlers/chat";

import { compare } from "fast-json-patch";

const STORAGE_KEY = "room_state_v1";
const AUTH_TOKENS_KEY = "auth_tokens_v1";

// =============================================
// Engine Factory — Loads the correct game mode
// =============================================
import { SupabaseClient, createClient } from "@supabase/supabase-js";

function createEngine(
    supabase: SupabaseClient,
    mode: string,
    roomId: string,
    onStateChange?: (state: RoomState) => void
): BaseEngine {
    switch (mode) {
        case 'IMPOSTOR':
            return new ImpostorEngine(supabase, roomId, onStateChange);
        case 'CLASSIC':
        default:
            return new TutiEngine(supabase, roomId, onStateChange);
    }
}

export default class Server implements Party.Server {
    options: Party.ServerOptions = {
        hibernate: true,
    };

    room: Party.Room;
    engine: BaseEngine;
    private supabase: SupabaseClient;

    // Security: Auth Tokens (UserId -> SessionToken)
    authTokens = new Map<string, string>();

    // Optimization: Per-Connection Delta Sync (State Masking)
    private previousStates = new Map<string, RoomState>();

    // Handlers
    connectionHandler: ConnectionHandler;
    playerHandler: PlayerHandler;
    gameHandler: GameHandler;
    votingHandler: VotingHandler;
    chatHandler: ChatHandler;

    // Utilites
    private rateLimiter = new RateLimiter();

    // Write-Behind: Debounced Persistence
    private saveTimeout: ReturnType<typeof setTimeout> | null = null;
    // [Phoenix Lobby] True Heartbeat Interval
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    // [Sprint 1] Server-Authoritative Tick Loop
    private tickInterval: ReturnType<typeof setInterval> | null = null;

    // Chat State
    messages: import('../shared/types').ChatMessage[] = [];

    // Reusable state change callback for Engine Factory
    private onStateChange = (newState: RoomState) => {
        // 1. [Sprint 1] Tick Loop Phase Management — react to every phase transition
        this.manageTick(newState);

        // 2. Inmediato: Per-connection broadcast with State Masking
        this.broadcastStateDelta(newState);

        // 3. Schedule backup alarm for next phase (critical for hibernate recovery)
        this.scheduleAlarms(newState);

        // 4. Diferido: Write-Behind a disco (max 1 vez cada 5s)
        if (!this.saveTimeout) {
            this.saveTimeout = setTimeout(async () => {
                await this.room.storage.put(STORAGE_KEY, this.engine.getState());
                this.saveTimeout = null;
            }, 5000);
        }

        // 5. [Phoenix Lobby] Heartbeat RPC to Orchestrator (fire-and-forget)
        if (newState.config.isPublic) {
            const activeConnCount = Array.from(this.room.getConnections()).length;
            const snapshot: RoomSnapshot = {
                id: this.room.id,
                hostName: newState.players.find(p => p.isHost)?.name || 'Host',
                currentPlayers: activeConnCount,
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

        // Initialize Supabase Client using PartyKit Environment Variables
        const supabaseUrl = this.room.env.SUPABASE_URL as string;
        const supabaseKey = this.room.env.SUPABASE_ANON_KEY as string;
        this.supabase = createClient(supabaseUrl, supabaseKey);

        // Factory Pattern: Engine is created as TutiEngine by default.
        // If the stored state has mode='IMPOSTOR', it will be re-created in onStart().
        this.engine = createEngine(this.supabase, 'CLASSIC', room.id, this.onStateChange);

        // Instantiate Handlers (typed against BaseEngine)
        this.connectionHandler = new ConnectionHandler(room, this.engine, this.authTokens, this.messages);
        this.playerHandler = new PlayerHandler(room, this.engine);
        this.gameHandler = new GameHandler(room, this.engine);
        this.votingHandler = new VotingHandler(room, this.engine);
        this.chatHandler = new ChatHandler(this.engine, this.rateLimiter, this.messages, this.room);
    }

    async onStart() {
        try {
            // 1. Load Game State
            const stored = await this.room.storage.get<RoomState>(STORAGE_KEY);
            if (stored) {
                logger.info('STATE_HYDRATED', { roomId: this.room.id });

                // Factory Pattern: Re-create engine if stored mode differs
                if (stored.config.mode === 'IMPOSTOR') {
                    this.engine = createEngine(this.supabase, 'IMPOSTOR', this.room.id, this.onStateChange);
                    // Re-wire handlers to new engine
                    this.connectionHandler = new ConnectionHandler(this.room, this.engine, this.authTokens, this.messages);
                    this.playerHandler = new PlayerHandler(this.room, this.engine);
                    this.gameHandler = new GameHandler(this.room, this.engine);
                    this.votingHandler = new VotingHandler(this.room, this.engine);
                    this.chatHandler = new ChatHandler(this.engine, this.rateLimiter, this.messages, this.room);
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
        // [Refactor C] - Versionado Estricto: Avanzar vector de integridad siempre que se emite.
        this.engine.getState().stateVersion++;

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
                        payload: {
                            stateVersion: clientState.stateVersion,
                            patches: patches
                        }
                    }));
                }
            }

            // Update per-connection baseline (Deep Copy)
            this.previousStates.set(conn.id, JSON.parse(JSON.stringify(clientState)));
        }

        // Sprint 3.4: Whisper private role assignment on ROLE_REVEAL transition
        // This runs AFTER the public broadcast so private payloads are never mixed in
        if (this.engine.getState().status === 'ROLE_REVEAL' && this.engine instanceof ImpostorEngine) {
            const impostorEngine = this.engine as ImpostorEngine;
            for (const conn of this.room.getConnections()) {
                const userId = (conn.state as any)?.userId || conn.id;
                const privatePayload = impostorEngine.getPrivateRolePayload(userId);
                conn.send(JSON.stringify({
                    type: EVENTS.PRIVATE_ROLE_ASSIGNMENT,
                    payload: privatePayload
                }));
            }
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

    // [Sprint 1] Tick Loop Director: called on every state mutation.
    // Inspects the new game status and starts/stops the tick loop accordingly.
    // Using the existing timers (endsAt timestamps) to calculate remaining time precisely.
    private manageTick(state: RoomState) {
        const now = Date.now();

        if (state.status === 'PLAYING' && state.timers.roundEndsAt) {
            const msLeft = state.timers.roundEndsAt - now;
            if (msLeft > 0 && !this.tickInterval) {
                this.startTick(msLeft);
            }
        } else if (state.status === 'REVIEW' && state.timers.votingEndsAt) {
            const msLeft = state.timers.votingEndsAt - now;
            if (msLeft > 0 && !this.tickInterval) {
                this.startTick(msLeft);
            }
        } else if (state.status === 'TYPING' && state.timers.roundEndsAt) {
            // Impostor mode: TYPING phase
            const msLeft = state.timers.roundEndsAt - now;
            if (msLeft > 0 && !this.tickInterval) {
                this.startTick(msLeft);
            }
        } else if (state.status === 'VOTING' && state.timers.votingEndsAt) {
            // Impostor mode: VOTING phase
            const msLeft = state.timers.votingEndsAt - now;
            if (msLeft > 0 && !this.tickInterval) {
                this.startTick(msLeft);
            }
        } else {
            // Any non-timed phase: LOBBY, RESULTS, GAME_OVER, ROLE_REVEAL → stop the tick
            this.stopTick();
        }
    }

    // [Sprint 1] Server-Authoritative Tick Loop
    // Starts a 1s interval that decrements remainingTime and broadcasts it to ALL
    // clients via the existing delta-sync pipeline.
    // Re-entrant safe: always calls stopTick() first to prevent double-tick bugs.
    private startTick(durationMs: number) {
        this.stopTick(); // Re-entrant safety: clear any previous interval before starting
        let remaining = Math.ceil(durationMs / 1000);
        console.log(`[Tick Loop] Starting — ${remaining}s`);

        this.tickInterval = setInterval(() => {
            remaining--;
            this.engine.tick(remaining);
            this.broadcastStateDelta(this.engine.getState());

            if (remaining <= 0) {
                // The RoundManager's setTimeout will handle the actual phase transition.
                // We stop the tick loop here to avoid unnecessary broadcasts post-transition.
                this.stopTick();
            }
        }, 1000);
    }

    // Stops and cleans up the Tick Loop. Safe to call even if no tick is running.
    private stopTick() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
            console.log('[Tick Loop] Stopped.');
        }
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
            // [ZOD SHIELD] - Zero-Trust Network Validation
            const rawData = JSON.parse(message);

            // Bypass PONG heartbeats locally to prevent zod bloat on pings
            if (rawData.type === 'PONG') return;


            const result = ClientMessageSchema.safeParse(rawData);

            if (!result.success) {
                logger.warn('ZERO_TRUST_DROP', { sender: sender.id, type: rawData.type, error: result.error.message });
                return;
            }

            const messageContext = result.data;
            const type = messageContext.type;
            const payload = 'payload' in messageContext ? messageContext.payload : undefined;

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
                    await this.gameHandler.handleStopRound(payload as any, sender);
                    break;

                case EVENTS.UPDATE_ANSWERS:
                    await this.gameHandler.handleUpdateAnswers(payload as any, sender);
                    break;

                case EVENTS.SUBMIT_ANSWERS:
                    await this.gameHandler.handleSubmitAnswers(payload as any, sender);
                    break;

                // --- Voting Logic ---
                case EVENTS.TOGGLE_VOTE:
                    await this.votingHandler.handleVote(payload as any, sender);
                    break;

                case EVENTS.CONFIRM_VOTES:
                    await this.votingHandler.handleConfirmVotes(sender);
                    break;

                // --- Admin Logic ---
                case EVENTS.UPDATE_CONFIG: {
                    const oldMode = this.engine.getState().config.mode;
                    await this.playerHandler.handleUpdateSettings(payload as any, sender);
                    const newMode = this.engine.getState().config.mode;

                    if (oldMode !== newMode) {
                        console.log(`[HOT-SWAP] Cambiando motor de ${oldMode} a ${newMode}`);
                        const currentState = this.engine.getState();
                        this.engine = createEngine(this.supabase, newMode, this.room.id, this.onStateChange);
                        this.engine.hydrate(currentState);

                        // Re-instanciar los handlers inyectando el nuevo motor
                        this.connectionHandler = new ConnectionHandler(this.room, this.engine, this.authTokens, this.messages);
                        this.playerHandler = new PlayerHandler(this.room, this.engine);
                        this.gameHandler = new GameHandler(this.room, this.engine);
                        this.votingHandler = new VotingHandler(this.room, this.engine);
                        this.chatHandler = new ChatHandler(this.engine, this.rateLimiter, this.messages, this.room);

                        // Forzar broadcast inmediato del estado (enmascarado por el nuevo motor)
                        this.broadcastStateDelta(this.engine.getState());
                    }
                    break;
                }

                case EVENTS.KICK_PLAYER:
                    await this.playerHandler.handleKick(payload as any, sender);
                    break;

                case EVENTS.RESTART_GAME:
                    await this.gameHandler.handleRestartGame(sender);
                    break;

                case EVENTS.EXIT_GAME:
                    this.connectionHandler.handleExitGame(sender);
                    break;

                case EVENTS.REQUEST_FULL_SYNC: {
                    const userId = (sender.state as any)?.userId || sender.id;
                    const fullState = this.engine.getClientState(userId);
                    sender.send(JSON.stringify({ type: EVENTS.UPDATE_STATE, payload: fullState }));
                    this.previousStates.set(sender.id, JSON.parse(JSON.stringify(fullState)));
                    break;
                }

                // --- CHAT SYSTEM (Phase 2.A + 2.E Security) ---
                case EVENTS.CHAT_SEND: {
                    await this.chatHandler.handleChat(payload as any, sender);
                    break;
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
            console.log('💥 Protocolo de autodestrucción: Sala vacía eliminada del disco.');
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
                this.saveTimeout = null;
            }
            await this.room.storage.deleteAll();
            // Reset engine via factory (default to CLASSIC for empty room)
            this.engine = createEngine(this.supabase, 'CLASSIC', 'purged-room');
            this.previousStates.clear();
            return;
        }

        console.log('⏰ Watchdog triggered (Anti-Freeze routines).');

        const zombiesPurged = this.engine.checkInactivePlayers();
        const stateMutatedByTimer = this.engine.handleTimeUp(); // Anti-Freeze: Execute late timeouts

        if (zombiesPurged || stateMutatedByTimer) {
            console.log(`[SERVER] State mutated by watchdog (Zombies: ${zombiesPurged}, AntiFreeze: ${stateMutatedByTimer})`);

            if (stateMutatedByTimer) {
                // [Sprint 1] If a phase timer expired during hibernation, resume the tick loop
                // for any newly started timed phase (e.g. REVIEW after forced PLAYING→REVIEW)
                const state = this.engine.getState();
                if (state.status === 'REVIEW' && state.timers.votingEndsAt) {
                    const msLeft = state.timers.votingEndsAt - Date.now();
                    if (msLeft > 0) this.startTick(msLeft);
                } else if (state.status === 'PLAYING' && state.timers.roundEndsAt) {
                    const msLeft = state.timers.roundEndsAt - Date.now();
                    if (msLeft > 0) this.startTick(msLeft);
                }
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

            // [Sprint 1] Stop Tick Loop — no players means no need to count down
            this.stopTick();

            // [Sprint 4] Death Hook — Release all GlobalCache references
            // Prevents zombie RAM when rooms hibernate with no players.
            this.engine.dispose();

            // [Phoenix Lobby] Stop Heartbeat to allow hibernation
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
                logger.info('HEARTBEAT_STOPPED', { roomId: this.room.id });
            }

            // Clear all per-connection baselines
            this.previousStates.clear();

            console.log(`[Auto-Wipe] Room ${this.room.id} is empty. Self-destruct in 120s.`);
            this.room.storage.setAlarm(Date.now() + 120 * 1000);
        }
    }
}
