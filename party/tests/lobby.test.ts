import { describe, it, expect, beforeEach, vi } from 'vitest';
import Server from '../server';
import { createMockConnection, createMockRoom, createMockContext } from './mocks';

describe('Server Integration - Lobby', () => {
    let mockRoom: any;
    let server: Server;

    beforeEach(() => {
        mockRoom = createMockRoom('LOBBY_TEST');
        server = new Server(mockRoom as any);
        vi.clearAllMocks();
    });

    it('should send initial state on connection', async () => {
        const mockConn = createMockConnection('user1');
        const mockCtx = createMockContext('http://localhost/party/LOBBY_TEST?name=Alice');

        await server.onConnect(mockConn, mockCtx);

        // Verify broadcast was called (since broadcastState calls room.broadcast)
        expect(mockRoom.broadcast).toHaveBeenCalled();

        // Also verify storage put
        expect(mockRoom.storage.put).toHaveBeenCalled();
    });

    it('should handle multiple players joining', async () => {
        const conn1 = createMockConnection('u1');
        const conn2 = createMockConnection('u2');

        await server.onConnect(conn1, createMockContext('http://localhost/?name=Alice'));
        await server.onConnect(conn2, createMockContext('http://localhost/?name=Bob'));

        // Check internal engine state via dirty access for verification
        // (In real integ test we might rely purely on broadcast output, but internal check is faster)
        expect(server.engine['state'].players).toHaveLength(2);
        expect(server.engine['state'].players[0].name).toBe('Alice');
        expect(server.engine['state'].players[1].name).toBe('Bob');
    });

    it('should not duplicate player on reconnect', async () => {
        const conn = createMockConnection('u1');

        await server.onConnect(conn, createMockContext('http://localhost/?name=Alice'));
        await server.onConnect(conn, createMockContext('http://localhost/?name=Alice')); // Reconnect

        expect(server.engine['state'].players).toHaveLength(1);
        expect(server.engine['state'].players[0].isConnected).toBe(true);
    });

    it('should mark player disconnected on close', async () => {
        const conn = createMockConnection('u1');
        await server.onConnect(conn, createMockContext('http://localhost/?name=Alice'));

        server.onClose(conn);

        const player = server.engine['state'].players.find(p => p.id === 'u1');
        expect(player?.isConnected).toBe(false);
    });
});
