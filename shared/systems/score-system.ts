import { RoomState } from '../types';
import { normalizeAnswer } from '../utils';

export class ScoreSystem {

    /**
     * Calculates scores for the current round based on answers and votes.
     * Mutates the state directly (Setter Injection / Reference Mutation).
     */
    public calculate(state: RoomState): void {
        state.status = 'RESULTS';
        const totalPlayers = state.players.length;

        // Initialize structures
        state.answerStatuses = {};
        state.players.forEach(p => {
            state.answerStatuses[p.id] = {};
            state.roundScores[p.id] = 0;
        });

        // Loop per category to analyze duplicates
        for (const category of state.categories) {

            // 1. Collect Valid Answers (Not empty, Not voted out)
            const validAnswersMap: Record<string, string[]> = {}; // Normalized Word -> [PlayerIds]

            state.players.forEach(player => {
                const rawAnswer = state.answers[player.id]?.[category];

                // Check empty
                if (!rawAnswer || !rawAnswer.trim()) {
                    state.answerStatuses[player.id][category] = 'INVALID';
                    return;
                }

                // Check voting (Invalidation)
                const negativeVotes = state.votes[player.id]?.[category]?.length || 0;
                // [RULE] If >= 50% of players vote negative, it is rejected.
                // This ensures 1vs1 (1 vote >= 1) works, and 2/4 works.
                if (negativeVotes >= totalPlayers / 2) {
                    state.answerStatuses[player.id][category] = 'INVALID';
                    return;
                }

                // It is potentially valid. Add to frequency map.
                // Smart Normalization
                const normalized = normalizeAnswer(rawAnswer);

                if (!validAnswersMap[normalized]) validAnswersMap[normalized] = [];
                validAnswersMap[normalized].push(player.id);
            });

            // 2. Assign Scores based on Frequency
            Object.entries(validAnswersMap).forEach(([_word, playerIds]) => {
                const isDuplicate = playerIds.length > 1;
                const points = isDuplicate ? 50 : 100;
                const status = isDuplicate ? 'DUPLICATE' : 'VALID';

                playerIds.forEach(pid => {
                    state.answerStatuses[pid][category] = status;

                    // Add Score
                    state.roundScores[pid] = (state.roundScores[pid] || 0) + points;

                    const player = state.players.find(p => p.id === pid);
                    if (player) player.score += points;
                });
            });
        }

        // Clear voting timer
        state.timers.votingEndsAt = null;

        // Set 10 second timer for results screen
        state.timers.resultsEndsAt = Date.now() + 10000; // 10 seconds
    }
}
