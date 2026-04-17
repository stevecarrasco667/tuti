import type * as Party from "partykit/server";
import { BaseEngine } from "../shared/engines/base-engine.js";
import { TutiEngine } from "../shared/engines/tuti-engine.js";
import { ImpostorEngine, ImpostorSecretState } from "../shared/engines/impostor-engine.js";
import { RoomState, RoomSnapshot } from "../shared/types.js";
import { ClientMessageSchema } from "../shared/schemas.js";
import { EVENTS, APP_VERSION, GAME_CONSTS } from "../shared/consts.js";
import { logger } from "../shared/utils/logger";
import { RateLimiter } from "./utils/rate-limiter";
import { ConnectionHandler } from "./handlers/connection";
import { PlayerHandler } from "./handlers/player";
import { GameHandler } from "./handlers/game";
import { VotingHandler } from "./handlers/voting";
import { ChatHandler } from "./handlers/chat";
import { TickManager } from "./managers/tick-manager";
import { AlarmManager } from "./managers/alarm-manager";

import { compare } from "fast-json-patch";

const STORAGE_KEY = "room_state_v1";
const AUTH_TOKENS_KEY = "auth_tokens_v1";
// [Sprint P1 — Fase 3] Storage key for ImpostorEngine private secrets (never sent via WebSocket)
const IMPOSTOR_SECRET_KEY = "impostor_secret_v1";

import { SupabaseClient, createClient } from "@supabase/supabase-js";

// =============================================
// [Sprint P1 — Fase 1] Module-Level Supabase Singleton
// Map keyed by URL: one SupabaseClient instance per credential set,
// shared across ALL rooms within the same V8 Isolate.
// This prevents Postgres connection pool exhaustion at scale.
// =============================================
const _supabaseClients = new Map<string, SupabaseClient>();

function getSupabaseClient(url: string, key: string): SupabaseClient {
    if (!_supabaseClients.has(url)) {
        _supabaseClients.set(url, createClient(url, key));
    }
    return _supabaseClients.get(url)!;
}

