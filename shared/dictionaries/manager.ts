
// Import raw JSON data
import animales from './data/animales.json';
import colores from './data/colores.json';
import frutas from './data/frutas.json';
import nombres from './data/nombres.json';
import paises from './data/paises.json';

// Helper to normalized strings: Lowercase + NFD + Remove Accents + Trim
const normalize = (str: string) => str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

class DictionaryManager {
    private sets: Record<string, Set<string>> = {};

    constructor() {
        this.loadDictionaries();
    }

    private loadDictionaries() {
        // Map category names (as used in GameEngine) to data sources
        // Note: Typed explicit mapping or dynamic? Explicit is safer.

        this.addDictionary('Animal', animales);
        this.addDictionary('Color', colores);
        this.addDictionary('Fruta/Verdura', frutas);
        this.addDictionary('Nombre', nombres);
        this.addDictionary('País', paises);
    }

    private addDictionary(category: string, rawList: string[]) {
        const set = new Set<string>();
        for (const word of rawList) {
            set.add(normalize(word));
        }
        this.sets[category] = set;
    }

    public hasExact(category: string, word: string): boolean {
        const collection = this.sets[category];
        if (!collection) return false;
        return collection.has(normalize(word));
    }

    public getCollection(category: string): Set<string> | undefined {
        return this.sets[category];
    }
}

// Singleton instance
export const dictionaryManager = new DictionaryManager();
