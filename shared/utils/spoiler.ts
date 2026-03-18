/**
 * [P12] Anti-Spoiler Shield — shared/utils/spoiler.ts
 * Función pura y sin efectos secundarios. Importable en frontend Y backend.
 *
 * ALGORITMO (en orden de precedencia):
 *  1. Normalización: minúsculas + NFD (quita tildes) + elimina puntuación
 *  2. Stemming básico: extrae la raíz del secreto (sin las últimas 2 letras)
 *  3. RegEx dinámica con \W* entre letras (captura evasiones "p e r r o", "p-e-r-r-o")
 *     + sufijos opcionales comunes en español
 *     + límites de palabra (^|\W) ... ($|\W) para evitar falsos positivos en subcadenas
 */

const SUFFIXES = ['o', 'a', 'os', 'as', 'ito', 'ita', 'itos', 'itas', 'illo', 'illa', 'ote', 'ota', 'es'];

/** Normalización: minúsculas → quitar diacríticos → quitar puntuación → colapsar espacios */
function normalize(str: string): string {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Mn}/gu, '')          // quita diacríticos (á→a, ñ→n, etc.)
        .replace(/[^a-z0-9\s]/g, ' ')     // reemplaza puntuación por espacio
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Stemming básico en español: devuelve la raíz del string
 * eliminando la vocal final si la tiene.
 * Ejemplo: "perro" → "perr", "manzana" → "manzan", "gato" → "gat"
 */
function stem(word: string): string {
    return word.replace(/[aeiou]$/i, '');
}

/**
 * Construye una RegEx que detecta la raíz del secreto con:
 * - \W* entre cada letra (captura evasión por espacios/guiones)
 * - sufijos opcionales comunes en español
 * - límites de "no-palabra" para no atrapar subcadenas internas
 */
function buildSpoilerRegex(secretNormalized: string): RegExp {
    const root = stem(secretNormalized);

    // \W* entre cada letra para capturar "p e r r o", "p-e-r-r-o"
    const spacedRoot = root.split('').join('\\W*');

    // Sufijos como grupo alternativo opcional
    const suffixGroup = `(?:${SUFFIXES.join('|')})?`;

    // Límites: user explicitely requested (^|\W) and ($|\W)
    const pattern = `(^|\\W)(${spacedRoot}${suffixGroup})($|\\W)`;

    return new RegExp(pattern, 'i');
}

/**
 * isSpoiler(input, secretCategory): boolean
 *
 * Devuelve true si el input contiene (o evade) la categoría secreta.
 *
 * @param input           - Texto del usuario (respuesta o chat)
 * @param secretCategory  - La palabra secreta de la ronda
 */
export function isSpoiler(input: string, secretCategory: string): boolean {
    if (!input || !secretCategory) return false;

    const normalizedInput = normalize(input);
    const normalizedSecret = normalize(secretCategory);

    // Si el secreto es demasiado corto, evitar falsos positivos
    if (normalizedSecret.length <= 2) return false;

    // La categoría secreta puede ser multi-token (ej. "Rock Pesado")
    // Evaluamos CADA token de forma independiente
    const secretTokens = normalizedSecret.split(/\s+/).filter(t => t.length > 2);

    for (const token of secretTokens) {
        const regex = buildSpoilerRegex(token);
        if (regex.test(normalizedInput)) {
            return true;
        }
    }

    return false;
}
