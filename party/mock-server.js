import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 1999 });

console.log('🎉 Mock PartyKit Server running on ws://localhost:1999');

wss.on('connection', (ws) => {
    console.log('✅ Client connected');

    // Send welcome message matching our protocol
    ws.send(JSON.stringify({
        type: "SYSTEM",
        payload: "WELCOME_FROM_MOCK"
    }));

    ws.on('message', (message) => {
        console.log('📨 Received:', message.toString());

        // Echo back for testing
        ws.send(JSON.stringify({
            type: "ECHO",
            payload: message.toString()
        }));
    });

    ws.on('close', () => {
        console.log('❌ Client disconnected');
    });
});
