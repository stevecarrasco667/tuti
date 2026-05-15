import { RoomState } from '../types';
import { normalizeAnswer } from '../utils';
import { ValidationManager } from './validation-manager';

export class ScoreSystem {
    private validation: ValidationManager;

    constructor(validation: ValidationManager) {
        this.validation = validation;
    }

    /**
     * Calculates scores for the current round based on answers and votes.
     * Mutates the state directly (Setter Injection / Reference Mutation).
     *
     * [GD-1] Double Points: if this is the last round, all point values are ×2.
     * [GD-1] Perfect Bonus: if a player fills ALL categories as VALID/VALID_AUTO, they earn +50 bonus.
     */
    public calculate(state: RoomState): void {
        state.status = 'RESULTS';
        const totalPlayers = state.players.length;
        const lang = state.config?.lang || 'es';

        // [GD-1] Detect last round for double-points rule.
        // roundsPlayed is incremented by RoundManager.nextRound() AFTER calculate() runs,
        // so at this point roundsPlayed is 0-indexed and equals the number of completed rounds.
        // The round currently being scored is: roundsPlayed + 1.
        const currentRound = state.roundsPlayed + 1;
        const totalRounds = state.config?.classic?.rounds ?? 5;
        const isLastRound = currentRound >= totalRounds;
        const pointMultiplier = isLastRound ? 2 : 1;

        // Propagate the flag so the UI can show the "DOUBLE POINTS" banner.
        state.isLastRound = isLastRound;

        // Initialize structures
        state.answerStatuses = {};
        state.players.forEach(p => {
            state.answerStatuses[p.id] = {};
            state.roundScores[p.id] = 0;
        });

        // Loop per category to analyze duplicates
        for (const category of state.categories) {
            const catName = category.name;

            // 1. Collect Valid Answers (Not empty, Not voted out)
            const validAnswersMap: Record<string, string[]> = {}; // Normalized Word -> [PlayerIds]
            // Track auto-validated players for this category
            const autoValidatedPlayers = new Set<string>();

            state.players.forEach(player => {
                const rawAnswer = state.answers[player.id]?.[catName];

                // Check empty
                if (!rawAnswer || !rawAnswer.trim()) {
                    state.answerStatuses[player.id][catName] = 'INVALID';
                    return;
                }

                // Check auto-validation (Escudo Dorado 🛡️ — immune to voting)
                const isAutoValidated = this.validation.getDictionaryManager().hasExact(lang, category.id, rawAnswer);

                // Check voting (Invalidation) — skip for auto-validated answers
                if (!isAutoValidated) {
                    const negativeVotes = state.votes[player.id]?.[catName]?.length || 0;
                    // [RULE] If >= 50% of players vote negative, it is rejected.
                    if (negativeVotes >= totalPlayers / 2) {
                        state.answerStatuses[player.id][catName] = 'INVALID';
                        return;
                    }
                } else {
                    autoValidatedPlayers.add(player.id);
                }

                // It is potentially valid. Add to frequency map.
                // Smart Normalization
                const normalized = normalizeAnswer(rawAnswer);

                if (!validAnswersMap[normalized]) validAnswersMap[normalized] = [];
                validAnswersMap[normalized].push(player.id);
            });

            // 2. Assign Scores based on Frequency (×2 in last round)
            Object.entries(validAnswersMap).forEach(([_word, playerIds]) => {
                const isDuplicate = playerIds.length > 1;
                const basePoints = isDuplicate ? 50 : 100;
                const points = basePoints * pointMultiplier;

                playerIds.forEach(pid => {
                    // Use VALID_AUTO if auto-validated, else VALID/DUPLICATE
                    if (autoValidatedPlayers.has(pid)) {
                        state.answerStatuses[pid][catName] = isDuplicate ? 'DUPLICATE' : 'VALID_AUTO';
                    } else {
                        state.answerStatuses[pid][catName] = isDuplicate ? 'DUPLICATE' : 'VALID';
                    }

                    // Add Score
                    state.roundScores[pid] = (state.roundScores[pid] || 0) + points;

                    const player = state.players.find(p => p.id === pid);
                    if (player) player.score += points;
                });
            });
        }

        // [GD-1] Perfect Bonus: +50 pts (×multiplier) if ALL categories are VALID or VALID_AUTO
        const perfectBonus = 50 * pointMultiplier;
        state.players.forEach(player => {
            const playerStatuses = state.answerStatuses[player.id] || {};
            const allValid = state.categories.every(cat => {
                const s = playerStatuses[cat.name];
                return s === 'VALID' || s === 'VALID_AUTO';
            });
            if (allValid && state.categories.length > 0) {
                state.roundScores[player.id] = (state.roundScores[player.id] || 0) + perfectBonus;
                player.score += perfectBonus;
                // Mark as perfect so UI can show the badge
                if (!state.answerStatuses[player.id]) state.answerStatuses[player.id] = {};
                (state.answerStatuses[player.id] as any)['__perfect__'] = true;
            }
        });

        // Clear voting timer
        state.timers.votingEndsAt = null;

        // Set 7 second timer for results screen (reduced from 10s — GD-1 pacing fix)
        state.timers.resultsEndsAt = Date.now() + 7000;
    }
}
