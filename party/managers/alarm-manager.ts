// =============================================
// AlarmManager — Room Lifecycle Alarm Scheduler
// =============================================
// [Sprint H3 — BE-1] Extracted from server.ts (was ~40 LOC inline in scheduleAlarms).
//
// Responsibility: calculate the next alarm timestamp for each game phase
// and register it via room.storage.setAlarm(). The Worker will wake from
// hibernation at that time and call server.onAlarm(), which handles the
// actual state transitions.
//
// Design note: onAlarm() remains in server.ts because it requires full
// server context (engine, saveTimeout, previousStates, room connections).
// AlarmManager only owns the "when to wake up" scheduling logic.

import type * as Party from 'partykit/server';
import type { RoomState } from '../../shared/types.js';
import { GAME_CONSTS } from '../../shared/consts.js';
import { logger } from '../../shared/utils/logger.js';

// Maps each game status to the timer property that defines its deadline.
// Only statuses that need a wakeup alarm are listed here.
// Statuses that rely on the tick loop alone (ROLE_REVEAL) are included
// as a safety net — if the Worker hibernates mid-phase, the alarm rescues it.
const ALARM_TIMER_MAP: Partial<Record<string, keyof RoomState['timers']>> = {
    // Classic mode
    'PLAYING':           'roundEndsAt',
    'REVIEW':            'votingEndsAt',
    'RESULTS':           'resultsEndsAt',
    'ENDING_COUNTDOWN':  'roundEndsAt',   // [Patch 1.4] 3-second panic countdown rescue

    // Impostor mode
    'ROLE_REVEAL':       'roundEndsAt',
    'TYPING':            'roundEndsAt',
    'VOTING':            'votingEndsAt',
    'LAST_WISH':         'resultsEndsAt', // 10-second Last Wish window
};

export class AlarmManager {
    constructor(
        private readonly room: Party.Room,
        private readonly roomId: string,
    ) {}

    /**
     * Schedules the next Worker wakeup alarm based on the current game state.
     *
     * Called after every state mutation (onMessage) and from onStateChange.
     * The alarm is a safety net — if the Worker hibernates mid-phase,
     * it will wake up and call onAlarm() to handle the transition.
     *
     * Rules:
     * - GAME_OVER: AFK watchdog fires at gameOverAt + ROOM_GAMEOVER_AFK_MS (60s)
     * - Timed phases: fires at the phase deadline (roundEndsAt / votingEndsAt / etc.)
     * - All other statuses: no alarm scheduled (LOBBY, LOADING_ROUND, etc.)
     */
    public async schedule(state: RoomState): Promise<void> {
        const now = Date.now();
        let nextTarget: number | null = null;

        // Special case: GAME_OVER AFK watchdog
        if (state.status === 'GAME_OVER' && state.gameOverAt) {
            // [Room TTL] AFK watchdog for players already on the results screen.
            // ROOM_GAMEOVER_AFK_MS (60s) gives players time to share results and
            // start a new game before being kicked. This is intentionally separate
            // from ROOM_SOFT_EXPIRY_MS (10s) which only applies to NEW connections.
            nextTarget = state.gameOverAt + GAME_CONSTS.ROOM_GAMEOVER_AFK_MS;
        } else {
            // Map status → timer property → timestamp
            const timerKey = ALARM_TIMER_MAP[state.status];
            if (timerKey) {
                nextTarget = state.timers[timerKey] ?? null;
            }
        }
        // Note: RESULTS for Impostor also uses resultsEndsAt, already covered above

        if (nextTarget) {
            if (nextTarget > now) {
                await this.room.storage.setAlarm(nextTarget);
                logger.debug('ALARM_SCHEDULED', { roomId: this.roomId, status: state.status, firesAt: nextTarget });
            } else {
                // [Sprint H6 — RACE-1a] The Worker woke up late — the timer already expired.
                // Without this rescue, no alarm would ever be scheduled again, freezing the game indefinitely.
                // Force onAlarm() in 100ms so handleTimeUp() can execute the overdue state transition.
                await this.room.storage.setAlarm(now + 100);
                logger.warn('ALARM_EMERGENCY_RESCUE', { roomId: this.roomId, status: state.status, expiredAt: nextTarget });
            }
        }
    }
}
