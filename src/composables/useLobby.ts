import { ref, computed, onUnmounted } from 'vue';
import PartySocket from 'partysocket';
import { EVENTS } from '../../shared/consts';
import type { RoomSnapshot } from '../../shared/types';

const PARTYKIT_HOST = import.meta.env.DEV
    ? '127.0.0.1:1999'
    : import.meta.env.VITE_PARTYKIT_HOST || window.location.host;

// Estado compartido entre montajes de componentes
const publicRooms = ref<RoomSnapshot[]>([]);
let lobbySocket: PartySocket | null = null;
let refCount = 0;

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        if (lobbySocket) { lobbySocket.close(); lobbySocket = null; }
        refCount = 0;
    });
}

// Filtros reactivos (compartidos entre componentes)
export const lobbyFilters = ref({
    onlyJoinable: true,
    mode: 'ALL' as 'ALL' | 'CLASSIC' | 'IMPOSTOR',
    region: 'ALL' as string,
    lang: 'ALL' as string,
});

export function useLobby() {
    // Lista filtrada y ordenada por prioridad
    const filteredRooms = computed(() => {
        const f = lobbyFilters.value;
        return publicRooms.value
            .filter(r => {
                if (f.onlyJoinable && !r.joinable) return false;
                if (f.mode !== 'ALL' && r.mode !== f.mode) return false;
                if (f.region !== 'ALL' && r.region !== f.region) return false;
                if (f.lang !== 'ALL' && r.lang !== f.lang) return false;
                return true;
            })
            .sort((a, b) => {
                // Joinables primero, luego por jugadores desc
                if (a.joinable !== b.joinable) return a.joinable ? -1 : 1;
                return b.currentPlayers - a.currentPlayers;
            });
    });

    const connect = () => {
        refCount++;
        if (lobbySocket) return;

        lobbySocket = new PartySocket({ host: PARTYKIT_HOST, room: 'global', party: 'lobby' });

        lobbySocket.addEventListener('message', (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data as string);

                if (data.type === EVENTS.LOBBY_STATE_UPDATE) {
                    // Snapshot inicial (top 50)
                    publicRooms.value = data.payload as RoomSnapshot[];

                } else if (data.type === EVENTS.ROOM_ADDED) {
                    // Nueva sala: agregar si no existe ya
                    const room = data.payload as RoomSnapshot;
                    if (!publicRooms.value.find(r => r.id === room.id)) {
                        publicRooms.value = [...publicRooms.value, room];
                    }

                } else if (data.type === EVENTS.ROOM_UPDATED) {
                    // Sala actualizada: reemplazar
                    const room = data.payload as RoomSnapshot;
                    publicRooms.value = publicRooms.value.map(r => r.id === room.id ? room : r);

                } else if (data.type === EVENTS.ROOM_REMOVED) {
                    // Sala eliminada: filtrar
                    const { id } = data.payload as { id: string };
                    publicRooms.value = publicRooms.value.filter(r => r.id !== id);
                }
            } catch {
                // Ignorar mensajes malformados
            }
        });
    };

    const disconnect = () => {
        if (refCount > 0) refCount--;
        if (refCount <= 0 && lobbySocket) {
            lobbySocket.close();
            lobbySocket = null;
            refCount = 0;
            publicRooms.value = [];
        }
    };

    const refreshRooms = () => {
        if (lobbySocket) lobbySocket.send('REFRESH');
    };

    // Algoritmo de Partida Rápida: detectar región del cliente por timezone
    const detectUserRegion = (): string => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz.startsWith('America/')) {
            const latinTZ = ['Buenos_Aires','Bogota','Lima','Santiago','Caracas','Sao_Paulo','Mexico_City','Montevideo','Asuncion','La_Paz','Guayaquil','Managua','San_Jose','Tegucigalpa','Guatemala','Belize','Panama','Santo_Domingo','Port-au-Prince','Havana','Kingston','Puerto_Rico'];
            return latinTZ.some(z => tz.includes(z)) ? 'SA' : 'NA';
        }
        if (tz.startsWith('Europe/')) return 'EU';
        if (tz.startsWith('Asia/') || tz.startsWith('Pacific/')) return 'AS';
        if (tz.startsWith('Africa/')) return 'AF';
        return 'NA';
    };

    const quickMatch = (): RoomSnapshot | null => {
        const userRegion = detectUserRegion();
        const joinable = publicRooms.value.filter(r => r.joinable);
        if (joinable.length === 0) return null;

        // Score: misma región → bonus 500, más llena → bonus (players/max * 100)
        const scored = joinable.map(r => ({
            room: r,
            score: (r.region === userRegion ? 500 : 0) + (r.currentPlayers / r.maxPlayers) * 100
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored[0].room;
    };

    onUnmounted(() => disconnect());

    return {
        publicRooms,
        filteredRooms,
        lobbyFilters,
        connect,
        disconnect,
        refreshRooms,
        quickMatch,
        detectUserRegion,
    };
}
