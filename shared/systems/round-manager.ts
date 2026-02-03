import { RoomState, GameConfig } from '../types.js';

export class RoundManager {
    private timer: any = null;

    /**
     * Starts a new round.
     * @param state The game state to mutate.
     * @param config The game configuration.
     * @param onTimeUp Callback to execute when the time is up. 
     *                 IMPORTANT: This callback must handle the notification/broadcast.
     */
    public startRound(state: RoomState, config: GameConfig, onTimeUp: () => void) {
        // Reset Round State
        state.answers = {};
        state.answerStatuses = {};
        state.votes = {};
        state.roundScores = {};
        state.whoFinishedVoting = [];
        state.stoppedBy = null;
        state.status = 'PLAYING';

        // Pick new letter (Random)
        state.currentLetter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(Math.floor(Math.random() * 26));

        // Start Timer
        const durationMs = config.roundDuration * 1000;
        state.timers.roundEndsAt = Date.now() + durationMs;

        // Clear previous timer if exists
        if (this.timer) clearTimeout(this.timer);

        // Set Active Timer
        this.timer = setTimeout(() => {
            console.log("[RoundManager] Timer expired. Triggering onTimeUp.");
            onTimeUp();
        }, durationMs);
    }

    /**
     * Stops the current round immediately (e.g. "Basta" or timeout).
     */
    public stopRound(state: RoomState, config: GameConfig) {
        // Clear active timer
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        // Transition to Review
        state.status = 'REVIEW';
        state.timers.roundEndsAt = null; // Clear round timer UI

        // Start Voting Timer (Optional auto-end for voting could go here too, but for now we follow spec)
        // state.timers.votingEndsAt = Date.now() + (config.votingDuration * 1000);
        // We leave voting timer logic primarily to the Engine or separate Voting phase for now 
        // as per current 'initReviewPhase' logic which might be moved later.
        // But for this refactor, we just switch status.
        // Wait, the original code initialized voting timer in 'initReviewPhase'. 
        // Let's replicate that minimal logic here:
        state.timers.votingEndsAt = Date.now() + (config.votingDuration * 1000);
    }

    public nextRound(state: RoomState, config: GameConfig): boolean {
        state.roundsPlayed++;
        if (state.roundsPlayed >= config.totalRounds) {
            state.status = 'GAME_OVER';
            state.gameOverReason = 'NORMAL';
            return false; // Game Over
        }
        return true; // Continue
    }

    /**
     * Cancels any active timer. Used for server-side forced stops (Game Over).
     */
    public cancelTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}
