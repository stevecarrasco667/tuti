import { RoomState, Player } from './types.js';

export class GameEngine {
    private state: RoomState;

    private connections: Map<string, string>; // ConnectionId -> UserId

    constructor(roomId: string) {
        this.state = {
            status: 'LOBBY',
            players: [],
            roomId: roomId,
            currentLetter: null,
            categories: ['Nombre', 'Color', 'Fruta', 'País', 'Cosa'], // Default categories
            answers: {},
            roundsPlayed: 0,
            // Voting System Initial State
            votes: {},
            whoFinishedVoting: [],
            roundScores: {}
        };
        this.connections = new Map();
    }

    public getState(): RoomState {
        return this.state;
    }

    public joinPlayer(userId: string, name: string, connectionId: string): RoomState {
        this.connections.set(connectionId, userId);

        const existingPlayer = this.state.players.find(p => p.id === userId);
        if (existingPlayer) {
            existingPlayer.name = name; // Update name if joined again
            // Ensure they are host if they were host (state preserves it)
            return this.state;
        }

        const newPlayer: Player = {
            id: userId,
            name,
            score: 0,
            isHost: this.state.players.length === 0 // First player is host
        };

        this.state.players.push(newPlayer);
        return this.state;
    }

    public playerDisconnected(connectionId: string): RoomState {
        const userId = this.connections.get(connectionId);
        if (userId) {
            this.connections.delete(connectionId);
            // We do NOT remove the player from the list to support reconnection (F5).
            // They remain in the state.

            // Note: If we wanted to reassign host on long disconnection, we'd need a timer or explicit "leave" action.
            // For now, we trust the host comes back or the room dies if everyone leaves.
        }
        return this.state;
    }

    public startGame(connectionId: string): RoomState {
        const userId = this.connections.get(connectionId);
        if (!userId) return this.state;

        const player = this.state.players.find(p => p.id === userId);
        if (player && player.isHost) {
            this.state.status = 'PLAYING';
            this.state.currentLetter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(Math.floor(Math.random() * 26));
            this.state.answers = {}; // Reset answers for new round
            // Reset Voting System
            this.state.votes = {};
            this.state.whoFinishedVoting = [];
            this.state.roundScores = {};
        }
        return this.state;
    }

    public stopRound(connectionId: string, answers: Record<string, string>): RoomState {
        const userId = this.connections.get(connectionId);
        if (!userId) return this.state;

        const player = this.state.players.find(p => p.id === userId);
        if (player && this.state.status === 'PLAYING') {
            this.state.status = 'REVIEW';
            this.state.answers[userId] = answers;
        }
        return this.state;
    }

    public submitAnswers(connectionId: string, answers: Record<string, string>): RoomState {
        const userId = this.connections.get(connectionId);
        if (!userId) return this.state;

        const player = this.state.players.find(p => p.id === userId);
        if (player && (this.state.status === 'PLAYING' || this.state.status === 'REVIEW')) {
            this.state.answers[userId] = answers;
        }
        return this.state;
    }
    public toggleVote(connectionId: string, targetUserId: string, category: string): RoomState {
        const userId = this.connections.get(connectionId);
        if (!userId || this.state.status !== 'REVIEW') return this.state;
        if (userId === targetUserId) return this.state; // Cannot vote self

        if (!this.state.votes[targetUserId]) this.state.votes[targetUserId] = {};
        if (!this.state.votes[targetUserId][category]) this.state.votes[targetUserId][category] = [];

        const voters = this.state.votes[targetUserId][category];
        const index = voters.indexOf(userId);
        if (index === -1) {
            voters.push(userId); // Vote negative
        } else {
            voters.splice(index, 1); // Remove negative vote
        }
        return this.state;
    }

    public confirmVotes(connectionId: string): RoomState {
        const userId = this.connections.get(connectionId);
        if (!userId || this.state.status !== 'REVIEW') return this.state;

        if (!this.state.whoFinishedVoting.includes(userId)) {
            this.state.whoFinishedVoting.push(userId);
        }

        // Check consensus (naive check: all players must confirm)
        if (this.state.whoFinishedVoting.length === this.state.players.length) {
            this.calculateResults();
        }

        return this.state;
    }

    private calculateResults() {
        this.state.status = 'RESULTS';
        const totalPlayers = this.state.players.length;

        this.state.players.forEach(player => {
            let roundScore = 0;
            const answers = this.state.answers[player.id] || {};

            for (const category of this.state.categories) {
                const answer = answers[category];
                // Empty answer = 0
                if (!answer || !answer.trim()) continue;

                // Check negative votes
                const negativeVotes = this.state.votes[player.id]?.[category]?.length || 0;

                // Majority rules (> 50%)
                if (negativeVotes > totalPlayers / 2) {
                    continue; // Invalidated
                }

                // Initial MVP scoring: 100 points per valid word
                roundScore += 100;
            }

            this.state.roundScores[player.id] = roundScore;
            player.score += roundScore;
        });
    }
}
