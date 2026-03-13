import { ref,} from 'vue';

// ─── Types ────────────────────────────────────────────────────────────────────

// Emoji burst: aparece brevemente al llegar una reacción nueva (animación de entrada)
export interface ReactionBurst {
    id: string;
    targetPlayerId: string;
    categoryId: string;
    emoji: string;
    // Posición fija asignada en el momento de creación (evita el anti-patrón Math.random en template)
    offsetX: number;
}

// ─── Global Singleton State ───────────────────────────────────────────────────

// Clave aplanada: `${targetPlayerId}::${categoryId}` → emoji → count
// Aplanada para máxima reactividad en Vue 3 (evita problemas con nested Records)
const reactionCounts = ref<Record<string, Record<string, number>>>({});

// Cola de bursts de entrada (se auto-destruyen en 1.5s — solo animación visual)
const reactionBursts = ref<ReactionBurst[]>([]);

// ─── Composable ───────────────────────────────────────────────────────────────

export function useReactions() {

    /**
     * Registra una nueva reacción.
     * - Incrementa el contador persistente (no se pierde).
     * - Encola un burst efímero para la animación de entrada.
     */
    const pushReaction = (targetPlayerId: string, categoryId: string, emoji: string) => {
        // 1. Contador persistente
        const key = `${targetPlayerId}::${categoryId}`;
        if (!reactionCounts.value[key]) {
            reactionCounts.value[key] = {};
        }
        reactionCounts.value[key][emoji] = (reactionCounts.value[key][emoji] || 0) + 1;

        // 2. Burst efímero de animación (posición fijada aquí, no en el template)
        const burstId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        reactionBursts.value.push({
            id: burstId,
            targetPlayerId,
            categoryId,
            emoji,
            offsetX: 25 + Math.random() * 50, // 25%–75% dentro de la tarjeta
        });

        // Destruir el burst pasado 1.5s (solo la animación, no el contador)
        setTimeout(() => {
            const idx = reactionBursts.value.findIndex(b => b.id === burstId);
            if (idx > -1) reactionBursts.value.splice(idx, 1);
        }, 1500);
    };

    /**
     * Retorna el mapa emoji → count para un jugador/categoría específicos.
     * usado por ReactionBar.vue
     */
    const getCountsForTarget = (targetPlayerId: string, categoryId: string): Record<string, number> => {
        const key = `${targetPlayerId}::${categoryId}`;
        return reactionCounts.value[key] ?? {};
    };

    /**
     * Retorna los bursts activos para un jugador (para la animación de entrada).
     */
    const getBurstsForTarget = (targetPlayerId: string, categoryId: string): ReactionBurst[] => {
        return reactionBursts.value.filter(
            b => b.targetPlayerId === targetPlayerId && b.categoryId === categoryId
        );
    };

    /**
     * Limpia TODOS los contadores (llamar al cambiar de ronda/categoría).
     */
    const clearReactions = () => {
        reactionCounts.value = {};
        reactionBursts.value = [];
    };

    return {
        pushReaction,
        getCountsForTarget,
        getBurstsForTarget,
        clearReactions,
    };
}
