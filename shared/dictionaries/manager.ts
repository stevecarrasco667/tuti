
// Import raw JSON data
import levenshtein from 'fast-levenshtein';
import { SupabaseClient } from '@supabase/supabase-js';
import { GlobalWordCache } from './global-word-cache';

// Helper to normalized strings: Lowercase + NFD + Remove Accents + Trim
const normalize = (str: string) => str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export class DictionaryManager {
    // Sprint 4: Proxy Pattern — no local data storage.
    // Only tracks which categories THIS room has acquired from the GlobalCache.
    private activeCategories: { lang: string, id: string }[] = [];
    private disposed = false;

    /**
     * Releases all acquired references and marks this proxy as disposed.
     * Idempotent: safe to call multiple times (GAME_OVER + Death Hook).
     */
    public clearCache() {
        if (this.disposed) return;
        this.disposed = true;

        for (const cat of this.activeCategories) {
            GlobalWordCache.release(cat.lang, cat.id);
        }
        this.activeCategories = [];
        console.log(`[DictionaryManager] Proxy disposed. GlobalCache stats:`, GlobalWordCache.getStats());
    }

    /**
     * Fetches all classic category metadata (id, name).
     * Used right before starting a game to allow players to select or to pick random ones.
     */
    public async getAllCategories(supabase: SupabaseClient, activePackId?: string | null): Promise<{ id: string; name: string }[]> {
        let query = supabase
            .from('categories')
            .select('id, name')
            .eq('game_mode', 'classic');

        if (activePackId) {
            query = query.or(`pack_id.is.null,pack_id.eq.${activePackId}`);
        } else {
            query = query.is('pack_id', null);
        }

        const { data, error } = await query;

        if (error || !data) {
            console.error('[DictionaryManager] Failed to fetch categories:', error);
            return [];
        }
        return data as { id: string; name: string }[];
    }

    /**
     * Acquires a reference to a category's word set from the GlobalWordCache.
     * Sprint 4: No longer stores data locally — delegates to the shared Bóveda.
     */
    public async loadCategory(lang: string, categoryId: string, supabase: SupabaseClient): Promise<void> {
        // If already acquired by this proxy, skip
        if (this.activeCategories.some(c => c.lang === lang && c.id === categoryId)) return;

        // Reset disposed flag if re-used (e.g., new round after GAME_OVER)
        this.disposed = false;

        const maxRetries = 4;
        const delays = [200, 500, 1000, 2000]; // 200ms, 500ms, 1s, 2s
        let attempt = 0;

        while (attempt <= maxRetries) {
            try {
                await GlobalWordCache.acquire(lang, categoryId, supabase);
                this.activeCategories.push({ lang, id: categoryId });
                console.log(`[DictionaryManager] Proxy acquired "${lang}_${categoryId}" on attempt ${attempt + 1}. Active count: ${this.activeCategories.length}`);
                return;
            } catch (error) {
                attempt++;
                if (attempt > maxRetries) {
                    console.error(`[DictionaryManager] Failed to load category ${lang}_${categoryId} after ${maxRetries} retries:`, error);
                    // Dejar que falle inocuamente para que use el fallback de palabras locales en vez de bloquear la sala
                    return;
                }
                const delay = delays[attempt - 1] ?? 1000;
                console.warn(`[DictionaryManager] Retry ${attempt}/${maxRetries} for category ${lang}_${categoryId} in ${delay}ms due to:`, error);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * Synchronous Validations (O(1)).
     * Reads from GlobalWordCache instead of local storage.
     */
    public hasExact(lang: string, categoryId: string, word: string): boolean {
        const collection = GlobalWordCache.get(lang, categoryId);
        if (!collection) {
            console.warn(`[DictionaryManager] Attempted to validate against uncached category: ${lang}_${categoryId}`);
            return false;
        }
        return collection.has(normalize(word));
    }

    public isFuzzyValid(lang: string, categoryId: string, word: string): boolean {
        const normalizedWord = normalize(word);
        const collection = GlobalWordCache.get(lang, categoryId);

        if (!collection) {
            console.warn(`[DictionaryManager] Attempted to validate against uncached category: ${lang}_${categoryId}`);
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

    public getCollection(lang: string, categoryId: string): Set<string> | undefined {
        return GlobalWordCache.get(lang, categoryId);
    }
}
