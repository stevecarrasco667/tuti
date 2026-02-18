import { GameConfig } from "../types";

export class ConfigurationManager {
    public static readonly MIN_CATEGORIES = 1;
    public static readonly MAX_CATEGORIES = 10;

    public static readonly DEFAULT_CONFIG: GameConfig = {
        totalRounds: 5,
        roundDuration: 60,
        votingDuration: 30,
        categoriesCount: 5,
        maxPlayers: 8,
        mode: 'RANDOM',
        selectedCategories: [],
        customCategories: []
    };

    /**
     * Validates and merges new config into existing config.
     * Enforces limits on categoriesCount.
     */
    public updateConfig(current: GameConfig, updates: Partial<GameConfig>): GameConfig {
        const next = { ...current, ...updates };

        // Enforce Limits
        if (next.categoriesCount < ConfigurationManager.MIN_CATEGORIES) {
            next.categoriesCount = ConfigurationManager.MIN_CATEGORIES;
        }
        if (next.categoriesCount > ConfigurationManager.MAX_CATEGORIES) {
            next.categoriesCount = ConfigurationManager.MAX_CATEGORIES;
        }

        return next;
    }

    public getDefaultConfig(): GameConfig {
        // Return a copy to avoid mutation of static
        return { ...ConfigurationManager.DEFAULT_CONFIG };
    }
}
