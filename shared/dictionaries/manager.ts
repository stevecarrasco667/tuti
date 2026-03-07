
// Import raw JSON data
import levenshtein from 'fast-levenshtein';
import { SupabaseClient } from '@supabase/supabase-js';

// Helper to normalized strings: Lowercase + NFD + Remove Accents + Trim
const normalize = (str: string) => str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export class DictionaryManager {
    // Temporal Cache (populated per-round)
    private datasets: Record<string, Set<string>> = {};

    /**
     * Clears the Temporal Cache to free up memory when a round is over.
     */
    public clearCache() {
        this.datasets = {};
    }

    /**
     * Fetches all classic category metadata (id, name).
     * Used right before starting a game to allow players to select or to pick random ones.
     */
    public async getAllCategories(supabase: SupabaseClient): Promise<{ id: string; name: string }[]> {
        const { data, error } = await supabase
            .from('categories')
            .select('id, name')
            .eq('game_mode', 'classic');

        if (error || !data) {
            console.error('[DictionaryManager] Failed to fetch categories:', error);
            return [];
        }
        return data as { id: string; name: string }[];
    }

    /**
     * Temporal Cache Hydration: Loads all words for a specific category into memory.
     * Must be called at the start of a round using `await`.
     */
    public async loadCategory(categoryId: string, supabase: SupabaseClient): Promise<void> {
        // If already cached, skip
        if (this.datasets[categoryId]) return;

        const { data, error } = await supabase
            .from('words')
            .select('word')
            .eq('category_id', categoryId);

        if (error || !data) {
            console.error(`[DictionaryManager] Failed to load words for category ${categoryId}:`, error);
            return;
        }

        const set = new Set<string>();
        for (const row of data) {
            set.add(normalize(row.word));
        }

        this.datasets[categoryId] = set;
        console.log(`[DictionaryManager] Cached ${set.size} words for category ${categoryId}`);
    }

    /**
     * Synchronous Validations (O(1)).
     * Relies on Temporal Cache being pre-loaded.
     */
    public hasExact(categoryId: string, word: string): boolean {
        const collection = this.datasets[categoryId];
        if (!collection) {
            console.warn(`[DictionaryManager] Attempted to validate against uncached category: ${categoryId}`);
            return false;
        }
        return collection.has(normalize(word));
    }

    public isFuzzyValid(categoryId: string, word: string): boolean {
        const normalizedWord = normalize(word);
        const collection = this.datasets[categoryId];

        if (!collection) {
            console.warn(`[DictionaryManager] Attempted to validate against uncached category: ${categoryId}`);
            return false;
        }

        // Fast path: exact match
        if (collection.has(normalizedWord)) return true;

        // Tiered tolerance based on word length
        let tolerance: number;
        if (normalizedWord.length <= 3) {
            tolerance = 0; // Too short for fuzzy — exact only
            return false;
        } else if (normalizedWord.length <= 6) {
            tolerance = 1;
        } else {
            tolerance = 2;
        }

        // Iterate collection for fuzzy match
        for (const validWord of collection) {
            const dist = levenshtein.get(normalizedWord, validWord);
            if (dist <= tolerance) return true;
        }

        return false;
    }

    public getCollection(categoryId: string): Set<string> | undefined {
        return this.datasets[categoryId];
    }
}

