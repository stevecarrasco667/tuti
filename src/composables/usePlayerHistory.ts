import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

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
    const { isAuthenticated, user } = useAuth();

    const getHistory = async (): Promise<GameHistoryEntry[]> => {
        if (!isAuthenticated.value || !user.value) {
            // Guest mode: load from localStorage
            try {
                const raw = localStorage.getItem(HISTORY_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch {
                return [];
            }
        }

        // Authenticated mode: load from Supabase match_history
        try {
            const { data, error } = await supabase
                .from('match_history')
                .select('mode, my_score, my_rank, total_players, won, date')
                .eq('user_id', user.value.id)
                .order('date', { ascending: false })
                .limit(MAX_ENTRIES);

            if (error) throw error;

            return (data || []).map((row: any) => ({
                date: row.date,
                mode: row.mode as 'CLASSIC' | 'IMPOSTOR',
                myScore: row.my_score ?? 0,
                myRank: row.my_rank ?? 0,
                totalPlayers: row.total_players ?? 0,
                won: row.won ?? false
            }));
        } catch (err) {
            console.error('[usePlayerHistory] Error fetching history from cloud:', err);
            return [];
        }
    };

    const saveEntry = async (entry: GameHistoryEntry) => {
        if (isAuthenticated.value) {
            // For registered users, the server RPC claims rewards and inserts the match history entry,
            // so we don't need to insert it manually from the client.
            return;
        }

        // Guest mode: save locally
        try {
            const history = await getHistory();
            history.unshift(entry); // más reciente primero
            if (history.length > MAX_ENTRIES) history.length = MAX_ENTRIES;
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        } catch {
            console.warn('[usePlayerHistory] Could not save to localStorage.');
        }
    };

    const clearHistory = async () => {
        if (!isAuthenticated.value) {
            localStorage.removeItem(HISTORY_KEY);
        } else {
            // We do not delete match history in the cloud through client deletion
            console.log('[usePlayerHistory] Local action ignored for cloud history.');
        }
    };

    const getStats = async () => {
        const history = await getHistory();
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
