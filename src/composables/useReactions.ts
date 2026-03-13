import { ref } from 'vue';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReactionBurst {
    id: string;
    targetPlayerId: string;
    categoryId: string;
    emoji: string;
    offsetX: number; // posición fija asignada al crear (no Math.random en template)
}

// ─── Global Singleton State ───────────────────────────────────────────────────

// Modelo correcto: key = "targetId::catId" → senderId → emoji
// Esto garantiza max 1 reacción por usuario y swap automático
const reactionMap = ref<Record<string, Record<string, string>>>({});

// Cola de bursts efímeros para la animación de entrada (1.5s, no persiste)
const reactionBursts = ref<ReactionBurst[]>([]);

// ─── Composable ───────────────────────────────────────────────────────────────

export function useReactions() {

    /**
     * Registra/actualiza la reacción de un jugador.
     * Si el jugador ya tenía una reacción anterior, la reemplaza (swap).
     * Esto es el único punto de actualización del estado.
     */
    const registerReaction = (
        targetPlayerId: string,
        categoryId: string,
        emoji: string,
        senderId: string
    ) => {
        const key = `${targetPlayerId}::${categoryId}`;

        if (!reactionMap.value[key]) {
            reactionMap.value[key] = {};
        }

        // Swap: si el mismo usuario vuelve a reaccionar, simplemente se sobreescribe
        reactionMap.value[key][senderId] = emoji;

        // Burst de animación de entrada (solo visual, 1.5s)
        const burstId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        reactionBursts.value.push({
            id: burstId,
            targetPlayerId,
            categoryId,
            emoji,
            offsetX: 20 + Math.random() * 60,
        });
        setTimeout(() => {
            const idx = reactionBursts.value.findIndex(b => b.id === burstId);
            if (idx > -1) reactionBursts.value.splice(idx, 1);
        }, 1500);
    };

    /**
     * Retorna los contadores agrupados: emoji → número de usuarios que lo pusieron.
     * Derivado del reactionMap, siempre consistente.
     */
    const getCountsForTarget = (targetPlayerId: string, categoryId: string): Record<string, number> => {
        const key = `${targetPlayerId}::${categoryId}`;
        const senderMap = reactionMap.value[key];
        if (!senderMap) return {};

        const counts: Record<string, number> = {};
        for (const emoji of Object.values(senderMap)) {
            counts[emoji] = (counts[emoji] || 0) + 1;
        }
        return counts;
    };

    /**
     * Retorna los bursts activos para un jugador (animación de entrada).
     */
    const getBurstsForTarget = (targetPlayerId: string, categoryId: string): ReactionBurst[] => {
        return reactionBursts.value.filter(
            b => b.targetPlayerId === targetPlayerId && b.categoryId === categoryId
        );
    };

    /**
     * Limpia todo al cambiar de ronda/categoría.
     */
    const clearReactions = () => {
        reactionMap.value = {};
        reactionBursts.value = [];
    };

    return {
        registerReaction,
        getCountsForTarget,
        getBurstsForTarget,
        clearReactions,
    };
}
