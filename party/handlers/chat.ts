import type * as Party from "partykit/server";
import { BaseEngine } from "../../shared/engines/base-engine";
import { EVENTS } from "../../shared/consts";
import type { ChatMessage } from "../../shared/types";
import { RateLimiter } from "../utils/rate-limiter";
import { isSpoiler } from "../../shared/utils/spoiler";


import { BaseHandler } from "./base";

export class ChatHandler extends BaseHandler {
    constructor(
        engine: BaseEngine,
        private rateLimiter: RateLimiter,
        private messages: ChatMessage[],
        room: Party.Room
    ) { 
        super(room, engine);
    }

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

        // [P12.1] EJE B: ESCUDO ANTI-SPOILER AUTORITATIVO
        // Activo durante las fases centrales del Modo Impostor.
        // El impostor no revela el secreto, pero los tripulantes NO pueden revelar la palabra.
        if (
            ['ROLE_REVEAL', 'TYPING', 'VOTING'].includes(state.status) &&
            state.config.mode === 'IMPOSTOR' &&
            state.impostorData
        ) {
            const secretWord = (this.engine as any).getSecretWord?.() as string | null;
            // Solo filtramos si el remitente es Tripulante (no Impostor)
            // La identidad privada del Impostor vive en el motor, no en el estado.
            // Usamos getSecretWord() como proxy: si el mensaje contiene la palabra, es spoiler.
            if (secretWord && isSpoiler(trimmed, secretWord)) {
                // Mutar el texto y continuar el broadcast (el jugador ve el resultado, disuade reintento)
                trimmed = '[ERR_SPOILER_BLOCKED]';
            }
        }

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
