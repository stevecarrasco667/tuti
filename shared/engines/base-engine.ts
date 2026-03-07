// =============================================
// BaseEngine — Abstract Contract for Game Modes
// =============================================
// Every game mode (Tuti, Impostor, future modes) must implement this interface.
// Handlers type against BaseEngine. Only the Factory (server.ts) knows concrete classes.

import { RoomState, GameConfig, DeepPartial } from '../types.js';
import { PlayerManager } from '../systems/player-manager.js';
import { SupabaseClient } from '@supabase/supabase-js';

export abstract class BaseEngine {

    // --- DEPENDENCIES ---
    protected abstract supabase: SupabaseClient;

    // --- STATE ACCESS ---
    abstract getState(): RoomState;

    /** Returns a censored/personalized view of the state for a specific user.
     *  In Tuti Classic, this returns the full state (no secrets).
     *  In Impostor mode, this will hide roles and secret words from non-impostors. */
    abstract getClientState(userId: string): RoomState;

    abstract hydrate(newState: RoomState): void;

    // --- CONNECTION MANAGEMENT ---
    abstract joinPlayer(userId: string, name: string, avatar: string, connectionId: string): RoomState;
    abstract playerDisconnected(connectionId: string): RoomState;
    abstract playerExited(connectionId: string): RoomState;

    // --- CONFIGURATION ---
    abstract updateConfig(connectionId: string, newConfig: DeepPartial<GameConfig>): RoomState;

    // --- GAME LIFECYCLE ---
    abstract startGame(connectionId: string): Promise<RoomState>;
    abstract stopRound(connectionId: string, answers: Record<string, string>): RoomState;
    abstract restartGame(requestorId: string): Promise<RoomState>;

    // --- GAMEPLAY ACTIONS ---
    abstract submitAnswers(connectionId: string, answers: Record<string, string>): RoomState;
    abstract updateAnswers(connectionId: string, answers: Record<string, string>): RoomState;
    abstract toggleVote(connectionId: string, targetUserId: string, category: string): RoomState;
    abstract confirmVotes(connectionId: string): RoomState;

    // --- ADMIN ---
    abstract kickPlayer(hostConnectionId: string, targetUserId: string): RoomState;
    abstract checkInactivePlayers(): boolean;

    /** Rescues the engine from Worker Hibernation if a phase timer expired while sleeping.
     *  Returns `true` if the state was mutated by forcing a timeout transition. */
    abstract handleTimeUp(): boolean;

    /** Called every second by the server Tick Loop.
     *  Updates the server-canonical remaining time and broadcasts it to clients. */
    abstract tick(newValue: number): void;

    // --- SUB-SYSTEMS (exposed for server.ts reconnection logic) ---
    abstract get players(): PlayerManager;
}
