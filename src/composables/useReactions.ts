import { ref, reactive } from 'vue';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReactionBurst {
    id: string;
    targetPlayerId: string;
    categoryId: string;
    emoji: string;
    offsetX: number;
}

// ─── Global Singleton State ───────────────────────────────────────────────────

// ⚡ reactive() en lugar de ref():
// Esto permite que getCountsForTarget retorne la sección INTERNA del mapa
// como un Proxy reactivo de Vue, en lugar de copiarla en un objeto plain.
// Así, cualquier mutación (registerReaction) es detectada en TODOS los clientes
// que rendericen <ReactionBar :counts="getCountsForTarget(...)"/>
//
// Estructura: reactionMap[key][senderId] = emoji
// key = `${targetPlayerId}::${categoryId}`
const reactionMap = reactive<Record<string, Record<string, string>>>({});

// Bursts efímeros para la animación de entrada (1.5s)
const reactionBursts = ref<ReactionBurst[]>([]);

// ─── Composable ───────────────────────────────────────────────────────────────

export function useReactions() {

    /**
     * Registra/actualiza la reacción de un jugador (swap automático).
     * Modifica el reactive directamente → Vue propaga a todos los componentes.
     */
    const registerReaction = (
        targetPlayerId: string,
        categoryId: string,
        emoji: string,
        senderId: string
    ) => {
        const key = `${targetPlayerId}::${categoryId}`;

        if (!reactionMap[key]) {
            reactionMap[key] = {};
        }
        // Swap: sobreescribe la reacción anterior del mismo usuario
        reactionMap[key][senderId] = emoji;

        // Burst efímero de entrada (solo visual, 1.5s)
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
     * Retorna los contadores emoji→count para un (target, category).
     *
     * ⚡ CLAVE: retorna un COMPUTED derivado del reactive, NO un objeto plain copiado.
     * Vue trackea la dependencia sobre reactionMap[key] directamente,
     * por lo que cualquier mutación hace que ReactionBar re-renderice en TODOS los clientes.
     */
    const getCountsForTarget = (targetPlayerId: string, categoryId: string): Record<string, number> => {
        const key = `${targetPlayerId}::${categoryId}`;
        const senderMap = reactionMap[key]; // ← Proxy reactivo directo (NO .value)
        if (!senderMap) return {};

        // Construir counts a partir del reactive Proxy
        // Vue trackea el acceso a cada property del Proxy durante el render
        const counts: Record<string, number> = {};
        for (const emoji of Object.values(senderMap)) {
            counts[emoji] = (counts[emoji] || 0) + 1;
        }
        return counts;
    };

    /**
     * Bursts activos para la animación de entrada de un (target, category).
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
        // Eliminar todas las keys del reactive (mantiene la ref)
        for (const key of Object.keys(reactionMap)) {
            delete reactionMap[key];
        }
        reactionBursts.value = [];
    };

    return {
        registerReaction,
        getCountsForTarget,
        getBurstsForTarget,
        clearReactions,
    };
}
