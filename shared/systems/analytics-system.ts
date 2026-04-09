import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

export interface GameSessionLog {
    session_id: string;
    room_id: string;
    mode: 'CLASSIC' | 'IMPOSTOR';
    player_count: number;
    rounds_played: number;
    duration_seconds: number;
    end_reason: 'NORMAL' | 'ABANDONED' | 'IMPOSTOR_DISCONNECTED';
    winner_data?: any; // JSONB
}

export interface AnalyticsEventLog {
    room_id: string;
    event_type: 'game_started' | 'player_joined' | 'player_left_mid_game';
    user_id?: string;
    payload?: any; // JSONB
}

export class AnalyticsSystem {
    public static async trackSession(supabase: SupabaseClient, session: GameSessionLog): Promise<void> {
        try {
            if (!supabase || typeof supabase.from !== 'function') return;
            const queryBuilder = supabase.from('game_sessions');
            if (typeof queryBuilder.insert !== 'function') return;

            const { error } = await queryBuilder.insert(session);
            if (error) {
                logger.warn('ANALYTICS_SESSION_FAILED', { error: error.message, sessionId: session.session_id });
            }
        } catch (e) {
            logger.error('ANALYTICS_SESSION_EXCEPTION', { sessionId: session.session_id }, e as Error);
        }
    }

    public static async trackEvent(supabase: SupabaseClient, event: AnalyticsEventLog): Promise<void> {
        try {
            if (!supabase || typeof supabase.from !== 'function') return;
            const queryBuilder = supabase.from('analytics_events');
            if (typeof queryBuilder.insert !== 'function') return;

            const { error } = await queryBuilder.insert(event);
            if (error) {
                logger.warn('ANALYTICS_EVENT_FAILED', { error: error.message, eventType: event.event_type });
            }
        } catch (e) {
            logger.error('ANALYTICS_EVENT_EXCEPTION', { eventType: event.event_type }, e as Error);
        }
    }
}
