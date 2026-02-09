import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RateLimiter } from '../utils/rate-limiter';

// Mock Server Environment
// We can't easily import the Server class without mocking PartyKit environment globals.
// So we will test the logic components: 
// 1. RateLimiter (Unit)
// 2. Sanitization Logic (Extracted or Replicated)

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
});
