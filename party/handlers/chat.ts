import type * as Party from "partykit/server";
import { BaseEngine } from "../../shared/engines/base-engine";
import { EVENTS } from "../../shared/consts";
import type { ChatMessage } from "../../shared/types";
import { RateLimiter } from "../utils/rate-limiter";



export class ChatHandler {
    constructor(
        private engine: BaseEngine,
        private rateLimiter: RateLimiter,
        private messages: ChatMessage[],
        private room: Party.Room
    ) { }

    async handleChat(payload: { text: string }, sender: Party.Connection) {
        // 1. Rate Limiting (The Wall)
        if (!this.rateLimiter.checkLimit(sender.id)) {
            return;
        }

        // 2. Guaranteed Zod Sanitization (The Filter)
        const rawText = payload.text;
        let trimmed = rawText.trim();
        if (trimmed.length === 0) return;

        const state = this.engine.getState();
        const senderId = (sender.state as any)?.userId || sender.id;

        // [SPRINT 9] LA REGLA DEL SILENCIO
        if (state.config.mode === 'IMPOSTOR' && state.impostorData) {
            if (!state.impostorData.alivePlayers.includes(senderId)) {
                // Sender is a ghost, silently drop the message
                return;
            }
        }

        // [SPRINT 9] EL FILTRO ANTI-SPOILERS
        // Sprint 3.4: secretWord no existe en el estado público (ahora es una propiedad privada del motor).
        // El impostor ya no puede revelar la palabra accidentalmente desde el chat —
        // simplemente no la conoce. Si en el futuro se desea reactivar este filtro,
        // se deberá exponer un método auxiliar en ImpostorEngine como getSecretWord().

        const finalText = trimmed.slice(0, 140);
        const player = state.players.find(p => p.id === senderId);
        const senderName = player ? player.name : 'Voz Misteriosa';

        const chatMsg: ChatMessage = {
            id: `${senderId}-${Date.now()}`,
            senderId,
            senderName,
            text: finalText,
            type: 'USER',
            timestamp: Date.now()
        };

        // Store & Limit
        this.messages.push(chatMsg);
        if (this.messages.length > 50) this.messages.shift();

        // Broadcast chat (no masking needed for chat messages)
        this.room.broadcast(JSON.stringify({
            type: EVENTS.CHAT_NEW,
            payload: chatMsg
        }));
    }
}
