import { ref, onUnmounted } from 'vue';
import PartySocket from 'partysocket';
import { EVENTS } from '../../shared/consts';
import type { RoomSnapshot } from '../../shared/types';

const PARTYKIT_HOST = import.meta.env.DEV
    ? '127.0.0.1:1999'
    : import.meta.env.VITE_PARTYKIT_HOST || window.location.host;

// Shared state across component mounts
const publicRooms = ref<RoomSnapshot[]>([]);
let lobbySocket: PartySocket | null = null;
let refCount = 0;

// [Sprint H4 — FE-1] HMR Cleanup Guard.
// When Vite Hot-Module-Replacement re-executes this module, the module-scope
// variables (lobbySocket, refCount) reset to null/0, but the old PartySocket
// stays alive in memory — causing duplicate connections on every file save.
// import.meta.hot.dispose() fires BEFORE the new module takes over, giving us
// a chance to cleanly close the orphaned socket.
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        if (lobbySocket) {
            lobbySocket.close();
            lobbySocket = null;
        }
        refCount = 0;
    });
}

export function useLobby() {
    const connect = () => {
        refCount++;
        if (lobbySocket) return; // Already connected

        lobbySocket = new PartySocket({
            host: PARTYKIT_HOST,
            room: 'global',
            party: 'lobby'
        });

        lobbySocket.addEventListener('message', (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data as string);
                if (data.type === EVENTS.LOBBY_STATE_UPDATE) {
                    publicRooms.value = data.payload as RoomSnapshot[];
                }
            } catch {
                // Ignore malformed messages
            }
        });

        lobbySocket.addEventListener('open', () => {
            console.log('🏛️ Connected to Lobby Orchestrator');
        });

        lobbySocket.addEventListener('close', () => {
            console.log('🏛️ Disconnected from Lobby Orchestrator');
        });
    };

    const disconnect = () => {
        // [Sprint H4 — FE-1] Guard against refCount going negative if disconnect() is
        // called multiple times (e.g. StrictMode double-unmount or HMR edge cases).
        if (refCount > 0) refCount--;
        if (refCount <= 0 && lobbySocket) {
            lobbySocket.close();
            lobbySocket = null;
            refCount = 0;
            publicRooms.value = [];
        }
    };

    // [Phoenix Lobby] Manual refresh — bypasses tick engine
    const refreshRooms = () => {
        if (lobbySocket) lobbySocket.send('REFRESH');
    };

    // Auto-cleanup on component unmount
    onUnmounted(() => {
        disconnect();
    });

    return {
        publicRooms,
        connect,
        disconnect,
        refreshRooms
    };
}

