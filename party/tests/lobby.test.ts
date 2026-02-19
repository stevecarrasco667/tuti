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

        // Register connection in room so per-connection broadcast can iterate it
        (mockRoom as any).connections.set(mockConn.id, mockConn);

        await server.onConnect(mockConn, mockCtx);

        // With State Masking, broadcastState sends per-connection via conn.send()
        expect(mockConn.send).toHaveBeenCalled();

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
        expect(server.engine.getState().players).toHaveLength(2);
        expect(server.engine.getState().players[0].name).toBe('Alice');
        expect(server.engine.getState().players[1].name).toBe('Bob');
    });

    it('should not duplicate player on reconnect (with valid token)', async () => {
        const conn = createMockConnection('u1');

        // 1. First Connection
        await server.onConnect(conn, createMockContext('http://localhost/?name=Alice'));

        // 2. Capture Token from PRIVATE HANDSHAKE (AUTH_GRANTED)
        // Find the call that sends AUTH_GRANTED
        const authCall = (conn.send as any).mock.calls.find((args: any[]) => {
            const msg = JSON.parse(args[0]);
            return msg.type === 'AUTH_GRANTED';
        });

        expect(authCall).toBeDefined();
        const authMsg = JSON.parse(authCall![0]);
        const token = authMsg.payload.sessionToken;
        expect(token).toBeDefined();

        // 3. Reconnect WITH Token
        await server.onConnect(conn, createMockContext(`http://localhost/?name=Alice&token=${token}`));

        // 4. Expect NO duplication (Same Session)
        expect(server.engine.getState().players).toHaveLength(1);
        expect(server.engine.getState().players[0].isConnected).toBe(true);
    });

    it('should reject spoofing attempt (connecting without token)', async () => {
        const conn = createMockConnection('u1-spoof');

        // 1. Valid User Connects
        await server.onConnect(conn, createMockContext('http://localhost/?name=Alice&userId=u1'));

        // 2. Attacker tries to connect as 'u1' WITHOUT token
        // (Simulating a different connection ID or same, logic handles both by checking token)
        const attackerConn = createMockConnection('attacker');
        await server.onConnect(attackerConn, createMockContext('http://localhost/?name=Evil&userId=u1'));

        // 3. Expect DUPLICATION (New Session created for attacker)
        // The server assigns a NEW userId to the attacker, so they are added as a second player.
        expect(server.engine.getState().players).toHaveLength(2);

        const players = server.engine.getState().players;
        const original = players.find(p => p.id === 'u1');
        const attacker = players.find(p => p.id !== 'u1');

        expect(original).toBeDefined();
        expect(attacker).toBeDefined();
        expect(original!.name).toBe('Alice');
        expect(attacker!.name).toBe('Evil');
    });

    it('should mark player disconnected on close', async () => {
        const conn = createMockConnection('u1');
        await server.onConnect(conn, createMockContext('http://localhost/?name=Alice'));

        server.onClose(conn);

        const player = server.engine.getState().players.find(p => p.id === 'u1');
        expect(player?.isConnected).toBe(false);
    });
});
