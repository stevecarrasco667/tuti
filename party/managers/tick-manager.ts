// =============================================
// TickManager — Server-Authoritative Tick Loop
// =============================================
// [Sprint H3 — BE-1] Extracted from server.ts (was ~50 LOC inline).
//
// Responsibility: manage the 1-second countdown loop that keeps all clients
// in sync with the server-canonical remaining time during timed game phases.
//
// Contract:
//   - manageTick(state)  → call on every state mutation to start/stop loop
//   - startTick(ms)      → explicitly start for a given duration (used in alarm recovery)
//   - stop()             → unconditionally halt the loop (called on room empty / dispose)
//
// Dependencies injected via constructor to avoid circular imports with server.ts:
//   - engine.tick(n)           → decrements canonical remaining time in state
//   - onBroadcast()            → delta-sync broadcast to all connected clients
//   - roomId                   → used only for structured logging

import type { RoomState } from '../../shared/types.js';
import type { BaseEngine } from '../../shared/engines/base-engine.js';
import { logger } from '../../shared/utils/logger.js';

// Game statuses that require an active countdown tick, mapped to their timer property.
const TIMED_STATUSES: Partial<Record<string, keyof RoomState['timers']>> = {
    'PLAYING': 'roundEndsAt',
    'REVIEW':  'votingEndsAt',
    'RESULTS': 'resultsEndsAt', // [Auto-Advance] Show countdown during results phase
    'TYPING':  'roundEndsAt',
    'VOTING':  'votingEndsAt',
};

export class TickManager {
    private tickInterval: ReturnType<typeof setInterval> | null = null;

    constructor(
        // [Sprint 4 — S4-T2] engine is mutable (not readonly) to support hot-swap and hydration.
        // Use setEngine() whenever server.ts replaces this.engine — never reconstruct TickManager.
        private engine: BaseEngine,
        private readonly onBroadcast: () => void,
        private readonly roomId: string,
    ) {}

    /**
     * [Sprint 4 — S4-T2] Updates the engine reference without reconstructing the manager.
     * Must be called in server.ts whenever this.engine is replaced:
     *   1. onStart() hydration: stored mode = IMPOSTOR → new engine created
     *   2. UPDATE_CONFIG hot-swap: mode changes Classic ↔ Impostor
     * Without this, tick() calls go to the dead engine while handlers use the live one.
     */
    public setEngine(engine: BaseEngine): void {
        this.engine = engine;
        logger.info('TICK_ENGINE_UPDATED', { roomId: this.roomId });
    }

    /**
     * Called on every state mutation (from the onStateChange callback).
     * Inspects the new game status and starts/stops the tick loop accordingly.
     * 
     * [Sprint P6 — SMELL-1] Uses a declarative dictionary map, removing O(4) WET branches.
     */
    public manageTick(state: RoomState): void {
        const timerKey = TIMED_STATUSES[state.status];
        if (timerKey) {
            const targetTime = state.timers[timerKey];
            if (targetTime) {
                const msLeft = targetTime - Date.now();
                if (msLeft > 0 && !this.tickInterval) {
                    this.startTick(msLeft);
                    return;
                }
            }
        }

        // Any non-timed phase (LOBBY, RESULTS, etc.) or expired timer → stop the tick
        this.stop();
    }

    /**
     * Explicitly starts the tick loop for a given duration.
     * Used by the onAlarm() watchdog to resume a tick after Worker hibernation.
     * Re-entrant safe: always calls stop() first to prevent double-tick bugs.
     */
    public startTick(durationMs: number): void {
        this.stop(); // Re-entrant safety: clear any previous interval before starting
        let remaining = Math.ceil(durationMs / 1000);
        logger.info('TICK_LOOP_START', { roomId: this.roomId, duration: remaining });

        this.tickInterval = setInterval(() => {
            remaining--;
            this.engine.tick(remaining);
            this.onBroadcast();

            if (remaining <= 0) {
                // The RoundManager's setTimeout will handle the actual phase transition.
                // We stop the tick loop here to avoid unnecessary broadcasts post-transition.
                this.stop();
            }
        }, 1000);
    }

    /**
     * Stops and cleans up the tick loop. Safe to call even if no tick is running.
     * Called when: room empties, room hibernates, or a non-timed phase begins.
     */
    public stop(): void {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
            logger.info('TICK_LOOP_STOP', { roomId: this.roomId });
        }
    }

    /** Returns true if a tick loop is currently active. Used for guard checks. */
    public isRunning(): boolean {
        return this.tickInterval !== null;
    }
}
