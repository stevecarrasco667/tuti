import { GameConfig } from "../types";

export class ConfigurationManager {
    public static readonly DEFAULT_CONFIG: GameConfig = {
        mode: 'CLASSIC',
        isPublic: false,
        maxPlayers: 8,
        rounds: 5,
        timeLimit: 60,
        votingDuration: 30,
        categories: [],
        customCategories: [],
        mutators: {
            suicidalStop: false,
            anonymousVoting: false
        }
    };

    /**
     * Validates and merges new config into existing config.
     * Enforces limits on maxPlayers and rounds.
     */
    public updateConfig(current: GameConfig, updates: Partial<GameConfig>): GameConfig {
        // Handle mutators merge separately to avoid overwriting
        const mergedMutators = updates.mutators
            ? { ...current.mutators, ...updates.mutators }
            : current.mutators;

        const next = { ...current, ...updates, mutators: mergedMutators };

        // Enforce Limits
        if (next.maxPlayers < 2) next.maxPlayers = 2;
        if (next.maxPlayers > 10) next.maxPlayers = 10;
        if (next.rounds < 1) next.rounds = 1;
        if (next.rounds > 20) next.rounds = 20;
        if (next.timeLimit < 30) next.timeLimit = 30;
        if (next.timeLimit > 180) next.timeLimit = 180;
        if (next.votingDuration < 10) next.votingDuration = 10;
        if (next.votingDuration > 120) next.votingDuration = 120;

        return next;
    }

    public getDefaultConfig(): GameConfig {
        // Return a deep copy to avoid mutation of static
        return {
            ...ConfigurationManager.DEFAULT_CONFIG,
            categories: [],
            customCategories: [],
            mutators: { ...ConfigurationManager.DEFAULT_CONFIG.mutators }
        };
    }
}
