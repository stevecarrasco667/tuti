import { RoomState, Player } from '../types.js';

export class PlayerManager {
    // Map ConnectionID -> UserID
    // This is the source of truth for "who is this socket"
    private connectionMap: Record<string, string> = {};

    public add(state: RoomState, connectionId: string, profile: { id: string; name: string; avatar: string }) {
        // Handle name duplicates
        const existingName = state.players.some(p => p.name.toLowerCase() === profile.name.toLowerCase());
        const finalName = existingName ? `${profile.name} ${Math.floor(Math.random() * 100)}` : profile.name;

        const newPlayer: Player = {
            id: profile.id,
            name: finalName,
            avatar: profile.avatar,
            score: 0,
            isHost: state.players.length === 0, // First joiner acts as Host
            isConnected: true,
            lastSeenAt: Date.now()
        };

        state.players.push(newPlayer);
        this.connectionMap[connectionId] = profile.id;
    }

    public reconnect(state: RoomState, connectionId: string, userId: string): boolean {
        // Check players first
        const player = state.players.find(p => p.id === userId);
        if (player) {
            player.isConnected = true;
            player.lastSeenAt = Date.now();
            delete player.disconnectedAt; // <--- Restore from Zombie
            this.connectionMap[connectionId] = userId;
            return true;
        }
        // [Phoenix] Also check spectators
        const spectator = state.spectators?.find(s => s.id === userId);
        if (spectator) {
            spectator.isConnected = true;
            spectator.lastSeenAt = Date.now();
            delete spectator.disconnectedAt;
            this.connectionMap[connectionId] = userId;
            return true;
        }
        return false;
    }

    // [Phoenix] Register a connection mapping without adding to players array
    public registerConnection(connectionId: string, userId: string) {
        this.connectionMap[connectionId] = userId;
    }

    // SOFT DELETE: Mark as Zombie
    public remove(state: RoomState, connectionId: string) {
        const userId = this.connectionMap[connectionId];
        if (!userId) return;

        // Cleanup map (socket is gone, but player stays)
        delete this.connectionMap[connectionId];

        const player = state.players.find(p => p.id === userId);
        if (player) {
            player.isConnected = false;
            player.lastSeenAt = Date.now();
            player.disconnectedAt = Date.now(); // <--- Mark as Zombie
        }

        // Host Succession: Immediate transfer even if soft disconnected
        this.ensureActiveHost(state);
    }

    // HARD DELETE: Cleanup Zombies
    public removeInactive(state: RoomState, timeoutMs: number): boolean {
        const now = Date.now();
        const initialCount = state.players.length;

        // Filter out players who are disconnected AND expired
        state.players = state.players.filter(p => {
            if (p.isConnected) return true; // Keep active
            if (!p.disconnectedAt) return true; // Should not happen if connected=false, but safe
            return (now - p.disconnectedAt) < timeoutMs; // Keep if within grace period
        });

        const changed = state.players.length !== initialCount;
        if (changed) {
            console.log(`[PlayerManager] Purged ${initialCount - state.players.length} zombies.`);
            this.ensureActiveHost(state); // Re-check just in case
        }
        return changed;
    }

    public kick(state: RoomState, hostConnectionId: string, targetUserId: string): boolean {
        // 1. Verify Requestor is Host
        const hostId = this.connectionMap[hostConnectionId];
        const hostPlayer = state.players.find(p => p.id === hostId);

        if (!hostPlayer || !hostPlayer.isHost) {
            console.warn(`[PlayerManager] Kick failed. Requestor ${hostId} is not host.`);
            return false;
        }

        // 2. Remove Target
        // Remove from connection map (need reverse lookup or just let it stay until disconnect?)
        // Ideally we should find the connectionId for this user to clean the map, 
        // but simple array filter is enough for state.
        // For map, we can iterate or just wait for 'onClose' which calls remove().
        // For strictness:
        const targetConnId = Object.keys(this.connectionMap).find(key => this.connectionMap[key] === targetUserId);
        if (targetConnId) delete this.connectionMap[targetConnId];

        state.players = state.players.filter(p => p.id !== targetUserId);

        return true;
    }

    public getPlayerId(connectionId: string): string | undefined {
        return this.connectionMap[connectionId];
    }

    private ensureActiveHost(state: RoomState) {
        // Check if current host is valid and connected
        const currentHost = state.players.find(p => p.isHost);
        if (currentHost && currentHost.isConnected) return; // All good

        // If host disconnected or no host exists
        if (currentHost) currentHost.isHost = false; // Demote disconnected host

        // Promote oldest connected player
        const nextHost = state.players.find(p => p.isConnected);
        if (nextHost) {
            nextHost.isHost = true;
            console.log(`[PlayerManager] Host succession: ${nextHost.name} is now Host.`);
        } else {
            console.log(`[PlayerManager] No active players left to be host.`);
        }
    }
}
