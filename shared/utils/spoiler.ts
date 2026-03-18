/**
 * [P12] Anti-Spoiler Shield — shared/utils/spoiler.ts
 * Función pura y sin efectos secundarios. Importable en frontend Y backend.
 *
 * ALGORITMO (en orden de precedencia):
 *  1. Normalización: minúsculas + NFD (quita tildes) + elimina puntuación
 *  2. Stemming básico: extrae la raíz del secreto (elimina vocal final)
 *  3. RegEx dinámica con \W{0,2} entre letras (captura "p e r r o", "p-e-r-r-o")
 *     + el sufijo original + sufijos comunes en español
 *     + límites de palabra (^|\W) ... ($|\W) para evitar falsos positivos en subcadenas
 *  4. Guardia: raíz post-stemming debe tener ≥ 3 chars (evita falsos positivos con tokens genéricos)
 *  5. Tokens numéricos ≥ 2 dígitos también se evalúan (ej: "Apollo 13")
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
 * Ejemplo: "perro" → "perr", "manzana" → "manzan", "cine" → "cin"
 */
function stem(word: string): string {
    return word.replace(/[aeiou]$/i, '');
}

/**
 * Construye una RegEx que detecta la raíz del secreto con:
 * - \W{0,2} entre cada letra (captura evasión por espacios/guiones, y evita ReDoS en palabras largas)
 * - La terminación original del secreto + sufijos opcionales en español
 * - Límites de "no-palabra" para no atrapar subcadenas internas
 */
function buildSpoilerRegex(secretNormalized: string): RegExp {
    const root = stem(secretNormalized);

    // La terminación que stem eliminó (ej: "cine" → root="cin", strippedEnding="e")
    // Se añade como primera alternativa para garantizar que la palabra exacta siempre matchee.
    const strippedEnding = secretNormalized.slice(root.length);
    const allSuffixes = strippedEnding
        ? [strippedEnding, ...SUFFIXES.filter(s => s !== strippedEnding)]
        : SUFFIXES;

    // [Fix #7] \W{0,2} en lugar de \W* para capturar "p e r r o" y "p-e-r-r-o"
    // sin riesgo de ReDoS en palabras muy largas (≥10 chars con muchas letras)
    const spacedRoot = root.split('').join('\\W{0,2}');

    // Sufijos como grupo alternativo opcional
    const suffixGroup = `(?:${allSuffixes.join('|')})?`;

    // Límites: user explicitely requested (^|\W) and ($|\W)
    const pattern = `(^|\\W)(${spacedRoot}${suffixGroup})($|\\W)`;

    return new RegExp(pattern, 'i');
}

/**
 * isSpoiler(input, secretWord): boolean
 *
 * Devuelve true si el input contiene (o evade) la palabra secreta de la ronda.
 *
 * @param input      - Texto del usuario (respuesta o chat)
 * @param secretWord - La palabra secreta de la ronda (solo para Tripulantes)
 */
export function isSpoiler(input: string, secretWord: string): boolean {
    if (!input || !secretWord) return false;

    const normalizedInput = normalize(input);
    const normalizedSecret = normalize(secretWord);

    // Si el secreto es demasiado corto, evitar falsos positivos
    if (normalizedSecret.length <= 2) return false;

    // La palabra secreta puede ser multi-token (ej. "Cristiano Ronaldo", "Apollo 13")
    // Evaluamos CADA token de forma independiente.
    // [Fix #6] Incluir tokens numéricos ≥ 2 dígitos además de tokens alfabéticos > 2 chars
    const secretTokens = normalizedSecret
        .split(/\s+/)
        .filter(t => t.length > 2 || /^\d{2,}$/.test(t));

    for (const token of secretTokens) {
        const isNumeric = /^\d+$/.test(token);

        // [Fix #2] Guardia: si la raíz post-stemming tiene < 3 chars, el token es demasiado
        // genérico (ej: "ONU" → "on") y lo saltamos para evitar falsos positivos masivos.
        // Los tokens numéricos son siempre exactos y no pasan por esta guardia.
        if (!isNumeric) {
            const root = stem(token);
            if (root.length < 3) continue;
        }

        // Los tokens numéricos se evalúan con un regex exacto simple (sin stem ni sufijos)
        const regex = isNumeric
            ? new RegExp(`(^|\\W)(${token})($|\\W)`, 'i')
            : buildSpoilerRegex(token);

        if (regex.test(normalizedInput)) {
            return true;
        }
    }

    return false;
}
