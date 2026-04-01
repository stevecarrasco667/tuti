import type { RoomState } from '../../shared/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PodiumEntry {
    name: string;
    avatar: string;
    score: number;
}

export interface ClassicHighlights {
    mode: 'CLASSIC';
    podium: PodiumEntry[];
    mostControversial: {
        playerName: string;
        playerAvatar: string;
        category: string;
        answer: string;
        voteCount: number;
    } | null;
    velocista: {
        name: string;
        avatar: string;
        filledCount: number;
    } | null;
    roundsPlayed: number;
    totalPlayers: number;
    date: string;
}

export interface ImpostorHighlights {
    mode: 'IMPOSTOR';
    winner: 'IMPOSTOR' | 'CREW' | null;
    impostorName: string | null;
    impostorAvatar: string | null;
    secretWord: string | null;
    mostSuspected: {
        name: string;
        avatar: string;
        accusationCount: number;
    } | null;
    totalPlayers: number;
    date: string;
}

export type MatchHighlights = ClassicHighlights | ImpostorHighlights;

// ─── Main Computation ─────────────────────────────────────────────────────────

/**
 * Pure function — no Vue reactivity. Call from a computed() in the view.
 * Extracts shareable highlights from the final gameState snapshot.
 *
 * KNOWN LIMITATION (accepted for v1.0):
 * gameState.answers and gameState.votes hold only the LAST round's data.
 * Highlights marked "última ronda" reflect this constraint honestly.
 */
export function computeMatchHighlights(gameState: RoomState): MatchHighlights {
    const date = new Date().toLocaleDateString('es-AR', {
        day: 'numeric', month: 'long', year: 'numeric',
    });
    const totalPlayers = gameState.players.length;

    // ── IMPOSTOR MODE ────────────────────────────────────────────────────────
    if (gameState.config.mode === 'IMPOSTOR') {
        const imp = gameState.impostorData;
        const cycle = imp?.cycleResult;
        const revealedImpostorIds = cycle?.revealedImpostorIds ?? [];

        // Most suspected non-impostor: count how many votes each non-impostor received
        // impostorData.votes is Record<voterId, accusedId>
        let mostSuspected: ImpostorHighlights['mostSuspected'] = null;
        if (imp?.votes) {
            const tally: Record<string, number> = {};
            for (const accusedId of Object.values(imp.votes)) {
                if (!revealedImpostorIds.includes(accusedId)) {
                    tally[accusedId] = (tally[accusedId] ?? 0) + 1;
                }
            }
            const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
            if (top && top[1] > 0) {
                const player = gameState.players.find(p => p.id === top[0]);
                if (player) {
                    mostSuspected = {
                        name: player.name,
                        avatar: player.avatar || '👤',
                        accusationCount: top[1],
                    };
                }
            }
        }

        const impostorPlayer = revealedImpostorIds.length > 0
            ? gameState.players.find(p => p.id === revealedImpostorIds[0])
            : null;

        return {
            mode: 'IMPOSTOR',
            winner: cycle?.winner ?? null,
            impostorName: impostorPlayer?.name ?? null,
            impostorAvatar: impostorPlayer?.avatar ?? null,
            secretWord: cycle?.revealedSecretWord ?? null,
            mostSuspected,
            totalPlayers,
            date,
        };
    }

    // ── CLASSIC MODE ─────────────────────────────────────────────────────────
    const sorted = [...gameState.players].sort((a, b) => b.score - a.score);
    const podium: PodiumEntry[] = sorted.slice(0, 3).map(p => ({
        name: p.name,
        avatar: p.avatar || '👤',
        score: p.score,
    }));

    // Most controversial: [targetPlayerId][category] with most negative votes
    let mostControversial: ClassicHighlights['mostControversial'] = null;
    let maxVotes = 0;
    for (const [targetId, catVotes] of Object.entries(gameState.votes)) {
        for (const [category, voterIds] of Object.entries(catVotes)) {
            if (voterIds.length > maxVotes) {
                const answer = gameState.answers[targetId]?.[category]?.trim();
                if (answer) {
                    const player = gameState.players.find(p => p.id === targetId);
                    if (player) {
                        maxVotes = voterIds.length;
                        mostControversial = {
                            playerName: player.name,
                            playerAvatar: player.avatar || '👤',
                            category,
                            answer,
                            voteCount: voterIds.length,
                        };
                    }
                }
            }
        }
    }

    // Velocista: player with highest filledCount (last round only)
    let velocista: ClassicHighlights['velocista'] = null;
    let maxFilled = 0;
    for (const p of gameState.players) {
        const filled = p.filledCount ?? 0;
        if (filled > maxFilled) {
            maxFilled = filled;
            velocista = { name: p.name, avatar: p.avatar || '👤', filledCount: maxFilled };
        }
    }

    return {
        mode: 'CLASSIC',
        podium,
        mostControversial: maxVotes > 0 ? mostControversial : null,
        velocista: maxFilled > 0 ? velocista : null,
        roundsPlayed: gameState.roundsPlayed,
        totalPlayers,
        date,
    };
}
