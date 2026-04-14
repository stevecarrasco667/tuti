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

        // Reset per-player progress counters (fix: filledCount was persisting across rounds)
        state.players.forEach(p => { p.filledCount = 0; });

        // Pick new letter (Random)
        state.currentLetter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(Math.floor(Math.random() * 26));

        // Start Timer
        const durationMs = config.classic.timeLimit * 1000;
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

        // Start Voting Timer (Auto-end logic or manual transition as per current spec)
        state.timers.votingEndsAt = Date.now() + (config.classic.votingDuration * 1000);

        // [Sprint P7] Reparación de Temporizador de Votación en UI
        // Este choke-point se ejecuta TANTO si el tiempo de escritura expira
        // como si un jugador presiona BASTA. Propagamos el nuevo timer
        // al frontend para que Renderice el Countdown en la fase REVIEW.
        state.uiMetadata = {
            activeView: 'GAME',
            showTimer: true,
            targetTime: state.timers.votingEndsAt
        };
    }

    public nextRound(state: RoomState, config: GameConfig): boolean {
        state.roundsPlayed++;
        if (state.roundsPlayed >= config.classic.rounds) {
            state.status = 'GAME_OVER';
            state.gameOverReason = 'NORMAL';
            // [Room TTL] Seal the death timestamp here, parallel to _triggerGameOver.
            // Without this, _triggerGameOver sees wasAlreadyGameOver=true and skips
            // gameOverAt → undefined → hardExpiryAt = year 1970 → alarm in 1s → instant purge.
            if (!state.gameOverAt) {
                state.gameOverAt = Date.now();
            }
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
