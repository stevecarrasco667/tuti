/**
 * Normalizes answer text for smarter comparison.
 * - Trims whitespace
 * - Converts to lowercase
 * - Removes accents/diacritics
 * - Removes common starting articles (el, la, los, las, un, una) to avoid "El Auto" != "Auto"
 */
export function normalizeAnswer(text: string): string {
    if (!text) return "";

    // 1. Basic Cleanup
    let normalized = text.trim().toLowerCase();

    // 2. Remove Accents (NFD normalization + removing diacritic marks)
    normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 3. Remove common starting articles (must be whole words at start)
    // Regex matches start of string (^), ensures word boundary (\b)
    const articles = ["el", "la", "los", "las", "un", "una"];
    const regex = new RegExp(`^(${articles.join("|")})\\s+`, "i");

    normalized = normalized.replace(regex, "");

    return normalized.trim();
}
