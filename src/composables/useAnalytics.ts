/**
 * useAnalytics — Composable agnóstico de PostHog
 *
 * Expone eventos tipados del funnel de Tuti. Si PostHog no está
 * inicializado (VITE_POSTHOG_KEY no definida), todos los métodos
 * son no-ops silenciosos — NUNCA rompe la app.
 *
 * Funnel Principal:
 *   home_view → create_room / join_room_attempt → lobby_entered →
 *   game_started → round_stopped → game_over → share_initiated
 */
import posthog from 'posthog-js';

// ── Tipos ─────────────────────────────────────────────────────────────────────
export type GameMode = 'CLASSIC' | 'IMPOSTOR';

type Props = Record<string, unknown>;

type RoomCreatedProps  = Props & { mode: GameMode; is_public: boolean }
type RoomJoinedProps   = Props & { method: 'code' | 'public_list' | 'direct_link' }
type LobbyEnteredProps = Props & { player_count: number; mode: GameMode; room_id: string }
type GameStartedProps  = Props & { player_count: number; mode: GameMode; round_total: number; letter: string }
type RoundStoppedProps = Props & { trigger: 'basta' | 'timer'; round_number: number; categories: number }
type GameOverProps     = Props & { mode: GameMode; rounds_played: number; player_count: number; reason: string }
type ShareInitiatedProps = Props & { method: 'native' | 'clipboard'; screen: 'game_over' | 'lobby' }
type VoteSubmittedProps  = Props & { round_number: number; categories_voted: number }

// ── Singleton check (evita doble init en dev HMR) ─────────────────────────────
let _initialized = false;

export function initPostHog(key: string): void {
    if (_initialized || !key) return;
    posthog.init(key, {
        api_host:            'https://us.i.posthog.com', // Servidor US (según la región del proyecto)
        capture_pageview:    false,                      // Lo gestionamos manualmente con vue-router
        capture_pageleave:   true,
        autocapture:         false,                      // Solo eventos explícitos — reduce ruido
        persistence:         'localStorage+cookie',
        session_recording:   {
            maskAllInputs: true,                         // Ocultar lo que escriben los jugadores
        },
    });
    _initialized = true;
}

// ── Composable ────────────────────────────────────────────────────────────────
export function useAnalytics() {

    const track = (event: string, props?: Record<string, unknown>) => {
        try {
            if (_initialized) posthog.capture(event, props);
        } catch { /* silencioso */ }
    };

    const identify = (userId: string, name: string) => {
        try {
            if (_initialized) {
                posthog.identify(userId, { name });
            }
        } catch { /* silencioso */ }
    };

    const page = (pageName: string, props?: Record<string, unknown>) => {
        try {
            if (_initialized) posthog.capture('$pageview', { page: pageName, ...props });
        } catch { /* silencioso */ }
    };

    // ── Eventos tipados del funnel ─────────────────────────────────────────────

    /** Usuario llega al Home */
    const trackHomeView = () => page('home');

    /** Usuario hizo clic en "Crear Sala" */
    const trackRoomCreated = (props: RoomCreatedProps) =>
        track('room_created', props);

    /** Usuario intentó unirse con un código */
    const trackRoomJoined = (props: RoomJoinedProps) =>
        track('room_join_attempt', props);

    /** Usuario aterrizó en el Lobby (conexión WebSocket establecida) */
    const trackLobbyEntered = (props: LobbyEnteredProps) =>
        track('lobby_entered', props);

    /** El host inició la partida */
    const trackGameStarted = (props: GameStartedProps) =>
        track('game_started', props);

    /** Un jugador gritó BASTA o el timer expiró */
    const trackRoundStopped = (props: RoundStoppedProps) =>
        track('round_stopped', props);

    /** La partida terminó */
    const trackGameOver = (props: GameOverProps) =>
        track('game_over', props);

    /** Usuario presionó compartir */
    const trackShareInitiated = (props: ShareInitiatedProps) =>
        track('share_initiated', props);

    /** Usuario confirmó votos en REVIEW */
    const trackVoteSubmitted = (props: VoteSubmittedProps) =>
        track('vote_submitted', props);

    /** Capturar excepción no controlada **/
    const trackException = (message: string, stack?: string) =>
        track('exception_captured', { message, stack });

    return {
        identify,
        page,
        trackHomeView,
        trackRoomCreated,
        trackRoomJoined,
        trackLobbyEntered,
        trackGameStarted,
        trackRoundStopped,
        trackGameOver,
        trackShareInitiated,
        trackVoteSubmitted,
        trackException,
    };
}
