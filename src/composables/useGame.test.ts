import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { useGame } from './useGame';
import { useSocket } from './useSocket';

// --- MOCKING ---
// --- MOCKING ---
vi.mock('./useSocket', async () => {
    const { ref } = await vi.importActual<typeof import('vue')>('vue');

    // MOCK STATE - SINGLETON-LIKE
    const lastMessage = ref('');
    const sendSpy = vi.fn();
    const isConnected = ref(true);

    // Core Issue: socket must be a Ref whose value has 'send'.
    // We create a persistent socket object.
    const mockSocketImplementation = { readyState: 1, send: sendSpy };
    const socketRef = ref(mockSocketImplementation);

    return {
        useSocket: () => ({
            socket: socketRef,
            isConnected: isConnected,
            lastMessage: lastMessage,
            setRoomId: vi.fn(),
        })
    };
});

// Helper to simulate incoming server message
async function simulateServerMessage(data: any) {
    const { lastMessage } = useSocket();
    lastMessage.value = JSON.stringify(data);
    await nextTick();
}

// --- HELPER MOCKS ---
class MockStorage {
    store: Record<string, string> = {};
    getItem(key: string) { return this.store[key] || null; }
    setItem(key: string, value: string) { this.store[key] = value.toString(); }
    clear() { this.store = {}; }
    removeItem(key: string) { delete this.store[key]; }
    key(n: number) { return Object.keys(this.store)[n]; }
    get length() { return Object.keys(this.store).length; }
}

describe('useGame Composable', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        const { lastMessage } = useSocket();
        lastMessage.value = '';

        // Setup global storage mock if not present
        if (typeof global.Storage === 'undefined') {
            (global as any).Storage = MockStorage;
            (global as any).localStorage = new MockStorage();
            (global as any).window = { localStorage: (global as any).localStorage };
        }
    });

    it('should sync state from server (UPDATE_STATE)', async () => {
        const { gameState } = useGame();

        const mockState = {
            status: 'PLAYING',
            roundsPlayed: 5,
            players: [],
            config: { maxRounds: 10 }
        };

        await simulateServerMessage({
            type: 'UPDATE_STATE',
            payload: mockState
        });

        expect(gameState.value.status).toBe('PLAYING');
        expect(gameState.value.roundsPlayed).toBe(5);
    });

    it('should send SUBMIT_ANSWERS action', () => {
        const { submitAnswers } = useGame();
        // Get the spy directly from the mock structure we know exists
        const { socket } = useSocket();
        const sendSpy = socket.value!.send;

        const answers = { animal: 'Perro', pais: 'Chile' };
        submitAnswers(answers);

        expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({
            type: 'SUBMIT_ANSWERS',
            payload: { answers }
        }));
    });

    it('should correctly identify Host status', async () => {
        const mockUserId = 'user123';
        const storageMethod = (global as any).localStorage ? (global as any).localStorage : window.localStorage;
        vi.spyOn(storageMethod, 'getItem').mockImplementation((key) => {
            if (key === 'tuti-user-id') return mockUserId;
            return null;
        });

        const { amIHost } = useGame();

        await simulateServerMessage({
            type: 'UPDATE_STATE',
            payload: {
                players: [{ id: mockUserId, isHost: true }]
            }
        });

        expect(amIHost.value).toBe(true);

        await simulateServerMessage({
            type: 'UPDATE_STATE',
            payload: {
                players: [{ id: 'otherUser', isHost: true }]
            }
        });

        expect(amIHost.value).toBe(false);
    });

    it('should send START_GAME action', () => {
        const { startGame } = useGame();
        const { socket } = useSocket();
        const sendSpy = socket.value!.send;

        startGame();
        expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({ type: 'START_GAME' }));
    });
});
