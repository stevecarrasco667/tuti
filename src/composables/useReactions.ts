import { ref } from 'vue';

// Interfaz para representar una reacción en vuelo en la UI
export interface EphemeralReaction {
    id: string; // único de la instancia
    targetPlayerId: string;
    categoryId: string;
    emoji: string;
    timestamp: number;
}

// EventBus reactivo global
const recentReactions = ref<EphemeralReaction[]>([]);

export function useReactions() {
    
    const pushReaction = (targetPlayerId: string, categoryId: string, emoji: string) => {
        const reactId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        
        recentReactions.value.push({
            id: reactId,
            targetPlayerId,
            categoryId,
            emoji,
            timestamp: Date.now()
        });

        // Limpieza automática (Garbage Collection visual) - las reacciones mueren a los 4s 
        // Solo mantienen el contador si el UI decide totalizarlos, pero el objeto vuela.
        setTimeout(() => {
            const index = recentReactions.value.findIndex(r => r.id === reactId);
            if (index > -1) {
                recentReactions.value.splice(index, 1);
            }
        }, 3500);
    };

    // Filter Helper para los componentes Vue
    const getReactionsForTarget = (targetId: string, catId: string) => {
        return recentReactions.value.filter(r => r.targetPlayerId === targetId && r.categoryId === catId);
    };

    return {
        recentReactions,
        pushReaction,
        getReactionsForTarget
    };
}
