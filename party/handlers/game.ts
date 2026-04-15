import type * as Party from "partykit/server";
import { BaseHandler } from "./base";
import { sendError } from "../utils/broadcaster";
import { ImpostorEngine } from "../../shared/engines/impostor-engine";

import { EVENTS } from "../../shared/consts";

export class GameHandler extends BaseHandler {

    async handleStartGame(sender: Party.Connection) {
        try {
            // [Sprint H1 — SEC-2] Defense-in-depth: verify host at handler layer
            if (!this.isHost(sender)) {
                sendError(sender, 'Solo el anfitrión puede iniciar la partida.');
                return;
            }
            await this.engine.startGame(sender.id);
        } catch (err) {
            console.error(`[GameHandler] Fatal error during game bootstrap:`, err);

            // Sprint 2.1 - Network Shield: Gracefully fallback to LOBBY
            const state = this.engine.getState();
            state.status = 'LOBBY';
            state.uiMetadata = { activeView: 'LOBBY', showTimer: false, targetTime: null };

            sendError(sender, "Error de red al inicializar la partida. Intente nuevamente.");
        }
    }

    async handleStopRound(payload: { answers: Record<string, string> }, sender: Party.Connection) {
        try {
            this.engine.stopRound(sender.id, payload.answers);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }

    // [SILENT UPDATE] Optimized for bandwidth (O(n) instead of O(n^2))
    async handleUpdateAnswers(payload: { answers: Record<string, string> }, sender: Party.Connection) {
        try {
            const userId = this.engine.players.getPlayerId(sender.id);
            if (!userId) return;

            this.engine.updateAnswers(sender.id, payload.answers);

            const filledCount = Object.values(payload.answers).filter((val: any) => val && val.trim().length > 0).length;

            // Fix: Persist filledCount in canonical state so that:
            // 1. broadcastStateDelta()'s compare() detects the change in previousStates
            // 2. startRound()'s reset to 0 generates a proper patch delta
            const state = this.engine.getState();
            const player = state.players.find((p: any) => p.id === userId);
            if (player) {
                player.filledCount = filledCount;
            }

            // Also send lightweight RIVAL_UPDATE for instant UI feedback (no full delta needed)
            const msg = JSON.stringify({
                type: EVENTS.RIVAL_UPDATE,
                payload: {
                    playerId: userId,
                    filledCount
                }
            });
            this.room.broadcast(msg, [sender.id]);

        } catch (err) {
            console.warn(`[SilentUpdate] Failed for ${sender.id}`, err);
        }
    }

    async handleSubmitAnswers(payload: { answers: Record<string, string> }, sender: Party.Connection) {
        try {
            this.engine.submitAnswers(sender.id, payload.answers);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }

    async handleRestartGame(sender: Party.Connection) {
        try {
            // [Sprint H1 — SEC-2] Defense-in-depth: verify host at handler layer
            if (!this.isHost(sender)) {
                sendError(sender, 'Solo el anfitrión puede reiniciar la partida.');
                return;
            }
            await this.engine.restartGame(sender.id);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }

    async handleWordReact(
        payload: { targetPlayerId: string; categoryId: string; emoji: string },
        sender: Party.Connection,
        room: Party.Room
    ) {
        // Validate sender identity
        const trustedSenderId = this.engine.players.getPlayerId(sender.id);
        if (!trustedSenderId) return;

        // Relay the reaction to ALL clients instantly — no state mutation
        room.broadcast(JSON.stringify({
            type: EVENTS.WORD_REACT,
            payload: {
                targetPlayerId: payload.targetPlayerId,
                categoryId: payload.categoryId,
                emoji: payload.emoji,
                senderId: trustedSenderId
            }
        }));
    }

    // [P10] Stateless relay: broadcast el texto del Impostor en tiempo real sin guardar en estado
    async handleLastWishTyping(
        payload: { text: string },
        sender: Party.Connection,
        room: Party.Room
    ) {
        const trustedSenderId = this.engine.players.getPlayerId(sender.id);
        if (!trustedSenderId) return;
        room.broadcast(JSON.stringify({
            type: EVENTS.LAST_WISH_TYPING,
            payload: { text: payload.text }
        }));
    }

    // [P10] One-Shot: el Impostor intenta adivinar la categoría. Si falla → CREW gana inmediatamente.
    async handleSubmitLastWish(
        payload: { guess: string },
        sender: Party.Connection
    ) {
        // [Sprint H1 — BE-5] Guard: Impostor-only method — reject silently in Classic mode
        if (!(this.engine instanceof ImpostorEngine)) return;
        this.engine.submitLastWish(sender.id, payload.guess ?? '');
    }

    // [P12] EJE A: Live Draft — debounce autoguardado
    async handleUpdateImpostorDraft(payload: { word: string }, sender: Party.Connection) {
        // [Sprint H1 — BE-5] Guard: Impostor-only method — reject silently in Classic mode
        if (!(this.engine instanceof ImpostorEngine)) return;
        try {
            this.engine.updateDraft(sender.id, payload.word ?? '');
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }

    // [P12] EJE A: Confirmación — el jugador declara "estoy listo"
    async handleConfirmImpostorWord(sender: Party.Connection) {
        // [Sprint H1 — BE-5] Guard: Impostor-only method — reject silently in Classic mode
        if (!(this.engine instanceof ImpostorEngine)) return;
        try {
            this.engine.confirmWord(sender.id);
        } catch (err) {
            sendError(sender, (err as Error).message);
        }
    }
}
