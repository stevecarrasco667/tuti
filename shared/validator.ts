
// Lista expandida de términos ofensivos (multipais)
const BLACKLIST = new Set([
    "puto", "puta", "maricon", "mierda", "verga", "pija", "concha",
    "retrasado", "imbecil", "estupido", "idiota", "mogolico",
    "pendejo", "cabron", "culero", "chinga", "pinche",
    "weon", "boludo", "pelotudo", "forro", "culiao", "conchetumare", 
    "pirobo", "malparido", "guevon", "mamabicho", "singar",
    // Sensible leetspeak basic
    "pvt0", "pvt@", "m1erda", "v3rga", "p1ja", "p3ndejo"
]);

// (Removed DictionaryManager import)

export function validateWord(word: string, _category: string): { isValid: boolean, isFuzzy: boolean } {
    const cleanWord = word.trim().toLowerCase();

    // 1. Sanity Check
    if (!cleanWord) return { isValid: false, isFuzzy: false };

    // 2. Blacklist Check
    if (BLACKLIST.has(cleanWord)) return { isValid: false, isFuzzy: false };

    // 3. Fallback: Trust user input but rely on server Voting/ScoreSystem for real check
    return { isValid: true, isFuzzy: false };
}
