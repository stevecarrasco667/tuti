export class RateLimiter {
    private tokens: Map<string, { count: number; lastRefill: number }>;
    private capacity: number;
    private refillRateMs: number;

    constructor(capacity = 5, refillRateMs = 2000) {
        this.tokens = new Map();
        this.capacity = capacity;
        this.refillRateMs = refillRateMs;
    }

    public checkLimit(id: string): boolean {
        const now = Date.now();
        let record = this.tokens.get(id);

        if (!record) {
            record = { count: this.capacity, lastRefill: now };
            this.tokens.set(id, record);
        } else {
            // Lazy Refill
            const elapsed = now - record.lastRefill;
            const tokensToAdd = Math.floor(elapsed / this.refillRateMs);

            if (tokensToAdd > 0) {
                record.count = Math.min(this.capacity, record.count + tokensToAdd);
                record.lastRefill = now;
            }
        }

        if (record.count >= 1) {
            record.count--;
            return true; // Allowed
        }

        return false; // Blocked
    }

    public cleanup(id: string) {
        this.tokens.delete(id);
    }
}
