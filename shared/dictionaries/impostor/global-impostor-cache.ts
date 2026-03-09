// ==============================================================
// GlobalImpostorCache — Reference Counting Singleton for Impostor
// ==============================================================
// Sprint 4: Shared category+word cache across all Impostor rooms.
// Same Reference Counting + Promise Deduping pattern as GlobalWordCache,
// but stores ImpostorCategoryData instead of Set<string>.

import { SupabaseClient } from '@supabase/supabase-js';
import type { ImpostorWord, ImpostorCategoryData } from '../../types.js';

interface CacheEntry {
    data: ImpostorCategoryData;
    refCount: number;
}

// ─── Module-level state ───
const cache = new Map<string, CacheEntry>();
const pendingFetches = new Map<string, Promise<ImpostorCategoryData | null>>();

// ─── Public API ───
export const GlobalImpostorCache = {

    /**
     * Acquires a reference to a category's impostor data.
     * Includes Promise Deduping and Reference Counting.
     */
    async acquire(categoryId: string, supabase: SupabaseClient): Promise<ImpostorCategoryData | null> {
        // Fast path: already cached
        const existing = cache.get(categoryId);
        if (existing) {
            existing.refCount++;
            return existing.data;
        }

        // Promise Deduping
        const pending = pendingFetches.get(categoryId);
        if (pending) {
            const data = await pending;
            if (!data) return null;
            const entry = cache.get(categoryId);
            if (entry) {
                entry.refCount++;
                return entry.data;
            }
            cache.set(categoryId, { data, refCount: 1 });
            return data;
        }

        // Cold path: fetch from Supabase
        const fetchPromise = (async (): Promise<ImpostorCategoryData | null> => {
            // 1. Fetch category name
            const { data: catRow, error: catError } = await supabase
                .from('categories')
                .select('name')
                .eq('id', categoryId)
                .single();

            if (catError || !catRow) {
                console.error(`[GlobalImpostorCache] Failed to fetch category ${categoryId}:`, catError);
                return null;
            }

            // 2. Fetch words
            const { data: wordsData, error: wordsError } = await supabase
                .from('words')
                .select('id, word, difficulty')
                .eq('category_id', categoryId);

            if (wordsError || !wordsData) {
                console.error(`[GlobalImpostorCache] Failed to fetch words for ${categoryId}:`, wordsError);
                return null;
            }

            const words: ImpostorWord[] = wordsData.map(row => ({
                id: String(row.id),
                word: row.word,
                difficulty: row.difficulty
            }));

            return { categoryId, name: catRow.name, words };
        })();

        pendingFetches.set(categoryId, fetchPromise);

        try {
            const data = await fetchPromise;
            if (data) {
                cache.set(categoryId, { data, refCount: 1 });
                console.log(`[GlobalImpostorCache] Acquired "${categoryId}" (${data.words.length} words, refCount=1)`);
            }
            return data;
        } finally {
            pendingFetches.delete(categoryId);
        }
    },

    /**
     * Releases a reference. Evicts from RAM when refCount reaches 0.
     */
    release(categoryId: string): void {
        const entry = cache.get(categoryId);
        if (!entry) return;

        entry.refCount--;

        if (entry.refCount <= 0) {
            cache.delete(categoryId);
            console.log(`[GlobalImpostorCache] Evicted "${categoryId}" (refCount=0)`);
        }
    },

    /**
     * Synchronous read — returns cached data or undefined.
     */
    get(categoryId: string): ImpostorCategoryData | undefined {
        return cache.get(categoryId)?.data;
    },

    /**
     * Diagnostic stats.
     */
    getStats(): { totalCategories: number; totalWords: number; totalRefs: number } {
        let totalWords = 0;
        let totalRefs = 0;
        for (const entry of cache.values()) {
            totalWords += entry.data.words.length;
            totalRefs += entry.refCount;
        }
        return { totalCategories: cache.size, totalWords, totalRefs };
    }
};
