
// Import raw JSON data
import animales from './data/animales.json';
import colores from './data/colores.json';
import frutas from './data/frutas.json';
import nombres from './data/nombres.json';
import paises from './data/paises.json';
import levenshtein from 'fast-levenshtein';

// Helper to normalized strings: Lowercase + NFD + Remove Accents + Trim
const normalize = (str: string) => str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export class DictionaryManager {
    // Static collection storage
    private static datasets: Record<string, Set<string>> = {};
    private static initialized = false;

    // [Phoenix CDN] jsDelivr serves raw GitHub files
    private static readonly CDN_BASE = 'https://cdn.jsdelivr.net/gh/stevecarrasco667/tuti@main/shared/dictionaries/data/';

    // Map: category name → { file, fallback }
    private static readonly CATEGORY_FILE_MAP: Record<string, { file: string; fallback: string[] }> = {
        'Animal': { file: 'animales.json', fallback: animales },
        'Color': { file: 'colores.json', fallback: colores },
        'Fruta/Verdura': { file: 'frutas.json', fallback: frutas },
        'Nombre': { file: 'nombres.json', fallback: nombres },
        'País': { file: 'paises.json', fallback: paises },
    };

    // Initialize/Load mappings (local-only, synchronous fallback)
    private static initialize() {
        if (this.initialized) return;

        this.addDictionary('Animal', animales);
        this.addDictionary('Color', colores);
        this.addDictionary('Fruta/Verdura', frutas);
        this.addDictionary('Nombre', nombres);
        this.addDictionary('País', paises);

        this.initialized = true;
    }

    private static addDictionary(category: string, rawList: string[]) {
        const set = new Set<string>();
        for (const word of rawList) {
            set.add(normalize(word));
        }
        this.datasets[category] = set;
    }

    // [Phoenix CDN] Async hydration from CDN with local fallback
    public static async hydrate(forceReload = false): Promise<void> {
        const entries = Object.entries(this.CATEGORY_FILE_MAP);

        const results = await Promise.allSettled(
            entries.map(async ([category, { file }]) => {
                const url = forceReload
                    ? `${this.CDN_BASE}${file}?v=${Date.now()}`
                    : `${this.CDN_BASE}${file}`;

                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} for ${file}`);
                }

                const words: string[] = await response.json();
                return { category, words };
            })
        );

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const [category, { fallback }] = entries[i];

            if (result.status === 'fulfilled') {
                // CDN success — rebuild dataset from remote data
                const set = new Set<string>();
                for (const word of result.value.words) {
                    set.add(normalize(word));
                }
                this.datasets[category] = set;
            } else {
                // CDN failed — use local static fallback
                console.warn(`[CDN Fallback] ${category}: ${result.reason}`);
                this.addDictionary(category, fallback);
            }
        }

        this.initialized = true;
    }

    public static hasExact(category: string, word: string): boolean {
        if (!this.initialized) this.initialize();

        const collection = this.datasets[category];
        if (!collection) return false;
        return collection.has(normalize(word));
    }

    public static isFuzzyValid(category: string, word: string): boolean {
        if (!this.initialized) this.initialize();

        const normalizedWord = normalize(word);
        const collection = this.datasets[category];
        if (!collection) return false;

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

    public static getCollection(category: string): Set<string> | undefined {
        if (!this.initialized) this.initialize();
        return this.datasets[category];
    }
}

