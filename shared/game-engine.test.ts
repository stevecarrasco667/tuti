import { describe, it, expect, beforeEach } from 'vitest';
import { TutiEngine } from './engines/tuti-engine';

describe('TutiEngine Core', () => {
    let engine: TutiEngine;
    const roomId = 'TEST_ROOM';
    const hostId = 'user-host';
    const hostConn = 'conn-host';

    beforeEach(() => {
        engine = new TutiEngine(roomId);
    });


    // --- 3.A: VALIDATION MANAGER INTEGRATION ---
    describe('ValidationManager Integration within TutiEngine', () => {
        let engine: TutiEngine;

        beforeEach(() => {
            engine = new TutiEngine('test-room');
            const state = engine.getState();
            state.status = 'PLAYING';
            state.currentLetter = 'A';
            state.categories = ['Fruta', 'País'];
            state.players = [{ id: 'p1', name: 'Tester', score: 0, isHost: true, isConnected: true, lastSeenAt: Date.now(), avatar: '🙂' }];
        });

        it('should normalize input (trim, uppercase, remove accents)', () => {
            // " Árbol " -> "ARBOL"
            const result = engine.validation.processAnswer(' Árbol ', 'A', 'Profesión');
            expect(result.text).toBe('ARBOL');
            expect(result.status).toBe('PENDING'); // Valid matching letter
        });

        it('should reject words starting with wrong letter', () => {
            // "Barco" vs "A" -> INVALID
            const result = engine.validation.processAnswer('Barco', 'A', 'Profesión');
            expect(result.status).toBe('INVALID');
            expect(result.text).toBe('BARCO');
        });

        it('should handle empty strings as EMPTY', () => {
            const result = engine.validation.processAnswer('   ', 'A', 'Profesión');
            expect(result.status).toBe('EMPTY');
            expect(result.text).toBe('');
        });
    });

    // --- 3.C: VOTING MANAGER INTEGRATION ---
    describe('VotingManager Integration', () => {
        let engine: TutiEngine;
        beforeEach(() => {
            engine = new TutiEngine('test-room');
            engine.joinPlayer('p1', 'P1', 'av', 'c1');
            engine.joinPlayer('p2', 'P2', 'av', 'c2');
            const state = engine.getState();
            state.status = 'REVIEW'; // Must be in REVIEW for voting
            state.players[0].isConnected = true;
            state.players[1].isConnected = true;
        });

        it('should toggle votes correctly', () => {
            // P1 votes against P2 in Category 'A'
            engine.toggleVote('c1', 'p2', 'A');
            const state = engine.getState();
            expect(state.votes['p2']['A']).toContain('p1');

            // Toggle off
            engine.toggleVote('c1', 'p2', 'A');
            expect(state.votes['p2']['A']).not.toContain('p1');
        });

        it('should prevent self-voting', () => {
            engine.toggleVote('c1', 'p1', 'A');
            const state = engine.getState();
            expect(state.votes['p1']).toBeUndefined();
        });

        it('should handle confirmation and consensus', () => {
            // Verify initial state
            expect(engine.getState().whoFinishedVoting).toHaveLength(0);

            // P1 confirms
            engine.confirmVotes('c1');
            expect(engine.getState().whoFinishedVoting).toContain('p1');
            expect(engine.getState().status).toBe('REVIEW'); // Still waiting for P2

            // P2 confirms -> Consensus -> Results
            engine.confirmVotes('c2');
            expect(engine.getState().status).toBe('RESULTS');
        });

        it('should reject answer with 50% negative votes (1vs1 scenario)', () => {
            // P1 votes against P2
            engine.toggleVote('c1', 'p2', 'A');

            // Initial check: Vote is recorded
            expect(engine.getState().votes['p2']['A']).toContain('p1');

            // Set answers so we can calculate results
            const state = engine.getState();
            state.categories = ['A']; // Must exist for ScoreSystem to iterate
            state.answers['p1'] = { 'A': 'Manzana' };
            state.answers['p2'] = { 'A': 'Pera' };

            // Force Calculation Logic (usually requires Confirm, but we test ScoreSystem via Engine)
            // We need to trigger calculateResults via confirm or direct call. 
            // Let's use confirm to be integration-style.
            engine.confirmVotes('c1');
            engine.confirmVotes('c2');

            expect(state.status).toBe('RESULTS');
            // P2 should be INVALID because 1 vote out of 2 players = 50% >= 50%
            expect(state.answerStatuses['p2']['A']).toBe('INVALID');

            // P1 should be VALID (0 votes against)
            expect(state.answerStatuses['p1']['A']).toBe('VALID');
        });
    });

    // A. Inicialización y Gestión de Salas
    describe('Initialization & Player Management', () => {
        it('should initialize in LOBBY status', () => {
            const state = engine.getState();
            expect(state.status).toBe('LOBBY');
            expect(state.players).toHaveLength(0);
        });

        it('should add players correctly', () => {
            engine.joinPlayer(hostId, 'Host', 'avatar1', hostConn);
            const state = engine.getState();

            expect(state.players).toHaveLength(1);
            expect(state.players[0].id).toBe(hostId);
            expect(state.players[0].name).toBe('Host');
            expect(state.players[0].isHost).toBe(true);

            // Add second player
            engine.joinPlayer('user-2', 'Guest', 'avatar2', 'conn-2');
            expect(engine.getState().players).toHaveLength(2);
            expect(engine.getState().players[1].isHost).toBe(false);
        });

        it('should start game', () => {
            engine.joinPlayer(hostId, 'Host', 'avatar1', hostConn);
            engine.joinPlayer('user-2', 'Guest', 'avatar2', 'conn-2');

            engine.startGame(hostConn);

            const state = engine.getState();
            expect(state.status).toBe('PLAYING');
            expect(state.currentLetter).not.toBeNull();
            expect(state.timers.roundEndsAt).not.toBeNull();
        });
    });

    // --- 3.B: CONFIGURATION MANAGER INTEGRATION ---
    describe('ConfigurationManager Integration', () => {
        let engine: TutiEngine;
        beforeEach(() => { engine = new TutiEngine('test-room'); });

        it('should use default config on init', () => {
            const config = engine.getState().config;
            expect(config.rounds).toBe(5);
            expect(config.timeLimit).toBe(60);
        });

        it('should enforce limits on updateConfig', () => {
            // Mock Host
            engine.joinPlayer(hostId, 'Host', 'av', hostConn);

            // Try setting -5 rounds
            engine.updateConfig(hostConn, { rounds: -5 });
            expect(engine.getState().config.rounds).toBe(1); // Min 1

            // Try setting 100 rounds
            engine.updateConfig(hostConn, { rounds: 100 });
            expect(engine.getState().config.rounds).toBe(20); // Max 20
        });
    });

    // B. Cálculo de Puntajes
    describe('Scoring Logic', () => {
        it('should calculate scores correctly (Unique/Duplicate/Empty/Invalid)', () => {
            // Setup Players
            const pA = 'player-A'; const cA = 'conn-A';
            const pB = 'player-B'; const cB = 'conn-B';
            const pC = 'player-C'; const cC = 'conn-C';
            const pD = 'player-D'; const cD = 'conn-D';
            const pE = 'player-E'; const cE = 'conn-E';

            engine.joinPlayer(pA, 'A', 'av', cA);
            engine.joinPlayer(pB, 'B', 'av', cB);
            engine.joinPlayer(pC, 'C', 'av', cC);
            engine.joinPlayer(pD, 'D', 'av', cD);
            engine.joinPlayer(pE, 'E', 'av', cE);

            engine.startGame(cA);

            // Mock categories and letter to control validation
            // We force 'Fruta' as the first category and 'M' as letter for 'Manzana' example
            const state = engine.getState();
            state.categories = ['Fruta'];
            state.currentLetter = 'M'; // Though our manual validation bypasses this if we want, but let's be consistent

            // To test scoring purely, we need to bypass strict letter validation or ensure inputs match.
            // The prompt asks for: "Manzana" (Unique), "Pera" (Repeated), etc.
            // Let's assume strict validation is ON, so we need to mock currentLetter or use words that match (or just inject directly if possible).
            // Actually, submitAnswers validates. Let's use internal state manipulation for setup if needed, or just standard flow.
            // Standard flow:
            // A: Manzana
            // B: Pera
            // C: Pera
            // D: ""
            // E: Xylofono (Rechazada)

            // Problem: If currentLetter is random, "Manzana" might be invalid.
            // Let's FORCE currentLetter to 'M' (Manzana) or 'P' (Pera)... waits, different letters.
            // Validator checks checking `startsWith`.
            // Let's FORCE validation logic to pass or inject 'M' and ignore others?
            // "Xylofono" needs to be voted out. "Manzana" needs to be unique. "Pera" repeated.
            // Just force currentLetter to null or update it to match nothing to disable check?
            // Looking at `validateAndSanitizeAnswers`:
            // `if (allowedLetter && ...)` 
            // If we set currentLetter to null, validation is skipped?
            // `state.currentLetter` is nullable in Types, but `startGame` sets it.
            // Let's overwrite it to null for this test to focus on duplicates/empty logic.
            state.currentLetter = null;

            // Submit Answers
            // A: Manzana
            engine.submitAnswers(cA, { 'Fruta': 'Manzana' });
            // B: Pera
            engine.submitAnswers(cB, { 'Fruta': 'Pera' });
            // C: Pera
            engine.submitAnswers(cC, { 'Fruta': 'Pera' });
            // D: "" (Empty)
            engine.submitAnswers(cD, { 'Fruta': '' });
            // E: Xylofono (Will be voted out)
            engine.submitAnswers(cE, { 'Fruta': 'Xylofono' });

            // Force End Round -> Review
            (engine as any).handleTimeUp();

            // Perform Voting: Reject Player E's "Xylofono"
            // Everyone votes against E
            engine.toggleVote(cA, pE, 'Fruta');
            engine.toggleVote(cB, pE, 'Fruta');
            engine.toggleVote(cC, pE, 'Fruta');
            // 3/5 votes > 50% ? 3 > 2.5 -> Yes.

            // Confirm votes to proceed to results
            engine.confirmVotes(cA);
            engine.confirmVotes(cB);
            engine.confirmVotes(cC);
            engine.confirmVotes(cD);
            engine.confirmVotes(cE);

            // Now check scores in RESULTS state
            const finalState = engine.getState();
            expect(finalState.status).toBe('RESULTS');

            // Verify points
            // A (Unique): 100
            expect(finalState.roundScores[pA]).toBe(100);

            // B (Repeated): 50
            expect(finalState.roundScores[pB]).toBe(50);

            // C (Repeated): 50
            expect(finalState.roundScores[pC]).toBe(50);

            // D (Empty): 0
            expect(finalState.roundScores[pD]).toBe(0);

            // E (Invalid/Voted): 0
            expect(finalState.roundScores[pE]).toBe(0);
        });
    });

    // C. Validaciones de Seguridad
    describe('Security checks', () => {
        it('should ignore start game from non-host', () => {
            engine.joinPlayer(hostId, 'Host', 'av1', hostConn);
            engine.joinPlayer('guest', 'Guest', 'av2', 'conn-guest');

            // Attempt start from guest
            // Attempt start from guest
            expect(() => engine.startGame('conn-guest')).toThrow();

            expect(engine.getState().status).toBe('LOBBY');
        });
    });

    // C. Regresión y Estabilidad
    describe('Regression & Stability', () => {
        it('Regression: Memory Leak Check (Round Reset)', () => {
            // 1. Setup & Start Round 1
            const p1 = 'p1'; const c1 = 'c1';
            engine.joinPlayer(p1, 'Player 1', 'av', c1);
            engine.startGame(c1);

            // 2. Pollute State (Simulate Round 1 Data)
            const state = engine.getState();
            state.answers[p1] = { 'Cat1': 'Val1' };
            state.votes[p1] = { 'Cat1': ['p2'] };
            state.roundScores[p1] = 10;
            state.answerStatuses[p1] = { 'Cat1': 'VALID' };

            // 3. End Round 1 (Simulate flow)
            state.status = 'RESULTS';

            // 4. Start Round 2
            engine.startGame(c1); // Helper validation might block if not Host, but p1 is Host (first joined)

            // 5. Assert Tabula Rasa
            const newState = engine.getState();
            expect(newState.status).toBe('PLAYING');

            // CRITICAL CHECKS
            expect(newState.answers).toEqual({});
            expect(newState.votes).toEqual({});
            expect(newState.roundScores).toEqual({}); // The fix we implemented
            expect(newState.answerStatuses).toEqual({});
            expect(newState.whoFinishedVoting).toEqual([]);
        });
    });
});
