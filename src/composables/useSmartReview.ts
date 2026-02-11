import { Ref } from 'vue';
import { RoomState } from '../../shared/types'; // Adjust path if needed

export type ReviewState = 'VALID' | 'VALID_AUTO' | 'DUPLICATE' | 'REJECTED' | 'CONTESTED' | 'EMPTY';

export interface PlayerReviewStatus {
    playerId: string;
    answer: string;
    state: ReviewState;
    score: number;
    voteCount: number;
    votesNeeded: number; // For UI display (e.g., "1/3")
    votesReceived: string[]; // List of voter IDs
}

export function useSmartReview(gameState: Ref<RoomState>, currentCategory: Ref<string>) {

    // Helper to normalize strings for comparison
    const normalize = (str: string) => str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const getPlayerStatus = (playerId: string, categoryOverride?: string): PlayerReviewStatus => {
        const category = categoryOverride || currentCategory.value;
        const stateVal = gameState.value;
        const answer = stateVal.answers[playerId]?.[category] || "";
        const votes = stateVal.votes[playerId]?.[category] || [];

        // RETURN OBJECT HELPER
        const buildStatus = (state: ReviewState, score: number) => ({
            playerId,
            answer,
            state,
            score,
            voteCount: votes.length,
            votesNeeded: 0,
            votesReceived: votes
        });

        // 1. Check Empty
        if (!answer || answer.trim() === "") {
            return buildStatus('EMPTY', 0);
        }

        // 2. Check Auto-Validation (Escudo Dorado 🛡️ — immune to votes)
        const backendStatus = stateVal.answerStatuses?.[playerId]?.[category];
        if (backendStatus === 'VALID_AUTO') {
            return buildStatus('VALID_AUTO', 100);
        }

        // 3. Check Votes (Progressive Tolerance)
        const activePlayersCount = stateVal.players.filter(p => p.isConnected).length;
        const juryPoolSize = Math.max(1, activePlayersCount - 1);
        const rejectionThreshold = Math.floor(juryPoolSize / 2) + 1;

        const voteCount = votes.length;
        const isRejected = voteCount >= rejectionThreshold;

        const buildWithVotes = (state: ReviewState, score: number) => ({
            playerId,
            answer,
            state,
            score,
            voteCount,
            votesNeeded: rejectionThreshold,
            votesReceived: votes
        });

        if (isRejected) {
            return buildWithVotes('REJECTED', 0);
        }

        // 4. Check Duplicates (Comparison)
        const normalizedAns = normalize(answer);
        let isDuplicate = false;

        for (const player of stateVal.players) {
            if (player.id === playerId) continue;
            const otherAns = stateVal.answers[player.id]?.[currentCategory.value];
            if (otherAns && normalize(otherAns) === normalizedAns) {
                isDuplicate = true;
                break;
            }
        }

        if (isDuplicate) {
            return buildWithVotes('DUPLICATE', 50);
        }

        // 5. Default Valid
        return buildWithVotes('VALID', 100);
    };

    return {
        getPlayerStatus
    };
}
