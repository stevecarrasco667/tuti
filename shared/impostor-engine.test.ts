import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ImpostorEngine } from './engines/impostor-engine';
import { SupabaseClient } from '@supabase/supabase-js';

// ── Mock Supabase ─────────────────────────────────────────────────────────────
const mockSupabase = {
    from: () => ({
        select: () => ({
            eq: async () => ({ data: [{ id: 'cat-1' }, { id: 'cat-2' }] })
        })
    })
} as unknown as SupabaseClient;

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeEngine(onStateChange?: (s: any) => void) {
    return new ImpostorEngine(mockSupabase, 'TEST_ROOM', onStateChange);
}

function addPlayers(engine: ImpostorEngine, count: number) {
    for (let i = 0; i < count; i++) {
        engine.joinPlayer(`user-${i}`, `Player ${i}`, '🙂', `conn-${i}`);
    }
}

// Force the engine into an active Impostor game with known impostors.
// Bypasses the async startGame() to keep tests synchronous.
function forceIntoTypingPhase(engine: ImpostorEngine, impostorIds: string[]) {
    const state = engine.getState();
    state.status = 'TYPING';
    state.timers.roundEndsAt = Date.now() + 60000;
    state.impostorData = {
        currentCategoryId: 'cat-test',
        currentCategoryName: 'Test Category',
        alivePlayers: state.players.map(p => p.id),
        words: {},
        votes: {},
        voteCounts: {},
        readyPlayers: [],  // [P12]
    };
    // Inject impostor IDs directly into private field via hydrateSecrets
    engine.hydrateSecrets({
        secretWord: 'TestWord',
        currentImpostorIds: impostorIds,
        activeCategoryIds: ['cat-1'],
        usedWords: [],
        lastImpostorId: null,
    });
}

// ══════════════════════════════════════════════════════════════════════════════
// [Sprint P1/P2] Anti-Zombie Protocol + Grace Period Tests
// ══════════════════════════════════════════════════════════════════════════════
describe('[P1/P2] Anti-Zombie Protocol + Grace Period', () => {
    let engine: ImpostorEngine;
    const stateChangeSpy = vi.fn();

    beforeEach(() => {
        vi.useFakeTimers();             // Control setTimeout without real waiting
        stateChangeSpy.mockClear();
        engine = makeEngine(stateChangeSpy);
        addPlayers(engine, 3); // user-0 (host), user-1, user-2
    });

    afterEach(() => {
        vi.useRealTimers();             // Restore real timers after each test
    });

    it('should NOT end game immediately when impostor disconnects (grace period active)', () => {
        forceIntoTypingPhase(engine, ['user-1']);
        engine.playerDisconnected('conn-1');

        // Game should still be running — grace period of 15s has not elapsed
        expect(engine.getState().status).toBe('TYPING');
        expect(engine.getState().gameOverReason).toBeUndefined();
        expect(stateChangeSpy).not.toHaveBeenCalled();
    });

    it('should force CREW victory after grace period expires', () => {
        forceIntoTypingPhase(engine, ['user-1']);
        engine.playerDisconnected('conn-1');

        // Advance fake clock past the 15s grace period
        vi.advanceTimersByTime(15_001);

        const state = engine.getState();
        expect(state.status).toBe('GAME_OVER');
        expect(state.gameOverReason).toBe('IMPOSTOR_DISCONNECTED');
        expect(state.impostorData?.cycleResult?.winner).toBe('CREW');
        expect(state.impostorData?.cycleResult?.matchOver).toBe(true);
        expect(state.impostorData?.cycleResult?.revealedImpostorIds).toContain('user-1');
        expect(stateChangeSpy).toHaveBeenCalledTimes(1);
    });

    it('should cancel grace period and continue game if impostor reconnects in time', () => {
        forceIntoTypingPhase(engine, ['user-1']);
        engine.playerDisconnected('conn-1');

        // Reconnect before 15s
        vi.advanceTimersByTime(5_000);
        engine.cancelGracePeriod('user-1');

        // Advance past the original deadline — timer should have been cleared
        vi.advanceTimersByTime(15_000);

        expect(engine.getState().status).toBe('TYPING'); // Game continues
        expect(stateChangeSpy).not.toHaveBeenCalled();
    });

    it('should score crewmates after grace period expires', () => {
        forceIntoTypingPhase(engine, ['user-1']);
        engine.playerDisconnected('conn-1');
        vi.advanceTimersByTime(15_001);

        const state = engine.getState();
        expect(state.roundScores['user-0']).toBe(100);
        expect(state.roundScores['user-2']).toBe(100);
        expect(state.roundScores['user-1']).toBeUndefined();
    });

    it('should NOT trigger grace period when a crewmate disconnects', () => {
        forceIntoTypingPhase(engine, ['user-2']);
        engine.playerDisconnected('conn-1'); // user-1 is crewmate
        vi.advanceTimersByTime(15_001);

        expect(engine.getState().status).toBe('TYPING');
        expect(stateChangeSpy).not.toHaveBeenCalled();
    });

    it('should NOT trigger grace period when disconnection happens in LOBBY', () => {
        engine.hydrateSecrets({
            secretWord: null,
            currentImpostorIds: ['user-1'],
            activeCategoryIds: [],
            usedWords: [],
            lastImpostorId: null,
        });
        engine.playerDisconnected('conn-1');
        vi.advanceTimersByTime(15_001);

        expect(engine.getState().status).toBe('LOBBY');
        expect(stateChangeSpy).not.toHaveBeenCalled();
    });
});


