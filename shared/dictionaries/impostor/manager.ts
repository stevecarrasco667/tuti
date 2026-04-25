// =============================================
// ImpostorWordProvider — Proxy to GlobalImpostorCache
// =============================================
// Sprint 4: No longer stores data locally.
// Acquires/releases references from the shared Bóveda.

import type { ImpostorWord, ImpostorCategoryData } from '../../types.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { GlobalImpostorCache } from './global-impostor-cache';

export class ImpostorWordProvider {
    // Sprint 4: Proxy Pattern — tracks acquired categories only
    private activeCategories: { lang: string, id: string }[] = [];
    private disposed = false;

    /**
     * Releases all acquired references. Idempotent via disposed flag.
     */
    public clearCache() {
        if (this.disposed) return;
        this.disposed = true;

        for (const cat of this.activeCategories) {
            GlobalImpostorCache.release(cat.lang, cat.id);
        }
        this.activeCategories = [];
        console.log(`[ImpostorWordProvider] Proxy disposed. GlobalCache stats:`, GlobalImpostorCache.getStats());
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
     * Acquires a reference to a category from the GlobalImpostorCache.
     */
    public async loadCategory(lang: string, categoryId: string, supabase: SupabaseClient): Promise<void> {
        if (this.activeCategories.some(c => c.lang === lang && c.id === categoryId)) return;

        // Reset disposed flag if re-used
        this.disposed = false;

        const data = await GlobalImpostorCache.acquire(lang, categoryId, supabase);
        if (data) {
            this.activeCategories.push({ lang, id: categoryId });
            console.log(`[ImpostorWordProvider] Proxy acquired "${lang}_${categoryId}". Active count: ${this.activeCategories.length}`);
        }
    }

    /**
     * Returns a random word from the specified category,
     * excluding any word whose ID is in `usedWordIds`.
     */
    public getRandomWord(lang: string, categoryId: string, usedWordIds: Set<string>): ImpostorWord | null {
        const category = GlobalImpostorCache.get(lang, categoryId);
        if (!category) {
            console.warn(`[ImpostorWordProvider] Attempted to pick word from uncached category: ${lang}_${categoryId}`);
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
     * Returns a random category ID from the *currently acquired* categories.
     */
    public getRandomCategory(usedCategoryIds?: Set<string>): string | null {
        const available = usedCategoryIds
            ? this.activeCategories.filter(c => !usedCategoryIds.has(c.id))
            : [...this.activeCategories];

        if (available.length === 0) return null;

        const randomIndex = Math.floor(Math.random() * available.length);
        return available[randomIndex].id;
    }

    /**
     * Returns the full category data from the GlobalImpostorCache.
     */
    public getCategory(lang: string, categoryId: string): ImpostorCategoryData | undefined {
        return GlobalImpostorCache.get(lang, categoryId);
    }
}
