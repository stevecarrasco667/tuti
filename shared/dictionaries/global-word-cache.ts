// ==========================================================
// GlobalWordCache — Reference Counting Singleton for Classic
// ==========================================================
// Sprint 4: Shared vocabulary cache across all rooms in a Worker.
// Uses Reference Counting + Promise Deduping to prevent OOM
// and thundering-herd HTTP requests to Supabase.

import { SupabaseClient } from '@supabase/supabase-js';

// Helper: normalize strings for dictionary matching
const normalize = (str: string) =>
    str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

interface CacheEntry {
    data: Set<string>;
    refCount: number;
}

// ─── Module-level state (survives across rooms in same V8 Isolate) ───
const cache = new Map<string, CacheEntry>();
const pendingFetches = new Map<string, Promise<Set<string>>>();

// ─── Public API (Object Singleton — no class instantiation) ───
export const GlobalWordCache = {

    /**
     * Acquires a reference to a category's word set.
     * - If cached: increments refCount and returns immediately.
     * - If fetch in progress (Promise Deduping): awaits the same promise.
     * - If uncached: fetches from Supabase, caches, and returns.
     */
    async acquire(categoryId: string, supabase: SupabaseClient): Promise<Set<string>> {
        // Fast path: already cached
        const existing = cache.get(categoryId);
        if (existing) {
            existing.refCount++;
            return existing.data;
        }

        // Promise Deduping: if another room is already fetching this category,
        // piggyback on that promise instead of firing another HTTP request.
        const pending = pendingFetches.get(categoryId);
        if (pending) {
            const data = await pending;
            // After await, another room may have already set up the cache entry.
            // Just increment refCount on whatever is there now.
            const entry = cache.get(categoryId);
            if (entry) {
                entry.refCount++;
                return entry.data;
            }
            // Edge case: entry was released between await and here (unlikely in single-thread)
            // Re-cache it with refCount 1
            cache.set(categoryId, { data, refCount: 1 });
            return data;
        }

        // Cold path: fetch from Supabase
        const fetchPromise = (async (): Promise<Set<string>> => {
            const { data: rows, error } = await supabase
                .from('words')
                .select('word')
                .eq('category_id', categoryId);

            const set = new Set<string>();
            if (!error && rows) {
                for (const row of rows) {
                    set.add(normalize(row.word));
                }
            } else {
                console.error(`[GlobalWordCache] Failed to fetch words for ${categoryId}:`, error);
            }
            return set;
        })();

        // Register the in-flight promise so other rooms can dedupe
        pendingFetches.set(categoryId, fetchPromise);

        try {
            const data = await fetchPromise;
            cache.set(categoryId, { data, refCount: 1 });
            console.log(`[GlobalWordCache] Acquired "${categoryId}" (${data.size} words, refCount=1)`);
            return data;
        } finally {
            // Always clean up the pending promise, whether success or failure
            pendingFetches.delete(categoryId);
        }
    },

    /**
     * Releases a reference to a category.
     * When refCount reaches 0, the data is evicted from RAM.
     */
    release(categoryId: string): void {
        const entry = cache.get(categoryId);
        if (!entry) return;

        entry.refCount--;

        if (entry.refCount <= 0) {
            cache.delete(categoryId);
            console.log(`[GlobalWordCache] Evicted "${categoryId}" (refCount=0)`);
        }
    },

    /**
     * Synchronous read — returns the cached Set or undefined.
     * Does NOT modify refCount.
     */
    get(categoryId: string): Set<string> | undefined {
        return cache.get(categoryId)?.data;
    },

    /**
     * Diagnostic: returns cache statistics for logging/debugging.
     */
    getStats(): { totalCategories: number; totalWords: number; totalRefs: number } {
        let totalWords = 0;
        let totalRefs = 0;
        for (const entry of cache.values()) {
            totalWords += entry.data.size;
            totalRefs += entry.refCount;
        }
        return { totalCategories: cache.size, totalWords, totalRefs };
    }
};
