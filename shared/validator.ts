// Basic Levenshtein implementation
export function levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // Increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1  // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

// Simple blacklist for example purposes
const BLACKLIST = new Set([
    "puto", "maricon", "mierda", "verga", "pija", "concha",
    "retrasado", "imbecil", "estupido", "idiota", "mogolico"
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
