import { supabase } from '../lib/supabase';
import { useGameState } from '../composables/useGameState';

// Rate limiting config
const MAX_ERRORS_PER_MINUTE = 5;
const DEDUPLICATION_WINDOW_MS = 60000;

// Internal state
let errorCount = 0;
let lastReset = Date.now();
const seenErrors = new Set<string>();

/**
 * Sends a structured error report to Supabase client_errors table asynchronously.
 * Protects against infinite render loops via rate-limiting and deduplication.
 */
export async function logErrorToSupabase(err: unknown, source: string, info?: string) {
    // 1. Extract error details
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack?.slice(0, 1000) : undefined;
    
    // 2. Deduplication Check (exact message + source)
    const dedupKey = `${source}:${message}`;
    if (seenErrors.has(dedupKey)) {
        return; // Silent drop - already reported recently
    }

    // 3. Rate Limit Check (Token Bucket)
    const now = Date.now();
    if (now - lastReset > 60000) {
        errorCount = 0;
        lastReset = now;
        seenErrors.clear(); // Reset deduplication window
    }

    if (errorCount >= MAX_ERRORS_PER_MINUTE) {
        console.warn('[Telemetry] Error rate limit exceeded. Dropping report.');
        return;
    }

    // 4. Register error
    errorCount++;
    seenErrors.add(dedupKey);
    setTimeout(() => seenErrors.delete(dedupKey), DEDUPLICATION_WINDOW_MS);

    // 5. Gather Context
    let roomId = undefined;
    try {
        const { gameState } = useGameState();
        // Extract roomId from URL if we are in game view
        const match = window.location.pathname.match(/\/game\/([^\/]+)/);
        if (match && gameState.value.status !== 'LOBBY') {
            roomId = match[1];
        }
    } catch {
        // Ignorar de forma segura si useGameState falla (fuera del scope de Vue)
    }

    const payload = {
        message: `[${source}] ${message}${info ? ` | Context: ${info}` : ''}`,
        stack,
        url: window.location.href,
        room_id: roomId,
        user_agent: navigator.userAgent
    };

    // 6. Async Fire-and-Forget (No awaiting in the main thread)
    supabase.from('client_errors').insert(payload).then(({ error }) => {
        if (error) {
            console.error('[Telemetry] Failed to log error to Supabase:', error.message);
        }
    });
}
