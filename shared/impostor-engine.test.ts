import { describe, it, expect, beforeEach, vi } from 'vitest';
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
        currentCategoryName: 'Test Category',
        alivePlayers: state.players.map(p => p.id),
        words: {},
        votes: {},
        voteCounts: {},
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
// [Sprint P1 — Fase 2] Anti-Zombie Protocol Tests
// ══════════════════════════════════════════════════════════════════════════════
describe('[P1-F2] Anti-Zombie Protocol', () => {
    let engine: ImpostorEngine;
    const stateChangeSpy = vi.fn();

    beforeEach(() => {
        stateChangeSpy.mockClear();
        engine = makeEngine(stateChangeSpy);
        addPlayers(engine, 3); // user-0 (host), user-1, user-2
    });

    it('should force CREW victory when impostor disconnects during TYPING phase', () => {
        // Setup: user-1 is the impostor
        forceIntoTypingPhase(engine, ['user-1']);

        // Act: user-1 (impostor) disconnects
        engine.playerDisconnected('conn-1');

        const state = engine.getState();
        expect(state.status).toBe('GAME_OVER');
        expect(state.gameOverReason).toBe('IMPOSTOR_DISCONNECTED');
        expect(state.impostorData?.cycleResult?.winner).toBe('CREW');
        expect(state.impostorData?.cycleResult?.matchOver).toBe(true);
        expect(state.impostorData?.cycleResult?.revealedImpostorIds).toContain('user-1');

        // Verify that the server was notified via the callback
        expect(stateChangeSpy).toHaveBeenCalledTimes(1);
    });

    it('should NOT trigger when a crewmate disconnects', () => {
        // Setup: user-2 is the impostor, user-1 is a crewmate who disconnects
        forceIntoTypingPhase(engine, ['user-2']);

        engine.playerDisconnected('conn-1'); // user-1 disconnects (crewmate)

        const state = engine.getState();
        expect(state.status).toBe('TYPING'); // Game must continue
        expect(state.gameOverReason).toBeUndefined();
        expect(stateChangeSpy).not.toHaveBeenCalled();
    });

    it('should NOT trigger if disconnection happens in LOBBY', () => {
        // Setup: engine stays in LOBBY, but inject impostor IDs
        engine.hydrateSecrets({
            secretWord: null,
            currentImpostorIds: ['user-1'],
            activeCategoryIds: [],
            usedWords: [],
            lastImpostorId: null,
        });

        engine.playerDisconnected('conn-1');

        const state = engine.getState();
        expect(state.status).toBe('LOBBY'); // No game phase change
        expect(stateChangeSpy).not.toHaveBeenCalled();
    });

    it('should score crewmates upon Anti-Zombie victory', () => {
        // user-1 is impostor, user-0 and user-2 are crewmates
        forceIntoTypingPhase(engine, ['user-1']);
        engine.playerDisconnected('conn-1');

        const state = engine.getState();
        // Crewmates should get 100 points
        expect(state.roundScores['user-0']).toBe(100);
        expect(state.roundScores['user-2']).toBe(100);
        // Impostor gets no points
        expect(state.roundScores['user-1']).toBeUndefined();
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
