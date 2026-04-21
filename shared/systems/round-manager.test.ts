import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RoundManager } from './round-manager';
import { RoomState, GameConfig, Player } from '../types';

describe('RoundManager', () => {
    let roundManager: RoundManager;
    let mockState: RoomState;
    let mockConfig: GameConfig;

    beforeEach(() => {
        vi.useFakeTimers();
        roundManager = new RoundManager();

        mockConfig = {
            mode: 'CLASSIC',
            classic: { rounds: 3, timeLimit: 60, categories: ['A', 'B'], votingDuration: 30 },
            impostor: { rounds: 3, timeLimit: 60 }
        } as unknown as GameConfig;

        mockState = {
            status: 'LOBBY',
            roundsPlayed: 0,
            players: [
                { id: 'p1', filledCount: 5 } as Player,
                { id: 'p2', filledCount: 2 } as Player
            ],
            timers: { roundEndsAt: null, votingEndsAt: null },
            answers: { 'p1': { 'A': 'x' } },
            votes: { 'p1': {} },
            uiMetadata: {}
        } as unknown as RoomState;
    });

    afterEach(() => {
        vi.useRealTimers();
        roundManager.cancelTimer();
    });

    it('should start a round correctly, resetting state and setting timers', () => {
        const onTimeUp = vi.fn();

        roundManager.startRound(mockState, mockConfig, onTimeUp);

        // State changes
        expect(mockState.status).toBe('PLAYING');
        expect(mockState.answers).toEqual({});
        expect(mockState.votes).toEqual({});
        expect(mockState.currentLetter).toMatch(/^[A-Z]$/);
        
        // Player filledCount reset
        expect(mockState.players[0].filledCount).toBe(0);

        // Timer set correctly (60s limit)
        expect(mockState.timers.roundEndsAt).toBeGreaterThan(Date.now());
        
        // Timer callback validation
        vi.advanceTimersByTime(60000);
        expect(onTimeUp).toHaveBeenCalled();
    });

    it('should stop the round and transition to REVIEW', () => {
        roundManager.stopRound(mockState, mockConfig);

        expect(mockState.status).toBe('REVIEW');
        expect(mockState.timers.roundEndsAt).toBeNull();
        expect(mockState.timers.votingEndsAt).toBeGreaterThan(Date.now());
        expect(mockState.uiMetadata?.showTimer).toBe(true);
        expect(mockState.uiMetadata?.targetTime).toBe(mockState.timers.votingEndsAt);
    });

    it('should handle nextRound continuing the game', () => {
        const hasNext = roundManager.nextRound(mockState, mockConfig);

        expect(hasNext).toBe(true);
        expect(mockState.roundsPlayed).toBe(1);
        expect(mockState.status).toBe('LOBBY'); // Remains LOBBY or previous state, the engine changes it to PLAYING on restart
    });

    it('should handle nextRound triggering GAME_OVER if max rounds reached', () => {
        mockState.roundsPlayed = 2; // We play round 3 now (index 2)

        const hasNext = roundManager.nextRound(mockState, mockConfig);

        expect(hasNext).toBe(false);
        expect(mockState.roundsPlayed).toBe(3);
        expect(mockState.status).toBe('GAME_OVER');
        expect(mockState.gameOverReason).toBe('NORMAL');
        expect(mockState.gameOverAt).toBeDefined();
    });
});
