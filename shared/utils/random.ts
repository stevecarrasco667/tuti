/**
 * Módulo de Utilidades Estocásticas (Sprint P6)
 * Proporciona implementaciones matemáticas correctas para aislar las 
 * fallas de entropía inherentes al motor TimSort de V8 en JS.
 */

/**
 * Algoritmo Fisher-Yates Shuffle O(n).
 * Garantiza una distribución uniforme in-place para la selección de Impostores y Diccionarios.
 * Nunca uses `array.sort(() => Math.random() - 0.5)` en Node/Cloudflare.
 */
export function shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}
