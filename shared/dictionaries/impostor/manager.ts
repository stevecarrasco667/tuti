// =============================================
// ImpostorWordProvider — Singleton Data Layer
// =============================================
// Sprint 3.1: Sole authority for Impostor word/category data.
// The ImpostorEngine will consume this provider in future sprints.

import type { ImpostorWord, ImpostorCategoryData } from '../../types.js';
import { SupabaseClient } from '@supabase/supabase-js';

export class ImpostorWordProvider {
    // Temporal Cache (populated per-round)
    private categories: Map<string, ImpostorCategoryData>;

    constructor() {
        this.categories = new Map();
    }

    /**
     * Clears the Temporal Cache to free up memory when a round is over.
     */
    public clearCache() {
        this.categories.clear();
    }

    /**
     * Fetches all impostor category metadata (id, name).
     * Used by the Lobby UI to let the host choose categories.
     */
    public async getAllCategories(supabase: SupabaseClient): Promise<{ id: string; name: string }[]> {
        const { data, error } = await supabase
            .from('categories')
            .select('id, name')
            .eq('game_mode', 'impostor');

        if (error || !data) {
            console.error('[ImpostorWordProvider] Failed to fetch categories:', error);
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
        if (this.categories.has(categoryId)) return;

        // Fetch category name
        const { data: categoryData, error: catError } = await supabase
            .from('categories')
            .select('name')
            .eq('id', categoryId)
            .single();

        if (catError || !categoryData) {
            console.error(`[ImpostorWordProvider] Failed to load category name for ${categoryId}:`, catError);
            return;
        }

        const { data: wordsData, error: wordsError } = await supabase
            .from('words')
            .select('id, word, difficulty')
            .eq('category_id', categoryId);

        if (wordsError || !wordsData) {
            console.error(`[ImpostorWordProvider] Failed to load words for category ${categoryId}:`, wordsError);
            return;
        }

        const impostorWords: ImpostorWord[] = wordsData.map(row => ({
            id: String(row.id),
            word: row.word,
            difficulty: row.difficulty
        }));

        this.categories.set(categoryId, {
            categoryId,
            name: categoryData.name,
            words: impostorWords
        });

        console.log(`[ImpostorWordProvider] Cached ${impostorWords.length} words for category ${categoryId}`);
    }

    /**
     * Synchronous Validations (O(1)).
     * Relies on Temporal Cache being pre-loaded.
     *
     * Returns a random word from the specified category,
     * excluding any word whose ID is in `usedWordIds`.
     * Returns null if no words are available (all exhausted).
     */
    public getRandomWord(categoryId: string, usedWordIds: Set<string>): ImpostorWord | null {
        const category = this.categories.get(categoryId);
        if (!category) {
            console.warn(`[ImpostorWordProvider] Attempted to pick word from uncached category: ${categoryId}`);
            return null;
        }

        const available = category.words.filter(w => !usedWordIds.has(w.id));
        if (available.length === 0) {
            console.warn(`[ImpostorWordProvider] All words exhausted for category: ${category.name}`);
            return null;
        }

        const randomIndex = Math.floor(Math.random() * available.length);
        return available[randomIndex];
    }

    /**
     * Returns a random category ID from the *currently loaded* cache.
     * Optionally excluding already-used categories.
     * Note: In Sprint 2, this assumes you have pre-loaded the categories you want to pick from.
     */
    public getRandomCategory(usedCategoryIds?: Set<string>): string | null {
        const allIds = Array.from(this.categories.keys());
        const available = usedCategoryIds
            ? allIds.filter(id => !usedCategoryIds.has(id))
            : allIds;

        if (available.length === 0) return null;

        const randomIndex = Math.floor(Math.random() * available.length);
        return available[randomIndex];
    }

    /**
     * Returns the full category data from the cache for a given categoryId.
     */
    public getCategory(categoryId: string): ImpostorCategoryData | undefined {
        return this.categories.get(categoryId);
    }
}
