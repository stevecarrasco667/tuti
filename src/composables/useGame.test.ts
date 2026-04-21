import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { useGame } from './useGame';
import { useSocket } from './useSocket';

// --- MOCKING ---
vi.mock('../router/index', () => ({
    router: {
        push: vi.fn(),
        currentRoute: { value: { fullPath: '/lobby/test-room' } }
    }
}));

vi.mock('./useToast', () => ({
    useToast: () => ({ addToast: vi.fn() })
}));

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
            disconnectIntentionally: vi.fn()
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

        // Setup global WebSocket constant
        if (typeof global.WebSocket === 'undefined') {
            (global as any).WebSocket = { OPEN: 1, CONNECTING: 0, CLOSING: 2, CLOSED: 3 };
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

    it('should handle PATCH_STATE correctly and request FULL_SYNC if desynced', async () => {
        const { gameState } = useGame();
        const { socket } = useSocket();
        const sendSpy = socket.value!.send;

        // Base state
        await simulateServerMessage({
            type: 'UPDATE_STATE',
            payload: { stateVersion: 10, players: [] }
        });
        expect(gameState.value.stateVersion).toBe(10);

        // Good patch
        await simulateServerMessage({
            type: 'PATCH_STATE',
            payload: { stateVersion: 11, patches: [{ op: 'replace', path: '/status', value: 'PLAYING' }] }
        });
        expect(gameState.value.status).toBe('PLAYING');
        expect(gameState.value.stateVersion).toBe(11);

        // Desynced patch (skipped a version)
        await simulateServerMessage({
            type: 'PATCH_STATE',
            payload: { stateVersion: 13, patches: [] }
        });
        
        // Assert full sync was requested
        expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({ type: 'REQUEST_FULL_SYNC' }));
        // Version should remain 11 until full sync arrives
        expect(gameState.value.stateVersion).toBe(11);
    });

    it('should handle ROOM_DEAD by redirecting to home', async () => {
        const routerMock = await import('../router/index');
        
        // Make sure we initialize the composable to trigger listeners
        useGame();

        await simulateServerMessage({
            type: 'ROOM_DEAD',
            payload: {}
        });

        expect(routerMock.router.push).toHaveBeenCalledWith('/');
    });
});
