import { WebSocketServer } from 'ws';
import { randomUUID } from 'crypto';

const wss = new WebSocketServer({ port: 1999 });

console.log('🎉 Mock PartyKit Server running on ws://localhost:1999');

// In-memory state
let gameState = {
    status: 'LOBBY',
    players: []
};

// Map to track socket -> player mapping
const socketToPlayerId = new Map();

function broadcast(message) {
    const data = JSON.stringify(message);
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(data);
        }
    });
}

wss.on('connection', (ws) => {
    const connectionId = randomUUID();
    console.log(`✅ Client connected: ${connectionId}`);

    // Send initial welcome/system message
    ws.send(JSON.stringify({
        type: "SYSTEM",
        payload: "Connected to Mock Server"
    }));

    // Send current state immediately upon connection
    ws.send(JSON.stringify({
        type: "UPDATE_STATE",
        payload: gameState
    }));

    ws.on('message', (rawMessage) => {
        try {
            const message = JSON.parse(rawMessage.toString());
            console.log(`📨 Received from ${connectionId}:`, message);

            if (message.type === 'JOIN') {
                const newPlayer = {
                    id: connectionId,
                    name: message.payload.name,
                    score: 0,
                    isHost: gameState.players.length === 0 // First player is host
                };

                // Check if player already exists (reconnection logic could go here, but for now simple add)
                // We'll just push for now. In a real app we'd check ID.
                gameState.players.push(newPlayer);
                socketToPlayerId.set(ws, connectionId);

                console.log(`👤 Player joined: ${newPlayer.name} (Host: ${newPlayer.isHost})`);

                // Broadcast new state
                broadcast({
                    type: "UPDATE_STATE",
                    payload: gameState
                });
            }

        } catch (e) {
            console.error('Error processing message:', e);
        }
    });

    ws.on('close', () => {
        console.log(`❌ Client disconnected: ${connectionId}`);

        const playerId = socketToPlayerId.get(ws);
        if (playerId) {
            // Remove player from state
            const wasHost = gameState.players.find(p => p.id === playerId)?.isHost;
            gameState.players = gameState.players.filter(p => p.id !== playerId);
            socketToPlayerId.delete(ws);

            // Reassign host if needed
            if (wasHost && gameState.players.length > 0) {
                gameState.players[0].isHost = true;
            }

            // Broadcast update
            broadcast({
                type: "UPDATE_STATE",
                payload: gameState
            });
        }
    });
});
