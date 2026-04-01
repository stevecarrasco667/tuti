/**
 * useMatchHighlights.ts
 * Fase 2 — Motor Viral: Extracción de Highlights del Estado Final
 *
 * Extrae los "mejores momentos" del estado final de la partida para
 * alimentar la MatchSummaryCard. Solo usa datos disponibles en el
 * estado cliente — cero dependencias de Supabase.
 */

import type { RoomState } from '../../shared/types';

// ── Tipos Públicos ────────────────────────────────────────────────────────────

export interface PlayerSnapshot {
    id: string;
    name: string;
    avatar: string;
    score: number;
}

export interface ClassicHighlights {
    mode: 'CLASSIC';
    podium: PlayerSnapshot[];           // Top 3
    flashPlayer: PlayerSnapshot | null; // Primero en presionar BASTA (roundScores más altos)
    mostRejectedWord: { word: string; player: PlayerSnapshot } | null;
    roundsPlayed: number;
}

export interface ImpostorHighlights {
    mode: 'IMPOSTOR';
    winner: 'IMPOSTOR' | 'CREW' | null;
    impostors: PlayerSnapshot[];
    secretWord: string | null;
    mostSuspectPlayer: PlayerSnapshot | null; // Inocente con más votos
    categoryName: string | null;
}

export type MatchHighlights = ClassicHighlights | ImpostorHighlights;

// ── Helper interno ────────────────────────────────────────────────────────────

function toSnapshot(p: RoomState['players'][0]): PlayerSnapshot {
    return { id: p.id, name: p.name, avatar: p.avatar, score: p.score };
}

// ── Extractor Principal ───────────────────────────────────────────────────────

export function computeMatchHighlights(state: RoomState): MatchHighlights {
    const sorted = [...state.players].sort((a, b) => b.score - a.score);

    // ── MODO IMPOSTOR ─────────────────────────────────────────────────────────
    if (state.config.mode === 'IMPOSTOR' && state.impostorData) {
        const data = state.impostorData;
        const result = data.cycleResult;

        // IDs de impostores revelados al final
        const impostorIds: string[] = result?.revealedImpostorIds ?? [];

        // Construir snapshots de impostores
        const impostors: PlayerSnapshot[] = impostorIds
            .map(id => state.players.find(p => p.id === id))
            .filter(Boolean)
            .map(p => toSnapshot(p!));

        // Palabra secreta revelada al final de la partida
        const secretWord = result?.revealedSecretWord ?? null;

        // Ciudadano más sospechoso: inocente con más votos acumulados
        // Usamos voteCounts de la última ronda (única disponible en v1.0)
        let mostSuspectPlayer: PlayerSnapshot | null = null;
        if (data.voteCounts) {
            let maxVotes = 0;
            for (const [targetId, count] of Object.entries(data.voteCounts)) {
                if (!impostorIds.includes(targetId) && count > maxVotes) {
                    maxVotes = count;
                    const p = state.players.find(pl => pl.id === targetId);
                    if (p) mostSuspectPlayer = toSnapshot(p);
                }
            }
        }

        return {
            mode: 'IMPOSTOR',
            winner: result?.winner ?? null,
            impostors,
            secretWord,
            mostSuspectPlayer,
            categoryName: data.currentCategoryName ?? null,
        };
    }

    // ── MODO CLÁSICO ──────────────────────────────────────────────────────────

    // Podio: top 3 jugadores
    const podium = sorted.slice(0, 3).map(toSnapshot);

    // Jugador Flash: el que más rondas detuvo (proxy de más rápido en BASTA).
    // Usamos roundScores: el player con más entradas positivas en roundScores
    // es quien más veces aportó puntos (parada frecuente → buenas letras cubiertas).
    // Sin historial acumulado, usamos score total como proxy de velocidad/efectividad.
    const flashPlayer = sorted.length > 0 ? toSnapshot(sorted[0]) : null;

    // Palabra más rechazada: respuesta con más votos INVALID en answerStatuses
    // (última ronda disponible — limitación aceptada en v1.0)
    let mostRejectedWord: ClassicHighlights['mostRejectedWord'] = null;
    let maxRejections = 0;

    for (const [playerId, catMap] of Object.entries(state.answerStatuses)) {
        for (const [, status] of Object.entries(catMap)) {
            if (status === 'INVALID' || status === 'DUPLICATE') {
                // Count rejections from votes object
                let rejCount = 0;
                for (const [, catVotes] of Object.entries(state.votes)) {
                    for (const [, voters] of Object.entries(catVotes)) {
                        if (Array.isArray(voters)) rejCount += voters.length;
                    }
                }
                if (rejCount > maxRejections) {
                    maxRejections = rejCount;
                    const p = state.players.find(pl => pl.id === playerId);
                    // Find the actual answer word
                    const wordEntry = Object.entries(state.answers[playerId] ?? {})
                        .find(([, v]) => v.trim().length > 0);
                    const word = wordEntry?.[1] ?? '???';
                    if (p) mostRejectedWord = { word, player: toSnapshot(p) };
                }
            }
        }
    }

    return {
        mode: 'CLASSIC',
        podium,
        flashPlayer,
        mostRejectedWord,
        roundsPlayed: state.roundsPlayed,
    };
}
