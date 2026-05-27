<script setup lang="ts">
import type { Player } from '../../../shared/types';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const props = defineProps<{
    players: Player[];
    spectators: Player[];
    maxPlayers: number;
    amIHost: boolean;
    myUserId: string;
    isPublic: boolean;
}>();

const emit = defineEmits<{
    (e: 'kick-player', userId: string, name: string): void;
    (e: 'update-max-players', max: number): void;
    (e: 'add-bot'): void;
    (e: 'toggle-privacy'): void;
}>();

const emptySlots = computed(() => Math.max(0, props.maxPlayers - props.players.length));
</script>


<template>
    <div class="lg:col-span-3 bg-panel-base border-2 border-white/10 rounded-2xl shadow-game-panel flex flex-col lg:overflow-hidden lg:min-h-0 lg:h-full">
        <!-- Header: Title + Capacity Selector + Privacy Toggle -->
        <div class="py-2 px-3 border-b-2 border-white/10 bg-panel-card/50 flex flex-col gap-2 flex-none">
            <div class="flex items-center justify-between">
                <h3 class="text-ink-main text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {{ t('lobby.players.players', { count: props.players.length, max: props.maxPlayers }, `JUGADORES ${props.players.length}/${props.maxPlayers}`) }}
                </h3>
            </div>
            
            <!-- Controls Sub-grid -->
            <div class="grid grid-cols-2 gap-2 mt-0.5">
                <!-- Max Players Dropdown -->
                <div v-if="props.amIHost" class="relative">
                    <select
                        :value="props.maxPlayers"
                        @change="emit('update-max-players', Number(($event.target as HTMLSelectElement).value))"
                        class="w-full bg-panel-input border-[2px] border-panel-card text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input/80 transition-colors focus:outline-none focus:border-action-primary shadow-inner h-9"
                    >
                        <option v-for="n in 9" :key="n+1" :value="n+1" class="bg-panel-input">{{ n + 1 }} Max</option>
                    </select>
                    <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[9px]">▼</span>
                </div>
                <div v-else class="bg-panel-input border-[2px] border-panel-card text-ink-muted text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl shadow-inner text-center leading-5 h-9 select-none">
                    {{ props.maxPlayers }} Max
                </div>

                <!-- Public/Private Toggle -->
                <button v-if="props.amIHost"
                    @click="emit('toggle-privacy')"
                    class="w-full border-[2px] flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-200 active:scale-95 cursor-pointer h-9 shadow-sm"
                    :class="props.isPublic 
                        ? 'bg-action-primary/20 border-action-primary text-action-primary shadow-[0_0_12px_rgba(245,158,11,0.25)]' 
                        : 'bg-panel-input border-panel-card text-ink-soft hover:text-ink-main hover:border-white/20'"
                >
                    <span>{{ props.isPublic ? '🌐' : '🔒' }}</span>
                    <span>{{ props.isPublic ? 'Pública' : 'Privada' }}</span>
                </button>
                <div v-else 
                    class="w-full border-[2px] border-panel-card bg-panel-input/50 text-ink-muted text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 rounded-xl h-9 select-none opacity-75"
                >
                    <span>{{ props.isPublic ? '🌐' : '🔒' }}</span>
                    <span>{{ props.isPublic ? 'Pública' : 'Privada' }}</span>
                </div>
            </div>
        </div>

        <!-- Player List + Spectators + Empty Slots -->
        <div class="lg:flex-1 lg:overflow-y-auto lg:min-h-0 p-3 space-y-2 lg:scrollbar-thin">
            <!-- Active Players -->
            <div v-for="player in props.players" :key="player.id"
                 class="flex items-center gap-2.5 p-2.5 bg-panel-card rounded-xl border border-white/10 hover:border-action-primary transition-colors group shadow-sm animate-in fade-in duration-200"
            >
                <div class="w-10 h-10 bg-panel-input border border-white/10 rounded-lg flex items-center justify-center text-xl flex-none shadow-inner">{{ player.avatar || '👤' }}</div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1 truncate">
                        <span class="text-ink-main font-black text-xs md:text-sm truncate">{{ player.name }}</span>
                        <!-- FASE 3: Badge de Verificación de Identidad -->
                        <span v-if="player.isAuthenticated" title="Identidad Verificada (Supabase)" class="flex-none text-action-primary drop-shadow-sm cursor-help">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>
                        </span>
                        <span v-if="player.isHost" class="flex-none text-[8px]">👑</span>
                        <span v-if="player.id === props.myUserId" class="flex-none text-[8px] font-black text-white bg-action-blue px-1.5 py-0.5 rounded shadow-sm">{{ t('lobby.players.you') }}</span>
                    </div>
                    <div class="text-[8px] md:text-[9px] font-bold uppercase tracking-wider leading-none mt-0.5" :class="player.isConnected ? 'text-action-primary' : 'text-action-error'">
                        {{ player.isConnected ? t('lobby.players.connected') : t('lobby.players.reconnecting') }}
                    </div>
                </div>
                <button v-if="props.amIHost && !player.isHost" @click="emit('kick-player', player.id, player.name)"
                    class="hidden group-hover:flex flex-none w-7 h-7 items-center justify-center rounded-lg bg-action-error/20 text-action-error hover:bg-action-error hover:text-white transition-all text-[10px] font-bold cursor-pointer"
                >✕</button>
            </div>

            <!-- Spectators -->
            <div v-for="spec in props.spectators" :key="spec.id"
                 class="flex items-center gap-2.5 p-2.5 bg-panel-input rounded-xl border border-panel-card shadow-inner opacity-75">
                <div class="w-8 h-8 bg-panel-base rounded-lg flex items-center justify-center text-lg opacity-50 flex-none">{{ spec.avatar || '👤' }}</div>
                <div class="flex-1 min-w-0">
                    <span class="text-ink-soft font-bold text-xs truncate block leading-none">{{ spec.name }}</span>
                    <span class="text-[8px] font-bold text-amber-500 uppercase block mt-1">👁️ {{ t('lobby.players.spectator') }}</span>
                </div>
            </div>

            <!-- Empty Slots -->
            <div v-for="i in emptySlots" :key="'empty-' + i"
                 class="flex items-center justify-between gap-2.5 p-2.5 rounded-xl border border-white/5 transition-all bg-panel-input shadow-inner"
                 :class="{ 'border-action-info shadow-glow-primary animate-pulse': props.players.length === 1 && i === 1 }"
            >
                <div class="flex items-center gap-2.5 min-w-0">
                    <template v-if="props.players.length === 1 && i === 1">
                        <div class="w-8 h-8 rounded-lg bg-panel-base flex items-center justify-center text-lg opacity-80 flex-none shadow-inner">🔗</div>
                        <span class="text-action-blue font-black text-[10px] sm:text-xs uppercase tracking-wider truncate text-left leading-none">{{ t('lobby.players.inviteShort', '¡Invita a tus amigos!') }}</span>
                    </template>
                    <template v-else>
                        <div class="w-8 h-8 rounded-lg bg-panel-base flex items-center justify-center text-lg opacity-30 flex-none shadow-inner">👤</div>
                        <span class="text-ink-muted font-bold text-xs uppercase tracking-wider truncate">{{ t('lobby.players.empty') }}</span>
                    </template>
                </div>

                <!-- Añadir Bot (Solo Host) -->
                <button
                    v-if="props.amIHost"
                    @click="emit('add-bot')"
                    class="flex items-center gap-1 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-action-primary/10 text-action-primary hover:bg-action-primary hover:text-panel-base border border-action-primary/20 hover:border-action-primary hover:shadow-glow-primary rounded-lg cursor-pointer transition-all duration-300 flex-none h-7"
                >
                    <span>+ 🤖 Bot</span>
                </button>
            </div>
        </div>
    </div>
</template>
