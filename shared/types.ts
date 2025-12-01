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
    // Add more state properties here as needed
}
