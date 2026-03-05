// =============================================
// ImpostorWordProvider — Singleton Data Layer
// =============================================
// Sprint 3.1: Sole authority for Impostor word/category data.
// The ImpostorEngine will consume this provider in future sprints.

import type { ImpostorWord, ImpostorCategoryData } from '../../types.js';

// Static imports — bundled at compile time, no runtime FS access needed.
import animalesData from './data/animales.json';
import lugaresData from './data/lugares.json';
import profesionesData from './data/profesiones.json';

class ImpostorWordProvider {
    private categories: Map<string, ImpostorCategoryData>;

    constructor() {
        this.categories = new Map();

        // Hydrate from static JSON imports
        const rawCategories: ImpostorCategoryData[] = [
            animalesData as ImpostorCategoryData,
            lugaresData as ImpostorCategoryData,
            profesionesData as ImpostorCategoryData,
        ];

        for (const cat of rawCategories) {
            this.categories.set(cat.categoryId, cat);
        }

        console.log(`[ImpostorWordProvider] Loaded ${this.categories.size} categories, ${this.getTotalWordCount()} total words.`);
    }

    // --- PUBLIC API ---

    /**
     * Returns a lightweight list of all available categories.
     * Used by the Lobby UI to let the host choose categories.
     */
    public getAllCategories(): { id: string; name: string }[] {
        return Array.from(this.categories.values()).map(cat => ({
            id: cat.categoryId,
            name: cat.name,
        }));
    }

    /**
     * Returns a random word from the specified category,
     * excluding any word whose ID is in `usedWordIds`.
     * Returns null if no words are available (all exhausted).
     */
    public getRandomWord(categoryId: string, usedWordIds: Set<string>): ImpostorWord | null {
        const category = this.categories.get(categoryId);
        if (!category) {
            console.warn(`[ImpostorWordProvider] Category not found: ${categoryId}`);
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
     * Returns a random category ID, optionally excluding already-used categories.
     * Used for automatic category rotation across rounds.
     * Returns null if all categories have been used.
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
     * Returns the full category data for a given categoryId.
     * Useful for debug/admin inspection.
     */
    public getCategory(categoryId: string): ImpostorCategoryData | undefined {
        return this.categories.get(categoryId);
    }

    // --- INTERNALS ---

    private getTotalWordCount(): number {
        let total = 0;
        for (const cat of this.categories.values()) {
            total += cat.words.length;
        }
        return total;
    }
}

// Singleton Export — single instance shared across the entire server process.
export const impostorWords = new ImpostorWordProvider();
