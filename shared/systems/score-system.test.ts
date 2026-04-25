import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScoreSystem } from './score-system';
import { ValidationManager } from './validation-manager';
import { RoomState, Player } from '../types';

describe('ScoreSystem', () => {
    let scoreSystem: ScoreSystem;
    let mockValidation: any;
    let mockState: RoomState;

    beforeEach(() => {
        // Mock ValidationManager and DictionaryManager
        const hasExactMock = vi.fn().mockReturnValue(false);
        mockValidation = {
            getDictionaryManager: vi.fn(() => ({
                hasExact: hasExactMock
            }))
        } as unknown as ValidationManager;

        scoreSystem = new ScoreSystem(mockValidation);

        // Basic RoomState setup
        mockState = {
            status: 'REVIEW',
            config: { lang: 'es' },
            players: [
                { id: 'p1', name: 'Alice', score: 0, isConnected: true } as Player,
                { id: 'p2', name: 'Bob', score: 0, isConnected: true } as Player,
                { id: 'p3', name: 'Charlie', score: 0, isConnected: true } as Player,
            ],
            categories: [
                { id: 'cat-nombres', name: 'Nombres', icon: '' },
                { id: 'cat-colores', name: 'Colores', icon: '' }
            ],
            answers: {},
            votes: {},
            answerStatuses: {},
            roundScores: {},
            timers: { votingEndsAt: 123456789, resultsEndsAt: null },
            whoFinishedVoting: [],
            currentLetter: 'A'
        } as unknown as RoomState;
    });

    it('should assign 100 points for a unique valid answer', () => {
        mockState.answers = {
            'p1': { 'Nombres': 'Ana' },
            'p2': { 'Nombres': 'Alberto' },
            'p3': { 'Nombres': 'Arturo' }
        };

        scoreSystem.calculate(mockState);

        expect(mockState.status).toBe('RESULTS');
        expect(mockState.answerStatuses['p1']['Nombres']).toBe('VALID');
        expect(mockState.roundScores['p1']).toBe(100);
        expect(mockState.roundScores['p2']).toBe(100);
        expect(mockState.roundScores['p3']).toBe(100);
    });

    it('should assign 50 points for a duplicate valid answer (case insensitive and accents ignored)', () => {
        mockState.answers = {
            'p1': { 'Nombres': 'Ana' },
            'p2': { 'Nombres': 'ana' }, // Duplicate of p1
            'p3': { 'Nombres': 'Ána' }  // Duplicate of p1 (accent)
        };

        scoreSystem.calculate(mockState);

        expect(mockState.answerStatuses['p1']['Nombres']).toBe('DUPLICATE');
        expect(mockState.answerStatuses['p2']['Nombres']).toBe('DUPLICATE');
        expect(mockState.answerStatuses['p3']['Nombres']).toBe('DUPLICATE');
        
        expect(mockState.roundScores['p1']).toBe(50);
        expect(mockState.roundScores['p2']).toBe(50);
        expect(mockState.roundScores['p3']).toBe(50);
    });

    it('should assign 0 points and mark INVALID if empty or whitespace', () => {
        mockState.answers = {
            'p1': { 'Nombres': '  ' }, // Empty spaces
            'p2': { 'Nombres': '' },   // Empty string
            'p3': { 'Nombres': 'Ana' } // Valid
        };

        scoreSystem.calculate(mockState);

        expect(mockState.answerStatuses['p1']['Nombres']).toBe('INVALID');
        expect(mockState.answerStatuses['p2']['Nombres']).toBe('INVALID');
        expect(mockState.answerStatuses['p3']['Nombres']).toBe('VALID');
        
        expect(mockState.roundScores['p1']).toBe(0);
        expect(mockState.roundScores['p2']).toBe(0);
        expect(mockState.roundScores['p3']).toBe(100);
    });

    it('should assign 0 points and mark INVALID if >= 50% players vote negative', () => {
        mockState.answers = {
            'p1': { 'Nombres': 'Avión' }, // Invalid as a name
            'p2': { 'Nombres': 'Alberto' },
            'p3': { 'Nombres': 'Arturo' }
        };

        // p2 and p3 vote negative against p1's 'Nombres'
        mockState.votes = {
            'p1': {
                'Nombres': ['p2', 'p3']
            }
        };

        scoreSystem.calculate(mockState);

        expect(mockState.answerStatuses['p1']['Nombres']).toBe('INVALID');
        expect(mockState.roundScores['p1']).toBe(0);
        expect(mockState.roundScores['p2']).toBe(100);
    });

    it('should skip voting invalidation if answer is auto-validated (VALID_AUTO)', () => {
        // Mock that 'América' is auto-validated in 'Nombres'
        const dictManager = mockValidation.getDictionaryManager();
        // New 3-arg signature: hasExact(lang, categoryId, word)
        (dictManager.hasExact as any).mockImplementation((lang: string, catId: string, word: string) => {
            return catId === 'cat-nombres' && word === 'América';
        });

        mockState.answers = {
            'p1': { 'Nombres': 'América' },
            'p2': { 'Nombres': 'Alberto' },
            'p3': { 'Nombres': 'Arturo' }
        };

        // Even if everyone votes negative against p1, auto-validation protects it
        mockState.votes = {
            'p1': {
                'Nombres': ['p2', 'p3']
            }
        };

        scoreSystem.calculate(mockState);

        expect(mockState.answerStatuses['p1']['Nombres']).toBe('VALID_AUTO');
        expect(mockState.roundScores['p1']).toBe(100); // Points are still given
    });

    it('should clear voting timer and set results timer', () => {
        mockState.answers = {};
        
        scoreSystem.calculate(mockState);

        expect(mockState.timers.votingEndsAt).toBeNull();
        expect(mockState.timers.resultsEndsAt).toBeGreaterThan(Date.now());
    });
});
