/**
 * [Fase 4.3] Historial de partidas en localStorage.
 * Persiste las últimas 20 partidas del jugador local.
 */
export interface GameHistoryEntry {
    date: string;         // ISO string
    mode: 'CLASSIC' | 'IMPOSTOR';
    myScore: number;
    myRank: number;       // 1-based, e.g. 1 = ganó
    totalPlayers: number;
    won: boolean;
}

const HISTORY_KEY = 'tuti_player_history_v1';
const MAX_ENTRIES = 20;

export function usePlayerHistory() {

    const getHistory = (): GameHistoryEntry[] => {
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    };

    const saveEntry = (entry: GameHistoryEntry) => {
        try {
            const history = getHistory();
            history.unshift(entry); // más reciente primero
            if (history.length > MAX_ENTRIES) history.length = MAX_ENTRIES;
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        } catch {
            console.warn('[usePlayerHistory] Could not save to localStorage.');
        }
    };

    const clearHistory = () => {
        localStorage.removeItem(HISTORY_KEY);
    };

    const getStats = () => {
        const history = getHistory();
        if (history.length === 0) return null;

        const wins = history.filter(e => e.won).length;
        const bestScore = Math.max(...history.map(e => e.myScore));
        const avgScore = Math.round(history.reduce((s, e) => s + e.myScore, 0) / history.length);

        return {
            gamesPlayed: history.length,
            wins,
            losses: history.length - wins,
            winRate: Math.round((wins / history.length) * 100),
            bestScore,
            avgScore
        };
    };

    return { getHistory, saveEntry, clearHistory, getStats };
}
