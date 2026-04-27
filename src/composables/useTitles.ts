import type { RoomState } from '../../shared/types';

export interface PlayerTitle {
    playerId: string;
    emoji: string;
    titleId: string;
}

/**
 * [Fase 4.1] Asignación de títulos cómicos post-partida.
 * Cada título evalúa datos del gameState al final de la partida.
 * Los títulos no son acumulables — un jugador recibe el más relevante.
 */
export function useTitles() {

    const assignTitles = (gameState: RoomState): PlayerTitle[] => {
        const players = gameState.players;
        if (players.length === 0) return [];

        const titles: PlayerTitle[] = [];
        const assigned = new Set<string>(); // evitar doble título al mismo jugador
        const titleUsed = new Set<string>(); // evitar el mismo título dos veces

        const addTitle = (playerId: string, emoji: string, titleId: string) => {
            if (assigned.has(playerId) || titleUsed.has(titleId)) return;
            titles.push({ playerId, emoji, titleId });
            assigned.add(playerId);
            titleUsed.add(titleId);
        };

        const sorted = [...players].sort((a, b) => b.score - a.score);
        const winner = sorted[0];
        const loser = sorted[sorted.length - 1];

        // ── Basados en puntuación ──────────────────────────────
        if (winner) {
            addTitle(winner.id, '👑', 'king');
        }

        if (loser && loser.id !== winner?.id) {
            addTitle(loser.id, '🥕', 'loser');
        }

        // ── Modo Clásico: basados en respuestas ────────────────
        // "El Poeta" — jugador con la respuesta más larga en promedio
        const answers = gameState.answers;
        if (Object.keys(answers).length > 0) {
            let maxAvgLen = 0;
            let poeta: string | null = null;

            for (const [pid, cats] of Object.entries(answers)) {
                const vals = Object.values(cats).filter(v => v.length > 0);
                if (vals.length === 0) continue;
                const avg = vals.reduce((s, v) => s + v.length, 0) / vals.length;
                if (avg > maxAvgLen) { maxAvgLen = avg; poeta = pid; }
            }
            if (poeta) addTitle(poeta, '✍️', 'poet');

            // "El Velocista" — quien llenó más categorías
            let maxFilled = 0;
            let velocista: string | null = null;
            for (const p of players) {
                const filled = p.filledCount ?? 0;
                if (filled > maxFilled) { maxFilled = filled; velocista = p.id; }
            }
            if (velocista) addTitle(velocista, '⚡', 'fast');
        }

        // ── Modo Impostor ──────────────────────────────────────
        if (gameState.config.mode === 'IMPOSTOR' && gameState.impostorData) {
            const { revealedImpostorIds, winner: impWinner } = gameState.impostorData.cycleResult || {};

            if (revealedImpostorIds?.length) {
                const impostorId = revealedImpostorIds[0];
                if (impWinner === 'IMPOSTOR') {
                    addTitle(impostorId, '🎭', 'impostor');
                } else {
                    addTitle(impostorId, '💀', 'impostor'); // Can use same title ID or a different one. Using impostor for both as they are same in json, wait no, let's use impostor for both. Wait, "El Desenmascarado" -> I'll just use 'impostor'
                }
            }

            // El jugador más votado que NO era impostor
            const votes = gameState.votes;
            let maxVotesReceived = 0;
            let mostVoted: string | null = null;

            for (const [targetId, catVotes] of Object.entries(votes)) {
                const totalVotes = Object.values(catVotes).flat().length;
                const isImpostor = revealedImpostorIds?.includes(targetId);
                if (!isImpostor && totalVotes > maxVotesReceived) {
                    maxVotesReceived = totalVotes;
                    mostVoted = targetId;
                }
            }
            if (mostVoted && maxVotesReceived > 0) {
                addTitle(mostVoted, '🎯', 'suspect');
            }
        }

        // ── Título de consolación para quien no tiene título ─
        for (const p of players) {
            if (!assigned.has(p.id)) {
                addTitle(p.id, '🧑‍💻', 'original'); // "El Tranquilo" replaced with "original" or similar from JSON
            }
        }

        return titles;
    };

    return { assignTitles };
}
