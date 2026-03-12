<script setup lang="ts">
import type { Player } from '../../../shared/types';

const props = defineProps<{
    players: Player[];
    spectators: Player[];
    maxPlayers: number;
    amIHost: boolean;
    myUserId: string;
}>();

const emit = defineEmits<{
    (e: 'kick-player', userId: string, name: string): void;
    (e: 'update-max-players', max: number): void;
}>();

const emptySlots = computed(() => Math.max(0, props.maxPlayers - props.players.length));
</script>

<script lang="ts">
import { computed } from 'vue';
</script>

<template>
    <div class="lg:col-span-3 bg-panel-base border-[3px] border-white/50 rounded-3xl shadow-game-panel flex flex-col overflow-hidden min-h-0">
        <!-- Header: Title + MaxPlayers -->
        <div class="p-4 border-b-2 border-white/50 bg-panel-card/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-none">
            <div class="flex items-center justify-between sm:justify-start gap-2">
                <h3 class="text-ink-main text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                    Jugadores {{ props.players.length }}/{{ props.maxPlayers }}
                </h3>
            </div>
            <div v-if="props.amIHost" class="relative">
                <select
                    :value="props.maxPlayers"
                    @change="emit('update-max-players', Number(($event.target as HTMLSelectElement).value))"
                    class="w-full sm:w-auto bg-panel-input border-2 border-panel-card text-ink-main text-xs font-black uppercase tracking-wider px-3 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner sm:shadow-none"
                >
                    <option v-for="n in 9" :key="n+1" :value="n+1" class="bg-panel-input">{{ n + 1 }} JUGADORES</option>
                </select>
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[10px]">▼</span>
            </div>
            <div v-else class="bg-panel-input border-2 border-panel-card text-ink-muted text-xs font-black uppercase tracking-wider px-3 py-2 rounded-xl shadow-inner text-center">
                {{ props.maxPlayers }} JUGADORES
            </div>
        </div>

        <!-- Player List + Spectators + Empty Slots -->
        <div class="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            <!-- Active Players -->
            <div v-for="player in props.players" :key="player.id"
                 class="flex items-center gap-3 p-3 bg-panel-card rounded-xl border-2 border-white/10 hover:border-action-primary transition-colors group shadow-sm"
            >
                <span class="text-2xl flex-none">{{ player.avatar || '👤' }}</span>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 truncate">
                        <span class="text-ink-main font-black text-sm truncate">{{ player.name }}</span>
                        <!-- FASE 3: Badge de Verificación de Identidad -->
                        <span v-if="player.isAuthenticated" title="Identidad Verificada (Supabase)" class="flex-none text-action-primary drop-shadow-sm cursor-help">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>
                        </span>
                        <span v-if="player.isHost" class="flex-none text-[8px]">👑</span>
                        <span v-if="player.id === props.myUserId" class="flex-none text-[8px] font-black text-white bg-action-blue px-1.5 py-0.5 rounded shadow-sm">TÚ</span>
                    </div>
                    <div class="text-[8px] font-bold uppercase tracking-wider" :class="player.isConnected ? 'text-action-primary' : 'text-action-error'">
                        {{ player.isConnected ? 'Conectado' : 'Reconectando...' }}
                    </div>
                </div>
                <button v-if="props.amIHost && !player.isHost" @click="emit('kick-player', player.id, player.name)"
                    class="hidden group-hover:flex flex-none w-7 h-7 items-center justify-center rounded-lg bg-action-error/20 text-action-error hover:bg-action-error hover:text-white transition-all text-[10px] font-bold"
                >✕</button>
            </div>

            <!-- Spectators -->
            <div v-for="spec in props.spectators" :key="spec.id"
                 class="flex items-center gap-3 p-3 bg-panel-modal rounded-xl border-2 border-dashed border-panel-card">
                <span class="text-xl opacity-40 flex-none">{{ spec.avatar || '👤' }}</span>
                <div class="flex-1 min-w-0">
                    <span class="text-ink-soft font-bold text-xs truncate block">{{ spec.name }}</span>
                    <span class="text-[8px] font-bold text-amber-500 uppercase">👁️ Espectador</span>
                </div>
            </div>

            <!-- Empty Slots -->
            <div v-for="i in emptySlots" :key="'empty-' + i"
                 class="flex items-center gap-3 p-3 rounded-xl border-[3px] border-dashed border-white/60 bg-white/30"
            >
                <span class="text-xl opacity-20 flex-none">👤</span>
                <span class="text-ink-muted font-bold text-xs uppercase tracking-wider">Vacío</span>
            </div>
        </div>
    </div>
</template>
