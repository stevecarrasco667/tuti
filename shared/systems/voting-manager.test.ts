import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VotingManager } from './voting-manager';
import { ValidationManager } from './validation-manager';
import { RoomState, Player } from '../types';

describe('VotingManager', () => {
    let votingManager: VotingManager;
    let mockValidation: any;
    let mockState: RoomState;

    beforeEach(() => {
        mockValidation = {
            processAnswer: vi.fn()
        } as unknown as ValidationManager;

        votingManager = new VotingManager(mockValidation);

        mockState = {
            status: 'REVIEW',
            players: [
                { id: 'p1', name: 'Alice', isConnected: true } as Player,
                { id: 'p2', name: 'Bob', isConnected: true } as Player,
                { id: 'p3', name: 'Charlie', isConnected: true } as Player,
            ],
            votes: {},
            whoFinishedVoting: []
        } as unknown as RoomState;
    });

    it('should allow a player to toggle a negative vote', () => {
        votingManager.toggleVote(mockState, 'p1', 'p2', 'Nombres');

        expect(mockState.votes['p2']['Nombres']).toContain('p1');

        // Toggle again should remove it
        votingManager.toggleVote(mockState, 'p1', 'p2', 'Nombres');

        expect(mockState.votes['p2']['Nombres']).not.toContain('p1');
    });

    it('should ignore votes if state is not REVIEW', () => {
        mockState.status = 'PLAYING';
        votingManager.toggleVote(mockState, 'p1', 'p2', 'Nombres');

        expect(mockState.votes['p2']).toBeUndefined();
    });

    it('should prevent a player from voting for themselves', () => {
        votingManager.toggleVote(mockState, 'p1', 'p1', 'Nombres');

        expect(mockState.votes['p1']).toBeUndefined();
    });

    it('should mark a player as finished voting and check consensus', () => {
        const isConsensus1 = votingManager.confirmVotes(mockState, 'p1');
        expect(isConsensus1).toBe(false);
        expect(mockState.whoFinishedVoting).toContain('p1');

        votingManager.confirmVotes(mockState, 'p2');
        const isConsensus3 = votingManager.confirmVotes(mockState, 'p3');
        
        expect(isConsensus3).toBe(true); // All 3 active players confirmed
    });

    it('should auto-confirm disconnected players (Ghost Player fix)', () => {
        // p3 disconnects
        mockState.players.find(p => p.id === 'p3')!.isConnected = false;

        // Auto-confirm disconnected players
        votingManager.autoConfirmDisconnectedPlayers(mockState);

        expect(mockState.whoFinishedVoting).toContain('p3');

        // Now only p1 and p2 are active, consensus should be reached with 2 confirms
        votingManager.confirmVotes(mockState, 'p1');
        const isConsensus = votingManager.confirmVotes(mockState, 'p2');

        expect(isConsensus).toBe(true);
    });

    it('should clean up votes targeting and coming from a disconnected player', () => {
        // p1 votes against p2
        votingManager.toggleVote(mockState, 'p1', 'p2', 'Nombres');
        // p3 votes against p1
        votingManager.toggleVote(mockState, 'p3', 'p1', 'Nombres');

        // p1 gets kicked/leaves
        const checkConsensus = votingManager.cleanupPlayerVotes(mockState, 'p1');

        expect(mockState.votes['p1']).toBeUndefined(); // Votes against p1 deleted
        expect(mockState.votes['p2']['Nombres']).not.toContain('p1'); // Votes by p1 deleted
        expect(checkConsensus).toBe(true); // Should re-check consensus because we are in REVIEW
    });
});
