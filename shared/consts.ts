export const EVENTS = {
    // Client -> Server
    JOIN: 'JOIN',
    START_GAME: 'START_GAME',
    STOP_ROUND: 'STOP_ROUND',
    SUBMIT_ANSWERS: 'SUBMIT_ANSWERS',
    UPDATE_ANSWERS: 'UPDATE_ANSWERS',
    TOGGLE_VOTE: 'TOGGLE_VOTE',
    CONFIRM_VOTES: 'CONFIRM_VOTES',
    UPDATE_CONFIG: 'UPDATE_CONFIG',
    RESTART_GAME: 'RESTART_GAME',
    KICK_PLAYER: 'KICK_PLAYER',
    EXIT_GAME: 'EXIT_GAME',
    REQUEST_FULL_SYNC: 'REQUEST_FULL_SYNC',
    WORD_REACT: 'WORD_REACT',
    SUBMIT_LAST_WISH: 'SUBMIT_LAST_WISH',   // [P10] Cliente → Servidor: intento de adivinanza de categoría
    LAST_WISH_TYPING: 'LAST_WISH_TYPING',   // [P10] Bidireccional: retransmisión en vivo del texto del Impostor
    UPDATE_IMPOSTOR_DRAFT: 'UPDATE_IMPOSTOR_DRAFT', // [P12] Live draft autoguardado (debounce)
    CONFIRM_IMPOSTOR_WORD: 'CONFIRM_IMPOSTOR_WORD', // [P12] El jugador declara "estoy listo"

    // Chat Events (Client -> Server)
    CHAT_SEND: 'CHAT_SEND',

    // Server -> Client
    UPDATE_STATE: 'UPDATE_STATE',
    PATCH_STATE: 'PATCH_STATE', // [Phoenix] Delta Sync
    AUTH_GRANTED: 'AUTH_GRANTED', // [Phoenix] Anti-Spoofing
    RIVAL_UPDATE: 'RIVAL_UPDATE',
    PRIVATE_ROLE_ASSIGNMENT: 'PRIVATE_ROLE_ASSIGNMENT', // [Sprint 3.4] Whisper: private role per-connection
    SYSTEM_MESSAGE: 'SYSTEM',
    SYSTEM_VERSION: 'SYSTEM_VERSION',

    // Chat Events (Server -> Client)
    CHAT_NEW: 'CHAT_NEW',
    CHAT_HISTORY: 'CHAT_HISTORY',

    // [Phoenix P0] Error Telemetry
    SERVER_ERROR: 'SERVER_ERROR',

    // [Sprint 3 - P2] Membership Events (Server -> Client)
    // Son eventos discretos para disparar Toasts de forma imperativa en el cliente.
    // Evita el anti-patrón de array-diffing en Vue (propenso a race conditions con proxies mutados).
    PLAYER_JOINED: 'PLAYER_JOINED',
    PLAYER_LEFT: 'PLAYER_LEFT',

    // [Phoenix CDN] Admin Commands
    ADMIN_RELOAD_DICTS: 'ADMIN_RELOAD_DICTS',

    // [Phoenix Lobby] Hub-and-Spoke
    LOBBY_STATE_UPDATE: 'LOBBY_STATE_UPDATE',
    ROOM_HEARTBEAT: 'ROOM_HEARTBEAT'
} as const;

export const APP_VERSION = 'v0.5.0';

export const GAME_CONSTS = {
    MAX_POINTS: 100,
    HALF_POINTS: 50,
    ZERO_POINTS: 0,
    BONUS_POINTS: 10,

    DEFAULT_ROUND_DURATION: 60,
    DEFAULT_VOTING_DURATION: 45,
    DEFAULT_CATEGORIES_COUNT: 5,
    DEFAULT_TOTAL_ROUNDS: 5,

    MIN_CATEGORIES: 4,
    MAX_CATEGORIES: 8,

    MIN_ROUND_DURATION: 30,
    MAX_ROUND_DURATION: 180,

    MIN_VOTING_DURATION: 15,
    MAX_VOTING_DURATION: 120,

    ZOMBIE_TIMEOUT_MS: 15000,

    // [Phoenix Lobby] Max players per room
    MAX_PLAYERS: 8
} as const;
