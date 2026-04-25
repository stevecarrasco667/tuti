import { RoomState } from '../types';
import { ValidationManager } from './validation-manager';

export class VotingManager {
    constructor(private validation: ValidationManager) { }

    public toggleVote(state: RoomState, voterId: string, targetId: string, category: string): void {
        // Validation: Must be in REVIEW, cannot vote self
        if (state.status !== 'REVIEW') return;
        if (voterId === targetId) return;

        // Initialize structure if missing
        if (!state.votes[targetId]) state.votes[targetId] = {};
        if (!state.votes[targetId][category]) state.votes[targetId][category] = [];

        const voters = state.votes[targetId][category];
        const index = voters.indexOf(voterId);

        if (index === -1) {
            voters.push(voterId); // Add negative vote
        } else {
            voters.splice(index, 1); // Remove negative vote
        }
    }

    public confirmVotes(state: RoomState, voterId: string): boolean {
        if (state.status !== 'REVIEW') return false;

        if (!state.whoFinishedVoting.includes(voterId)) {
            state.whoFinishedVoting.push(voterId);
        }

        return this.checkConsensus(state);
    }

    public checkConsensus(state: RoomState): boolean {
        const activePlayers = state.players.filter(p => p.isConnected);
        const confirmedActivePlayers = activePlayers.filter(p => state.whoFinishedVoting.includes(p.id));

        return confirmedActivePlayers.length === activePlayers.length && activePlayers.length > 0;
    }

    // [Sprint 1 - Phase 3] Ghost Player Fix:
    // Auto-confirms disconnected players so they don't block voting consensus.
    // Call this BEFORE checkConsensus whenever a player disconnects mid-review.
    public autoConfirmDisconnectedPlayers(state: RoomState): void {
        state.players
            .filter(p => !p.isConnected && !state.whoFinishedVoting.includes(p.id))
            .forEach(p => {
                console.log(`[Ghost Player] Auto-confirming vote for disconnected player: ${p.id}`);
                state.whoFinishedVoting.push(p.id);
            });
    }

    public cleanupPlayerVotes(state: RoomState, targetUserId: string): boolean {
        // Remove votes received by this player
        delete state.votes[targetUserId];

        // Remove votes cast by this player against others
        for (const targetId in state.votes) {
            for (const category in state.votes[targetId]) {
                const voters = state.votes[targetId][category];
                const idx = voters.indexOf(targetUserId);
                if (idx !== -1) {
                    voters.splice(idx, 1);
                }
            }
        }

        // Return true if this cleanup might affect consensus
        return state.status === 'REVIEW';
    }

    public injectAutomatedVotes(state: RoomState): void {
        // In 1v1 mode: if a player's answer is INVALID, the opponent's vote is automatically injected
        // so that the ScoreSystem can attribute the rejection correctly in the UI.
        const activePlayers = state.players.filter(p => p.isConnected);
        const currentLetter = state.currentLetter;
        if (!currentLetter) return;

        state.players.forEach(player => {
            for (const category of state.categories) {
                const catName = category.name;
                const answer = state.answers[player.id]?.[catName] || '';
                const valResult = this.validation.processAnswer(state.config.lang || 'es', answer, currentLetter, catName);

                if (valResult.status === 'INVALID') {
                    if (activePlayers.length === 2) {
                        const otherPlayer = activePlayers.find(p => p.id !== player.id);
                        if (otherPlayer) {
                            this.toggleVote(state, otherPlayer.id, player.id, catName);
                            if (!state.votes[player.id]) state.votes[player.id] = {};
                            if (!state.votes[player.id][catName]) state.votes[player.id][catName] = [];
                            if (!state.votes[player.id][catName].includes(otherPlayer.id)) {
                                state.votes[player.id][catName].push(otherPlayer.id);
                            }
                        }
                    }
                }
            }
        });
    }

}