// ══════════════════════════════════════════════════════════════════════════════
// [Sprint P1 — Fase 3] Secret Hydration Tests
// ══════════════════════════════════════════════════════════════════════════════
describe('[P1-F3] Secret Hydration', () => {
    let engine: ImpostorEngine;

    beforeEach(() => {
        engine = makeEngine();
    });

    it('should serialize private state correctly via getSecretState()', () => {
        // Inject secrets
        const mockSecrets = {
            secretWord: 'Elefante',
            currentImpostorIds: ['user-42'],
            activeCategoryIds: ['cat-A', 'cat-B'],
            usedWords: ['word-1', 'word-2'],
            lastImpostorId: 'user-41',
        };
        engine.hydrateSecrets(mockSecrets);

        // Serialize and verify
        const serialized = engine.getSecretState();
        expect(serialized.secretWord).toBe('Elefante');
        expect(serialized.currentImpostorIds).toEqual(['user-42']);
        expect(serialized.activeCategoryIds).toEqual(['cat-A', 'cat-B']);
        expect(serialized.usedWords).toEqual(['word-1', 'word-2']);
        expect(serialized.lastImpostorId).toBe('user-41');
    });

    it('should restore all secrets correctly via hydrateSecrets()', () => {
        const mockSecrets = {
            secretWord: 'Tigre',
            currentImpostorIds: ['user-99'],
            activeCategoryIds: ['cat-Z'],
            usedWords: ['wA', 'wB', 'wC'],
            lastImpostorId: 'user-98',
        };
        engine.hydrateSecrets(mockSecrets);

        // Verify via getSecretState round-trip
        const restored = engine.getSecretState();
        expect(restored).toEqual(mockSecrets);
    });

    it('should clear all secrets on clearSecrets()', () => {
        engine.hydrateSecrets({
            secretWord: 'Jirafa',
            currentImpostorIds: ['user-1'],
            activeCategoryIds: ['cat-1'],
            usedWords: ['word-1'],
            lastImpostorId: 'user-0',
        });

        engine.clearSecrets();

        const cleared = engine.getSecretState();
        expect(cleared.secretWord).toBeNull();
        expect(cleared.currentImpostorIds).toEqual([]);
        expect(cleared.activeCategoryIds).toEqual([]);
        expect(cleared.usedWords).toEqual([]);
        expect(cleared.lastImpostorId).toBeNull();
    });

    it('should clear secrets on restartGame()', async () => {
        addPlayers(engine, 1); // Proveer un host (conn-0) para el Host Guard
        engine.hydrateSecrets({
            secretWord: 'León',
            currentImpostorIds: ['user-1'],
            activeCategoryIds: ['cat-1'],
            usedWords: [],
            lastImpostorId: null,
        });

        await engine.restartGame('conn-0');

        const cleared = engine.getSecretState();
        expect(cleared.secretWord).toBeNull();
        expect(cleared.currentImpostorIds).toEqual([]);
    });

    it('should survive a serialize → deserialize cycle (full round-trip)', () => {
        const original = {
            secretWord: 'Cocodrilo',
            currentImpostorIds: ['u1', 'u2'],
            activeCategoryIds: ['cA'],
            usedWords: ['w1', 'w2', 'w3'],
            lastImpostorId: 'u0',
        };

        // Simulate Worker persistence: serialize, then create new engine and restore
        engine.hydrateSecrets(original);
        const serialized = engine.getSecretState();

        const newEngine = makeEngine();
        newEngine.hydrateSecrets(serialized);

        const final = newEngine.getSecretState();
        expect(final).toEqual(original);
    });
});