// =============================================
// Engine Factory — Loads the correct game mode
// =============================================

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
    private rateLimiter = new RateLimiter(5, 2000); // Chat: 5 msgs / 2s
    // [Patch 2.1] Separate rate-limiter for spammable game actions (10 actions/s, lighter than chat)
    private actionLimiter = new RateLimiter(10, 1000);

    // Write-Behind: Debounced Persistence (Game State)
    private saveTimeout: ReturnType<typeof setTimeout> | null = null;
    // [Phoenix Lobby] True Heartbeat Interval
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    // [Sprint H3 — BE-1] Tick loop delegated to TickManager
    private tickManager!: TickManager;
    // [Sprint H3 — BE-1] Alarm scheduling delegated to AlarmManager
    private alarmManager!: AlarmManager;

    // [Sprint P5 — SMELL-3] Debounced Auth-Token persistence.
    // Instead of blocking the onConnect hot path with an immediate storage.put,
    // we batch writes within a 2s window. The authSaveTask Promise is handed to
    // ctx.waitUntil() so the Isolate cannot die before the flush completes.
    private authSaveTimeout: ReturnType<typeof setTimeout> | null = null;
    private authSaveResolve: (() => void) | null = null;

    // Chat State
    messages: import('../shared/types').ChatMessage[] = [];

    // Reusable state change callback for Engine Factory
    private onStateChange = (newState: RoomState) => {
        // 1. [Sprint H3] Tick Loop Phase Management — delegated to TickManager
        this.tickManager.manageTick(newState);

        // 2. Inmediato: Per-connection broadcast with State Masking
        this.broadcastStateDelta(newState);

        // 3. Schedule backup alarm for next phase (critical for hibernate recovery)
        this.alarmManager.schedule(newState);

        // 4. Diferido: Write-Behind a disco (max 1 vez cada 5s)
        if (!this.saveTimeout) {
            this.saveTimeout = setTimeout(async () => {
                await this.room.storage.put(STORAGE_KEY, this.engine.getState());
                // [Sprint P1/P2 — Fase 3] Persist ImpostorEngine private secrets — but ONLY when dirty.
                // Secrets mutate once per round (startNewRound), not every tick. This prevents
                // redundant storage.put calls during the 60 ticks/min of the countdown.
                if (this.engine instanceof ImpostorEngine && this.engine.areSecretsDirty()) {
                    await this.room.storage.put(IMPOSTOR_SECRET_KEY, this.engine.getSecretState());
                }
                this.saveTimeout = null;
            }, 5000);
        }

        // 5. [Sprint P6 — SMELL-2] Heartbeat RPC removed from hot path.
        // It now runs strictly on a 10s interval via startHeartbeat(), preventing
        // CPU strangle and Lobby rate-limit exhaustion during active gameplay.
    };

    constructor(room: Party.Room) {
        this.room = room;

        // [Sprint P1 — Fase 1] Lazy Singleton: retrieve shared client from module-level Map.
        // env is only available inside lifecycle hooks — this is safe here (constructor is a hook).
        const supabaseUrl = this.room.env.SUPABASE_URL as string;
        const supabaseKey = this.room.env.SUPABASE_ANON_KEY as string;
        this.supabase = getSupabaseClient(supabaseUrl, supabaseKey);

        // Factory Pattern: Engine is created as TutiEngine by default.
        // If the stored state has mode='IMPOSTOR', it will be re-created in onStart().
        this.engine = createEngine(this.supabase, 'CLASSIC', room.id, this.onStateChange);

        // [Sprint H3 — BE-1] TickManager: owns the 1s countdown loop.
        // Receives engine (for tick()) and a broadcast callback (for delta-sync).
        this.tickManager = new TickManager(
            this.engine,
            () => this.broadcastStateDelta(this.engine.getState()),
            room.id
        );

        // [Sprint H3 — BE-1] AlarmManager: owns the Worker wakeup scheduling logic.
        this.alarmManager = new AlarmManager(room, room.id);

        // Instantiate Handlers (typed against BaseEngine)
        // [Sprint P5 — SMELL-3] Pass a fire-and-forget callback so ConnectionHandler
        // never needs a direct reference to Server, preserving the handler abstraction.
        this.connectionHandler = new ConnectionHandler(
            room, this.engine, this.authTokens, this.messages,
            (ctx) => this.scheduleAuthSave(ctx)
        );
        this.playerHandler = new PlayerHandler(room, this.engine);
        this.gameHandler = new GameHandler(room, this.engine);
        this.votingHandler = new VotingHandler(room, this.engine);
        this.chatHandler = new ChatHandler(this.engine, this.rateLimiter, this.messages, this.room);
    }

    // [Sprint P5 — SMELL-3] Debounced Write-Behind for Auth Tokens.
    // Batches up to 2s of concurrent joins into a single storage.put.
    // Wrapped in a Promise registered with ctx.waitUntil() = Isolate Shield:
    // the Worker cannot hibernate until the flush resolves, preventing data loss.
    public scheduleAuthSave(ctx: Party.ConnectionContext): void {
        if (!this.authSaveTimeout) {
            const task = new Promise<void>(resolve => {
                this.authSaveResolve = resolve;
            });
            // Isolate Shield: keep the Worker alive until the flush is done.
            // The guard covers runtimes that don't expose waitUntil (e.g. local dev).
            if (typeof (ctx as any).waitUntil === 'function') {
                (ctx as any).waitUntil(task);
            }
            this.authSaveTimeout = setTimeout(async () => {
                try {
                    await this.room.storage.put(AUTH_TOKENS_KEY, Object.fromEntries(this.authTokens));
                    logger.info('AUTH_TOKENS_SAVED', { roomId: this.room.id, count: this.authTokens.size });
                } catch (err) {
                    logger.error('AUTH_TOKENS_SAVE_FAILED', { roomId: this.room.id }, err instanceof Error ? err : new Error(String(err)));
                } finally {
                    this.authSaveTimeout = null;
                    // Resolve closes the shield — Isolate is now free to hibernate.
                    this.authSaveResolve?.();
                    this.authSaveResolve = null;
                }
            }, 2000);
        }
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
                    // [Deuda P2] Hot-Swap: update engine reference in existing handlers — no re-instantiation needed
                    this.connectionHandler.setEngine(this.engine);
                    this.playerHandler.setEngine(this.engine);
                    this.gameHandler.setEngine(this.engine);
                    this.votingHandler.setEngine(this.engine);
                    this.chatHandler.setEngine(this.engine);
                }

                this.engine.hydrate(stored);

                // [Sprint P1 — Fase 3] Restore ImpostorEngine private secrets from durable storage.
                // These are in a separate key and never travel via WebSocket (State Masking).
                if (this.engine instanceof ImpostorEngine) {
                    const storedSecrets = await this.room.storage.get<ImpostorSecretState>(IMPOSTOR_SECRET_KEY);
                    if (storedSecrets) {
                        this.engine.hydrateSecrets(storedSecrets);
                        logger.info('IMPOSTOR_SECRETS_HYDRATED', { roomId: this.room.id });
                    } else {
                        logger.warn('IMPOSTOR_SECRETS_MISSING', { roomId: this.room.id });
                    }
                }
            }

            // 2. Load Auth Tokens
            const storedTokens = await this.room.storage.get<Record<string, string>>(AUTH_TOKENS_KEY);
            if (storedTokens) {
                logger.info('TOKENS_HYDRATED', { roomId: this.room.id, count: Object.keys(storedTokens).length });
                this.authTokens = new Map(Object.entries(storedTokens));
            }

            // 3. [Sprint H3 — BE-2] Start Heartbeat only if room is public (P3 conditional)
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
            // [Sprint P2 — Fase 4A] structuredClone is native V8, ~2x faster than JSON.parse(JSON.stringify)
            this.previousStates.set(conn.id, structuredClone(clientState));
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

    // [Phoenix Lobby] True Heartbeat — publishes room state to the lobby index.
    // [Sprint H3 — BE-2] Conditional: only runs for public rooms to avoid wasting
    // CPU and HTTP quota on private rooms that never appear in the lobby.
    // Watcher on UPDATE_CONFIG: called again if a room transitions public ↔ private.
    private startHeartbeat() {
        const isPublic = this.engine.getState().config.isPublic;

        // If room is private AND heartbeat is already stopped, nothing to do.
        if (!isPublic) {
            // If it was running (room just turned private via UPDATE_CONFIG), stop it.
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
                logger.info('HEARTBEAT_STOPPED_PRIVATE', { roomId: this.room.id });
            }
            return;
        }

        // Public room: ensure exactly one heartbeat is running (idempotent).
        if (this.heartbeatInterval) return;

        logger.info('HEARTBEAT_STARTED', { roomId: this.room.id });

        this.heartbeatInterval = setInterval(() => {
            try {
                const state = this.engine.getState();
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
            } catch (err) {
                logger.error('HEARTBEAT_CRASH', { roomId: this.room.id }, err instanceof Error ? err : new Error(String(err)));
            }
        }, 10000);
    }

    // [Sprint H3 — BE-1] manageTick / startTick / stopTick extracted to TickManager.
    // See party/managers/tick-manager.ts


    async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
        try {
            // ── [Room TTL] MODE-AWARE EXPIRATION GATE ────────────────────────────────────
            // Checked BEFORE any heartbeat, alarm cancel, or player-join logic.
            // Only fires for NEW incoming connections — connected players are evicted via onAlarm().
            const currentState = this.engine.getState();
            if (currentState.status === 'GAME_OVER') {
                if (currentState.config.isPublic) {
                    // PUBLIC: immediate rejection — no Results Window, no config clone.
                    // The room will be purged automatically by onAlarm() / onClose().
                    logger.info('ROOM_PUBLIC_GAMEOVER_REJECT', { roomId: this.room.id });
                    conn.send(JSON.stringify({ type: EVENTS.ROOM_DEAD }));
                    conn.close(4411, 'ROOM_DEAD');
                    return;
                }

                // PRIVATE: Two-tier TTL for link arrivals (no Results Window for new connections)
                const age = Date.now() - (currentState.gameOverAt ?? 0);
                if (age > GAME_CONSTS.ROOM_HARD_EXPIRY_MS) {
                    // Hard expiry: permanent death
                    logger.info('ROOM_DEAD_REJECT', { roomId: this.room.id, ageMs: age });
                    conn.send(JSON.stringify({ type: EVENTS.ROOM_DEAD }));
                    conn.close(4411, 'ROOM_DEAD');
                    return;
                } else {
                    // Soft expiry (any age < HARD_EXPIRY): config clone → new lobby
                    logger.info('ROOM_EXPIRED_REJECT', { roomId: this.room.id, ageMs: age });
                    conn.send(JSON.stringify({
                        type: EVENTS.ROOM_EXPIRED,
                        payload: { config: currentState.config }
                    }));
                    conn.close(4410, 'ROOM_EXPIRED');
                    // Ensure the hard-expiry alarm is set (non-blocking)
                    this.room.storage.setAlarm(
                        (currentState.gameOverAt ?? Date.now()) + GAME_CONSTS.ROOM_HARD_EXPIRY_MS
                    ).catch(() => {});
                    return;
                }
            }
            // ── END EXPIRATION GATE ────────────────────────────────────────────────────────

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

            // [FIX] Capturar si el jugador ya existe ANTES de handleConnect.
            // PartyKit reconecta el WebSocket automáticamente, disparando onConnect
            // múltiples veces para el mismo usuario. Sin esta guarda, PLAYER_JOINED
            // se transmitiría N veces (una por cada reconexión automática del socket),
            // causando que los otros jugadores vean el Toast duplicado múltiples veces.
            const urlForCheck = new URL(ctx.request.url);
            const potentialUserId = urlForCheck.searchParams.get("userId");
            const isGenuinelyNew = potentialUserId
                ? !this.engine.getState().players.some(p => p.id === potentialUserId)
                : true;

            // 1. Handle Identity FIRST (adds/reconnects player in engine)
            await this.connectionHandler.handleConnect(conn, ctx);

            // [Sprint P2 — Fase 1] Grace Period: if this user has a pending grace period timer
            // (they were the Impostor and lost connection), cancel it — they reconnected in time.
            const reconnectedUserId = (conn.state as any)?.userId;
            if (reconnectedUserId && this.engine instanceof ImpostorEngine) {
                this.engine.cancelGracePeriod(reconnectedUserId);
            }

            // 2. Send current Game State to NEW client (AFTER player is added)
            //    AND register the baseline to prevent duplicate UPDATE_STATE from broadcastStateDelta
            const userId = (conn.state as any)?.userId || conn.id;
            const initialClientState = this.engine.getClientState(userId);
            conn.send(JSON.stringify({
                type: EVENTS.UPDATE_STATE,
                payload: initialClientState
            }));
            // [Sprint P2 — Fase 4A] structuredClone is native V8, ~2x faster than JSON.parse(JSON.stringify)
            this.previousStates.set(conn.id, structuredClone(initialClientState));

            // 3. Send Chat History
            conn.send(JSON.stringify({
                type: EVENTS.CHAT_HISTORY,
                payload: this.messages
            }));

            // 4. Unified Delta Broadcast — sends PATCHES (not full state) to existing clients
            // [Sprint 3 - P2] Broadcast PLAYER_JOINED solo en primer ingreso real (no en reconexiones)
            if (isGenuinelyNew) {
                const joinedName = this.engine.getState().players.find(p => p.id === userId)?.name;
                if (joinedName) {
                    const joinMsg = JSON.stringify({ type: EVENTS.PLAYER_JOINED, payload: { name: joinedName } });
                    for (const c of this.room.getConnections()) {
                        if (c.id !== conn.id) c.send(joinMsg);
                    }
                }
            }
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

            logger.debug('MESSAGE_RECEIVED', { sender: sender.id, type });

            switch (type) {
                // --- Game Logic ---
                case EVENTS.START_GAME:
                    await this.gameHandler.handleStartGame(sender);
                    break;

                case EVENTS.STOP_ROUND:
                    await this.gameHandler.handleStopRound(payload as any, sender);
                    break;

                case EVENTS.UPDATE_ANSWERS:
                    // [Patch 2.1] Rate-limit live answer updates (most spammable event in the game)
                    if (!this.actionLimiter.checkLimit(sender.id)) {
                        logger.warn('ACTION_RATE_LIMITED', { sender: sender.id, type });
                        return;
                    }
                    await this.gameHandler.handleUpdateAnswers(payload as any, sender);
                    break;

                case EVENTS.SUBMIT_ANSWERS:
                    await this.gameHandler.handleSubmitAnswers(payload as any, sender);
                    break;

                // --- Voting Logic ---
                case EVENTS.TOGGLE_VOTE:
                    // [Patch 2.1] Rate-limit vote toggling to prevent vote-spam
                    if (!this.actionLimiter.checkLimit(sender.id)) {
                        logger.warn('ACTION_RATE_LIMITED', { sender: sender.id, type });
                        return;
                    }
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
                        logger.info('HOT_SWAP', { roomId: this.room.id, oldMode, newMode });
                        const currentState = this.engine.getState();
                        this.engine = createEngine(this.supabase, newMode, this.room.id, this.onStateChange);
                        this.engine.hydrate(currentState);

                        // [Deuda P2] Hot-Swap: update engine reference in existing handlers — no re-instantiation needed
                        this.connectionHandler.setEngine(this.engine);
                        this.playerHandler.setEngine(this.engine);
                        this.gameHandler.setEngine(this.engine);
                        this.votingHandler.setEngine(this.engine);
                        this.chatHandler.setEngine(this.engine);

                        // Forzar broadcast inmediato del estado (enmascarado por el nuevo motor)
                        this.broadcastStateDelta(this.engine.getState());
                    }

                    // [Sprint H3 — BE-2] If isPublic changed, start or stop the heartbeat accordingly.
                    // startHeartbeat() is idempotent: safe to call on every config change.
                    this.startHeartbeat();
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
                    // [Sprint P2 — Fase 4A] structuredClone is native V8, ~2x faster than JSON.parse(JSON.stringify)
                    this.previousStates.set(sender.id, structuredClone(fullState));
                    break;
                }

                // --- CHAT SYSTEM (Phase 2.A + 2.E Security) ---
                case EVENTS.CHAT_SEND: {
                    await this.chatHandler.handleChat(payload as any, sender);
                    // [Sprint P2 — Fase 2] Chat does NOT mutate RoomState — skip delta sync and alarm scheduling.
                    // Avoids a full JSON Patch compare cycle (clone → diff → empty patch) per chat message.
                    return;
                }

                // --- REACTIONS (Stateless, P9) ---
                case EVENTS.WORD_REACT: {
                    // [Patch 2.1] Rate-limit emoji reactions to prevent spam flooding
                    if (!this.actionLimiter.checkLimit(sender.id)) return;
                    // Zero-mutation relay: broadcast emoji to all connections without touching RoomState.
                    await this.gameHandler.handleWordReact(payload as any, sender, this.room);
                    return; // skip delta sync — no state was mutated
                }

                // --- EL ÚLTIMO DESEO (P10) ---
                case EVENTS.LAST_WISH_TYPING: {
                    // [Patch 2.1] Rate-limit live typing relay to avoid text-flood
                    if (!this.actionLimiter.checkLimit(sender.id)) return;
                    // Stateless relay — igual que WORD_REACT, NO toca RoomState
                    await this.gameHandler.handleLastWishTyping(payload as any, sender, this.room);
                    return; // skip delta sync
                }

                case EVENTS.SUBMIT_LAST_WISH: {
                    // One-Shot: si falla → CREW gana inmediatamente. Sí muta estado → delta sync.
                    await this.gameHandler.handleSubmitLastWish(payload as any, sender);
                    break; // continúa al broadcastStateDelta
                }

                // --- LIVE DRAFTS + CONFIRMACIÓN (P12) ---
                case EVENTS.UPDATE_IMPOSTOR_DRAFT: {
                    await this.gameHandler.handleUpdateImpostorDraft(payload as any, sender);
                    break; // muta state.answers y impostorData.words → delta sync
                }

                case EVENTS.CONFIRM_IMPOSTOR_WORD: {
                    await this.gameHandler.handleConfirmImpostorWord(sender);
                    break; // muta readyPlayers → delta sync
                }

                default:
                    logger.warn('UNKNOWN_MESSAGE', { sender: sender.id, type });
            }

            // === UNIFIED DELTA SYNC ===
            // After any handler mutates the engine, broadcast the delta to all clients.
            // Exceptions: PONG (no-op), CHAT_SEND (uses its own chat broadcast), WORD_REACT/LAST_WISH_TYPING (stateless relay)
            this.broadcastStateDelta(this.engine.getState());

            await this.alarmManager.schedule(this.engine.getState());

        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            logger.error('ON_MESSAGE_FAILED', { roomId: this.room.id, connectionId: sender.id }, error);
            sender.send(JSON.stringify({
                type: EVENTS.SERVER_ERROR,
                payload: { message: 'Internal server error processing message' }
            }));
        }
    }

    // [Sprint H3 — BE-1] scheduleAlarms extracted to AlarmManager.
    // See party/managers/alarm-manager.ts


    async onAlarm() {
        const stateAtAlarm = this.engine.getState();

        // ── [Room TTL] GAME_OVER LIFECYCLE HANDLER ──────────────────────────────────────
        if (stateAtAlarm.status === 'GAME_OVER') {
            const age = Date.now() - (stateAtAlarm.gameOverAt ?? 0);

            // — PHASE 2: HARD EXPIRY — Purga definitiva (privadas y púlblicas que sobrevivieran) —
            if (age > GAME_CONSTS.ROOM_HARD_EXPIRY_MS) {
                logger.info('ROOM_HARD_EXPIRED', { roomId: this.room.id, ageMs: age });
                for (const conn of this.room.getConnections()) {
                    try { conn.send(JSON.stringify({ type: EVENTS.ROOM_DEAD })); conn.close(4411, 'ROOM_DEAD'); } catch (_) {}
                }
                if (this.saveTimeout) { clearTimeout(this.saveTimeout); this.saveTimeout = null; }
                await this.room.storage.deleteAll();
                this.engine = createEngine(this.supabase, 'CLASSIC', 'purged-room');
                this.previousStates.clear();
                return;
            }

            // — PHASE 1: AFK KICK — Expulsar jugadores inactivos en pantalla de resultados ——
            if (age >= GAME_CONSTS.ROOM_GAMEOVER_AFK_MS) {
                const isPublic = stateAtAlarm.config.isPublic;
                const connectedCount = [...this.room.getConnections()].length;
                logger.info('ROOM_KICK_TRIGGER', { roomId: this.room.id, isPublic, connectedCount, ageMs: age });

                for (const conn of this.room.getConnections()) {
                    try {
                        if (isPublic) {
                            conn.send(JSON.stringify({ type: EVENTS.ROOM_DEAD }));
                            conn.close(4411, 'ROOM_DEAD');
                        } else {
                            conn.send(JSON.stringify({
                                type: EVENTS.ROOM_EXPIRED,
                                payload: { config: stateAtAlarm.config }
                            }));
                            conn.close(4410, 'ROOM_EXPIRED');
                        }
                    } catch (_) { /* connection may already be closed */ }
                }

                if (isPublic) {
                    // Pública: purgar storage inmediatamente
                    logger.info('ROOM_PUBLIC_PURGE', { roomId: this.room.id });
                    if (this.saveTimeout) { clearTimeout(this.saveTimeout); this.saveTimeout = null; }
                    await this.room.storage.deleteAll();
                    this.engine = createEngine(this.supabase, 'CLASSIC', 'purged-room');
                    this.previousStates.clear();
                } else {
                    // Privada: programar fase 2 (hard expiry) para limpieza definitiva
                    const hardExpiryAt = (stateAtAlarm.gameOverAt ?? Date.now()) + GAME_CONSTS.ROOM_HARD_EXPIRY_MS;
                    logger.info('ROOM_PRIVATE_HARD_EXPIRY_SCHEDULED', { roomId: this.room.id, hardExpiryAt });
                    await this.room.storage.setAlarm(hardExpiryAt);
                }
                return;
            }
            // age < ROOM_SOFT_EXPIRY_MS: alarm disparó antes de tiempo — watchdog normal a continuación
        }
        // ── END GAME_OVER LIFECYCLE HANDLER ──────────────────────────────────────────────────────

        // [AUTO-WIPE] Check for inactivity
        const activeConnections = [...this.room.getConnections()].length;
        if (activeConnections === 0) {
            logger.info('ROOM_AUTO_WIPED', { roomId: this.room.id });
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

        logger.info('WATCHDOG_TRIGGERED', { roomId: this.room.id });

        const zombiesPurged = this.engine.checkInactivePlayers();
        const stateMutatedByTimer = this.engine.handleTimeUp(); // Anti-Freeze: Execute late timeouts

        if (zombiesPurged || stateMutatedByTimer) {
            logger.info('WATCHDOG_MUTATION', { roomId: this.room.id, zombiesPurged, stateMutatedByTimer });

            if (stateMutatedByTimer) {
                // [Sprint H3] Resume tick loop after Worker hibernation — delegated to TickManager
                this.tickManager.manageTick(this.engine.getState());
                this.broadcastStateDelta(this.engine.getState());
            }
            await this.room.storage.put(STORAGE_KEY, this.engine.getState());
        }
    }

    onClose(connection: Party.Connection) {
        this.rateLimiter.cleanup(connection.id);
        // [Sprint H1 — SEC-3] Cleanup the action rate limiter too (was missing → slow memory leak)
        this.actionLimiter.cleanup(connection.id);
        this.connectionHandler.handleClose(connection);

        // [Sprint 3 - P2] Broadcast PLAYER_LEFT a los jugadores restantes antes del delta sync
        const leftUserId = (connection.state as any)?.userId || connection.id;
        const leftPlayer = this.engine.getState().players.find(p => p.id === leftUserId);
        if (leftPlayer) {
            const leaveMsg = JSON.stringify({ type: EVENTS.PLAYER_LEFT, payload: { name: leftPlayer.name } });
            for (const c of this.room.getConnections()) {
                if (c.id !== connection.id) c.send(leaveMsg);
            }
        }

        // Unified Delta Broadcast (notify remaining players)
        this.broadcastStateDelta(this.engine.getState());

        // Clean up per-connection state for State Masking
        this.previousStates.delete(connection.id);

        // ZOMBIE ALARM: Schedule cleanup check in 60s
        // Skip during GAME_OVER — the kick alarm from scheduleAlarms() already handles cleanup.
        // Overwriting it here would delay the 10s kick unexpectedly.
        if (this.engine.getState().status !== 'GAME_OVER') {
            this.room.storage.setAlarm(Date.now() + 60_000);
        }

        // Check if room is now empty
        const connections = [...this.room.getConnections()];
        if (connections.length === 0) {
            // ⚠️ Capture state FIRST — dispose() may clear engine internals,
            // causing getState() to return defaults with gameOverAt = undefined.
            // That would make hardExpiryAt = year 1970 → alarm fires in 1s → instant purge bug.
            const closingState = this.engine.getState();

            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
                this.saveTimeout = null;
            }
            this.room.storage.put(STORAGE_KEY, closingState);

            // [Sprint H3] Stop Tick Loop — no players means no need to count down
            this.tickManager.stop();

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

            if (closingState.config.isPublic) {
                // Pública: limpieza agresiva en 10s — desaparece del índice rápidamente.
                logger.info('AUTO_WIPE_SCHEDULED_PUBLIC', { roomId: this.room.id, timeout: 10 });
                this.room.storage.setAlarm(Date.now() + 10_000);

            } else if (closingState.status === 'GAME_OVER' && closingState.gameOverAt) {
                // Privada + GAME_OVER: mantener la sala viva hasta el hard-expiry (1h).
                // No sobreescribir con un tiempo más corto — el link debe seguir funcionando.
                const hardExpiryAt = closingState.gameOverAt + GAME_CONSTS.ROOM_HARD_EXPIRY_MS;
                // hardExpiryAt is always in the future here since gameOverAt is freshly set.
                // Safety clamp: if somehow in the past, push 1s forward.
                const target = hardExpiryAt > Date.now() ? hardExpiryAt : Date.now() + 1_000;
                logger.info('PRESERVING_HARD_EXPIRY_ALARM', { roomId: this.room.id, hardExpiryAt });
                this.room.storage.setAlarm(target);

            } else {
                // Privada, estado no-GAME_OVER: watchdog de 120s (comportamiento existente).
                logger.info('AUTO_WIPE_SCHEDULED', { roomId: this.room.id, timeout: 120 });
                this.room.storage.setAlarm(Date.now() + 120 * 1000);
            }
        }
    }
}
