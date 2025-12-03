export type GameStatus = 'LOBBY' | 'PLAYING' | 'REVIEW' | 'RESULTS';

export interface Player {
    id: string;
    name: string;
    score: number;
    isHost: boolean;
}

export interface RoomState {
    status: GameStatus;
    players: Player[];
    roomId: string | null;
}

// Messages sent from Client to Server
export type ClientMessage =
    | { type: 'JOIN'; payload: { name: string } };

// Messages sent from Server to Client
export type ServerMessage =
    | { type: 'UPDATE_STATE'; payload: RoomState }
    | { type: 'SYSTEM'; payload: string };
