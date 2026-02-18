export function generateRoomId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const ADJECTIVES = [
    'Veloz', 'Mistico', 'Loco', 'Audaz', 'Galactico', 'Letal',
    'Epico', 'Turbo', 'Cosmico', 'Salvaje', 'Oscuro', 'Feroz',
    'Astuto', 'Bravo', 'Fantasma', 'Supremo', 'Divino', 'Rudo'
];

const NOUNS = [
    'Panda', 'Tigre', 'Ninja', 'Fantasma', 'Robot', 'Zorro',
    'Dragon', 'Halcon', 'Lobo', 'Fenix', 'Kraken', 'Pantera',
    'Cobra', 'Titan', 'Rayo', 'Jaguar', 'Condor', 'Vikingo'
];

export function generateRandomName(): string {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `${noun}_${adj}`;
}
