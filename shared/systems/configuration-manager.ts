import { GameConfig, DeepPartial } from "../types";

export class ConfigurationManager {
    public static readonly DEFAULT_CONFIG: GameConfig = {
        mode: 'CLASSIC',
        isPublic: false,
        maxPlayers: 8,
        classic: {
            rounds: 5,
            timeLimit: 60,
            votingDuration: 30,
            categories: [],
            customCategories: [],
            mutators: {
                suicidalStop: false,
                anonymousVoting: false
            }
        },
        impostor: {
            rounds: 3,
            typingTime: 30,
            votingTime: 40
        }
    };

    /**
     * Validates and merges new config into existing config.
     * Supports deep merge for classic and impostor sub-objects.
     */
    public updateConfig(current: GameConfig, updates: DeepPartial<GameConfig>): GameConfig {
        // Deep merge classic namespace
        const mergedClassic = updates.classic
            ? {
                ...current.classic, ...updates.classic,
                mutators: updates.classic.mutators
                    ? { ...current.classic.mutators, ...updates.classic.mutators }
                    : current.classic.mutators
            } as GameConfig['classic']
            : current.classic;

        // Deep merge impostor namespace
        const mergedImpostor = updates.impostor
            ? { ...current.impostor, ...updates.impostor } as GameConfig['impostor']
            : current.impostor;

        const next: GameConfig = {
            ...current,
            ...updates,
            classic: mergedClassic,
            impostor: mergedImpostor
        };

        // Enforce global limits
        if (next.maxPlayers < 2) next.maxPlayers = 2;
        if (next.maxPlayers > 10) next.maxPlayers = 10;

        // Enforce classic limits
        if (next.classic.rounds < 1) next.classic.rounds = 1;
        if (next.classic.rounds > 20) next.classic.rounds = 20;
        if (next.classic.timeLimit < 30) next.classic.timeLimit = 30;
        if (next.classic.timeLimit > 180) next.classic.timeLimit = 180;
        if (next.classic.votingDuration < 10) next.classic.votingDuration = 10;
        if (next.classic.votingDuration > 120) next.classic.votingDuration = 120;

        // Enforce impostor limits
        if (next.impostor.rounds < 1) next.impostor.rounds = 1;
        if (next.impostor.rounds > 10) next.impostor.rounds = 10;
        if (next.impostor.typingTime < 10) next.impostor.typingTime = 10;
        if (next.impostor.typingTime > 60) next.impostor.typingTime = 60;
        if (next.impostor.votingTime < 15) next.impostor.votingTime = 15;
        if (next.impostor.votingTime > 120) next.impostor.votingTime = 120;

        return next;
    }

    public getDefaultConfig(): GameConfig {
        return {
            ...ConfigurationManager.DEFAULT_CONFIG,
            classic: {
                ...ConfigurationManager.DEFAULT_CONFIG.classic,
                categories: [],
                customCategories: [],
                mutators: { ...ConfigurationManager.DEFAULT_CONFIG.classic.mutators }
            },
            impostor: { ...ConfigurationManager.DEFAULT_CONFIG.impostor }
        };
    }
}
