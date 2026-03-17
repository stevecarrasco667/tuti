import { describe, it, expect, beforeEach, vi } from 'vitest';
import Server from '../server';
import { createMockConnection, createMockRoom, createMockContext } from './mocks';
import { ClientMessage, RoomState } from '../../shared/types';
import * as Party from "partykit/server";

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        from: vi.fn((table: string) => ({
            select: vi.fn((_columns: string) => ({
                eq: vi.fn(async (_col: string, _val: string) => {
                    if (table === 'categories') return { data: [{ id: '1', name: 'A' }, { id: '2', name: 'B' }] };
                    if (table === 'words') return { data: [{ id: '1', word: 'Manzana' }, { id: '2', word: 'Pera' }] };
                    return { data: [] };
                })
            }))
        }))
    }))
}));

describe('Server Integration - Game Flow', () => {
    let mockRoom: Party.Room;
    let server: Server;
    let host: Party.Connection;
    let guest: Party.Connection;

    beforeEach(async () => {
        mockRoom = createMockRoom('GAME_TEST');
        mockRoom.env = { SUPABASE_URL: 'http://mock-supabase.local', SUPABASE_ANON_KEY: 'mock-key' };
        server = new Server(mockRoom);

        host = createMockConnection('host_user');
        guest = createMockConnection('guest_user');

        // Register connections in room for per-connection broadcast iteration
        (mockRoom as any).connections.set(host.id, host);
        (mockRoom as any).connections.set(guest.id, guest);

        // Setup: Join Host and Guest
        await server.onConnect(host, createMockContext('http://localhost/?name=Host'));
        await server.onConnect(guest, createMockContext('http://localhost/?name=Guest'));

        vi.clearAllMocks(); // Clear join broadcasts
    });

    // Helper to access internal engine state for assertions (uses public API)
    const getState = (): RoomState => server.engine.getState();

    it('Host should be able to start game', async () => {
        const msg: ClientMessage = { type: 'START_GAME' };
        await server.onMessage(JSON.stringify(msg), host);

        expect(getState().status).toBe('PLAYING');
        // With State Masking, broadcastState sends per-connection via conn.send()
        expect(host.send).toHaveBeenCalled();
    });

    it('Guest should NOT be able to start game', async () => {
        const msg: ClientMessage = { type: 'START_GAME' };
        await server.onMessage(JSON.stringify(msg), guest);

        expect(getState().status).toBe('LOBBY'); // Should stay in Lobby
    });

    it('Should handle full round flow', async () => {
        // 1. Start Game
        await server.onMessage(JSON.stringify({ type: 'START_GAME' } as ClientMessage), host);
        expect(getState().status).toBe('PLAYING');

        // 2. Submit Answers
        const answersPayload: ClientMessage = {
            type: 'SUBMIT_ANSWERS',
            payload: { answers: { 'Nombre': 'Gloria' } }
        };
        await server.onMessage(JSON.stringify(answersPayload), guest);

        // [P11] Bypassear el grace period retrotrayendo _roundStartTime al pasado (sin fake timers)
        // Esto simula que la ronda lleva más de 10s en curso sin perturbar los timers reales del motor.
        (server.engine as any)._roundStartTime = Date.now() - 15000;

        // 3. Stop Round → ENDING_COUNTDOWN (grace period superado)
        vi.useFakeTimers();
        try {
            const stopPayload: ClientMessage = {
                type: 'STOP_ROUND',
                payload: { answers: { 'Nombre': 'Gloria' } }
            };
            await server.onMessage(JSON.stringify(stopPayload), host);
            expect(getState().status).toBe('ENDING_COUNTDOWN');

            // 4. Avanzar los 3s del pánico → _forceReview() → REVIEW
            vi.advanceTimersByTime(3000);
            expect(getState().status).toBe('REVIEW');
        } finally {
            vi.clearAllTimers();
            vi.useRealTimers();
        }
    });
});
