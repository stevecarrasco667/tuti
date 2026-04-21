import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RateLimiter } from '../utils/rate-limiter';

// Mock Server Environment
// We can't easily import the Server class without mocking PartyKit environment globals.
// So we will test the logic components: 
// 1. RateLimiter (Unit)
// 2. Sanitization Logic (Extracted or Replicated)
// 3. Authority Validation (Sprint H6 Handlers)

import { PlayerHandler } from '../handlers/player';
import { GameHandler } from '../handlers/game';
import { ConnectionHandler } from '../handlers/connection';
import { sendError } from '../utils/broadcaster';

vi.mock('../../shared/utils/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

vi.mock('../utils/broadcaster', () => ({
    sendError: vi.fn(),
    broadcastState: vi.fn()
}));

describe('Security: The Iron Shield', () => {

    describe('RateLimiter (Token Bucket)', () => {
        let limiter: RateLimiter;

        beforeEach(() => {
            vi.useFakeTimers();
            limiter = new RateLimiter(5, 2000); // 5 capacity, 2s refill
        });

        it('should allow initial burst of 5 messages', () => {
            const userId = 'spammer-1';
            expect(limiter.checkLimit(userId)).toBe(true);
            expect(limiter.checkLimit(userId)).toBe(true);
            expect(limiter.checkLimit(userId)).toBe(true);
            expect(limiter.checkLimit(userId)).toBe(true);
            expect(limiter.checkLimit(userId)).toBe(true); // 5th allowed
        });

        it('should block the 6th message in burst', () => {
            const userId = 'spammer-2';
            // Consume 5
            for (let i = 0; i < 5; i++) limiter.checkLimit(userId);

            // 6th should fail
            expect(limiter.checkLimit(userId)).toBe(false);
        });

        it('should refill tokens after time passes', () => {
            const userId = 'patient-user';
            // Consume all
            for (let i = 0; i < 5; i++) limiter.checkLimit(userId);
            expect(limiter.checkLimit(userId)).toBe(false);

            // Wait 2 seconds
            vi.advanceTimersByTime(2000);

            // Should allow 1 message now
            expect(limiter.checkLimit(userId)).toBe(true);

            // But next one is blocked again (only 1 refilled)
            expect(limiter.checkLimit(userId)).toBe(false);
        });

        it('should cleanup memory', () => {
            const userId = 'leaving-user';
            limiter.checkLimit(userId);

            // Access private map via any cast for testing
            const map = (limiter as any).tokens;
            expect(map.has(userId)).toBe(true);

            limiter.cleanup(userId);
            expect(map.has(userId)).toBe(false);
        });
    });

    describe('Sanitization Logic', () => {
        // Replicating the server logic since we can't instantiate Server easily here
        const sanitize = (text: any) => {
            if (!text || typeof text !== 'string') return null;
            const trimmed = text.trim();
            if (trimmed.length === 0) return null;
            return trimmed.slice(0, 140);
        };

        it('should trim whitespace', () => {
            expect(sanitize('  hello  ')).toBe('hello');
        });

        it('should reject empty strings', () => {
            expect(sanitize('')).toBe(null);
            expect(sanitize('   ')).toBe(null);
            expect(sanitize(undefined)).toBe(null);
        });

        it('should truncate long messages', () => {
            const longMsg = 'a'.repeat(200);
            const result = sanitize(longMsg);
            expect(result?.length).toBe(140);
            expect(result).toBe('a'.repeat(140));
        });
    });

    describe('Authority and Identity Validation (Sprint H6)', () => {
        let mockEngine: any;
        let mockRoom: any;
        let mockSender: any;

        beforeEach(() => {
            vi.clearAllMocks();
            mockEngine = {
                kickPlayer: vi.fn(),
                stopRound: vi.fn(),
                joinPlayer: vi.fn(),
                markAsPublic: vi.fn(),
                players: {
                    getPlayerId: vi.fn((connId) => connId)
                },
                getState: vi.fn().mockReturnValue({ players: [] }),
                state: {
                    players: [
                        { id: 'host-user', isHost: true },
                        { id: 'normal-user', isHost: false }
                    ]
                }
            };

            mockRoom = {
                id: 'test-room',
                env: {},
                broadcast: vi.fn(),
                storage: {
                    put: vi.fn().mockResolvedValue(undefined),
                    get: vi.fn().mockResolvedValue(undefined)
                }
            };

            mockSender = {
                id: 'normal-user',
                send: vi.fn(),
                setState: vi.fn(),
                close: vi.fn()
            };
        });

        it('PlayerHandler: should reject kick request from non-host', async () => {
            const handler = new PlayerHandler(mockRoom, mockEngine);
            await handler.handleKick({ targetUserId: 'target-1' }, mockSender);

            // Engine kick must not be called
            expect(mockEngine.kickPlayer).not.toHaveBeenCalled();
            // sendError must be sent to the malicious sender
            expect(sendError).toHaveBeenCalledWith(mockSender, 'Solo el anfitrión puede expulsar jugadores.');
        });

        it('GameHandler: should ALLOW stopRound from non-host (Basta is universal)', async () => {
            const handler = new GameHandler(mockRoom, mockEngine);
            // This proves we DID NOT lock the "Basta" button
            await handler.handleStopRound({ answers: {} }, mockSender);

            // Engine stopRound MUST be called
            expect(mockEngine.stopRound).toHaveBeenCalledWith('normal-user', {});
        });

        it('ConnectionHandler: should sanitize avatar on connect', async () => {
            // Mock global fetch so JWT verification fails gracefully
            (global as any).fetch = vi.fn().mockRejectedValue(new Error('No network in tests'));

            // Pre-seed token so handler skips randomUUID and storage.put
            const existingToken = 'valid-token-123';
            const mockAuthTokens = new Map<string, string>([['new-user', existingToken]]);
            const mockMessages: any[] = [];
            const handler = new ConnectionHandler(mockRoom, mockEngine, mockAuthTokens, mockMessages);
            
            // Malicious payload with null byte, invisible char, and over 10 chars
            const attackAvatar = '\u0000\u001F_attack_payload_1234567890';
            
            mockSender.id = 'new-user';
            const mockRequest = {
                url: `http://localhost?avatar=${encodeURIComponent(attackAvatar)}&name=hacker&userId=new-user&token=${existingToken}`
            };

            await handler.handleConnect(mockSender, { request: mockRequest } as any);

            // joinPlayer must have been called
            expect(mockEngine.joinPlayer).toHaveBeenCalled();

            const joinArgs = mockEngine.joinPlayer.mock.calls[0];
            const sanitizedAvatar = joinArgs[2]; // avatar is the 3rd argument
            
            // Should be stripped of control characters
            expect(sanitizedAvatar).not.toMatch(/[\x00-\x1F\x7F-\x9F]/);
            // Should be truncated to 10 chars
            expect(sanitizedAvatar.length).toBeLessThanOrEqual(10);
        });
    });
});
