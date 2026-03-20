<script setup lang="ts">
import type { GameConfig } from '../../../shared/types';

const props = defineProps<{
    config: GameConfig;
    amIHost: boolean;
}>();

const emit = defineEmits<{
    (e: 'update-config', field: string, value: any): void;
    (e: 'update-mutator', mutator: string, value: boolean): void;
}>();

// ── Classic Steppers ──────────────────────────────────────────────────────────
const timeLimitOptions = [30, 45, 60, 90, 120, 180];
const votingOptions = [10, 15, 20, 30, 45, 60, 90, 120];

function incrementRounds() {
    const val = props.config.classic?.rounds || 5;
    if (val < 20) emit('update-config', 'classic.rounds', val + 1);
}
function decrementRounds() {
    const val = props.config.classic?.rounds || 5;
    if (val > 1) emit('update-config', 'classic.rounds', val - 1);
}
function incrementTimeLimit() {
    const current = props.config.classic?.timeLimit || 60;
    const idx = timeLimitOptions.indexOf(current);
    if (idx < timeLimitOptions.length - 1) emit('update-config', 'classic.timeLimit', timeLimitOptions[idx + 1]);
}
function decrementTimeLimit() {
    const current = props.config.classic?.timeLimit || 60;
    const idx = timeLimitOptions.indexOf(current);
    if (idx > 0) emit('update-config', 'classic.timeLimit', timeLimitOptions[idx - 1]);
}
function incrementVotingDuration() {
    const current = props.config.classic?.votingDuration || 30;
    const idx = votingOptions.indexOf(current);
    if (idx < votingOptions.length - 1) emit('update-config', 'classic.votingDuration', votingOptions[idx + 1]);
}
function decrementVotingDuration() {
    const current = props.config.classic?.votingDuration || 30;
    const idx = votingOptions.indexOf(current);
    if (idx > 0) emit('update-config', 'classic.votingDuration', votingOptions[idx - 1]);
}
function incrementCategoryCount() {
    const val = props.config.classic?.categoryCount ?? 5;
    if (val < 10) emit('update-config', 'classic.categoryCount', val + 1);
}
function decrementCategoryCount() {
    const val = props.config.classic?.categoryCount ?? 5;
    if (val > 1) emit('update-config', 'classic.categoryCount', val - 1);
}

// ── Impostor Steppers ─────────────────────────────────────────────────────────
function incrementImpostorRounds() {
    const val = props.config.impostor?.rounds || 3;
    if (val < 10) emit('update-config', 'impostor.rounds', val + 1);
}
function decrementImpostorRounds() {
    const val = props.config.impostor?.rounds || 3;
    if (val > 1) emit('update-config', 'impostor.rounds', val - 1);
}
function incrementImpostorTypingTime() {
    const val = props.config.impostor?.typingTime || 30;
    if (val < 60) emit('update-config', 'impostor.typingTime', val + 5);
}
function decrementImpostorTypingTime() {
    const val = props.config.impostor?.typingTime || 30;
    if (val > 10) emit('update-config', 'impostor.typingTime', val - 5);
}
function incrementImpostorVotingTime() {
    const val = props.config.impostor?.votingTime || 40;
    if (val < 120) emit('update-config', 'impostor.votingTime', val + 5);
}
function decrementImpostorVotingTime() {
    const val = props.config.impostor?.votingTime || 40;
    if (val > 15) emit('update-config', 'impostor.votingTime', val - 5);
}
function incrementImpostorCategoryCount() {
    const val = props.config.impostor?.categoryCount || 3;
    if (val < 8) emit('update-config', 'impostor.categoryCount', val + 1);
}
function decrementImpostorCategoryCount() {
    const val = props.config.impostor?.categoryCount || 3;
    if (val > 1) emit('update-config', 'impostor.categoryCount', val - 1);
}
</script>

<template>
    <div class="lg:col-span-4 bg-panel-base border-[3px] border-white/50 rounded-3xl shadow-game-panel flex flex-col overflow-hidden min-h-0"
         :class="{ 'opacity-60 pointer-events-none': !props.amIHost }"
    >
        <div class="p-3 md:p-4 border-b-2 border-white/50 bg-panel-card/50 flex items-center justify-between flex-none gap-2">
            <h3 class="text-ink-main text-xs font-black uppercase tracking-widest">Ajustes</h3>
            <span v-if="!props.amIHost" class="text-action-warning text-[8px] font-black uppercase tracking-wider bg-action-warning/20 px-2 py-0.5 rounded-full border border-action-warning/50">Solo lectura</span>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin min-h-0">

            <!-- ===== CLASSIC MODE SETTINGS ===== -->
            <template v-if="props.config.mode === 'CLASSIC'">

                <!-- Category Count (only when no manual categories selected) -->
                <div v-if="!(props.config.classic?.categories?.length > 0)" class="bg-panel-input rounded-xl border-2 border-panel-card shadow-inner p-2.5">
                    <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2">🎲 Categorías Aleatorias</label>
                    <div class="flex items-center justify-between">
                        <button @click="decrementCategoryCount" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-panel-input border-2 border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">-</button>
                        <span class="text-3xl md:text-4xl font-black text-ink-main">{{ props.config.classic?.categoryCount ?? 5 }}</span>
                        <button @click="incrementCategoryCount" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-panel-input border-2 border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">+</button>
                    </div>
                    <p class="text-ink-muted text-[8px] font-bold mt-2 text-center">Se elegirán al azar al iniciar</p>
                </div>

                <!-- Rounds -->
                <div class="bg-panel-input rounded-xl border-2 border-panel-card shadow-inner p-2.5">
                    <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2">🔁 Rondas</label>
                    <div class="flex items-center justify-between">
                        <button @click="decrementRounds" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-panel-input border-2 border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">-</button>
                        <span class="text-3xl md:text-4xl font-black text-ink-main">{{ props.config.classic?.rounds || 5 }}</span>
                        <button @click="incrementRounds" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-panel-input border-2 border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">+</button>
                    </div>
                </div>

                <!-- Time Limit -->
                <div class="bg-panel-input rounded-xl border-2 border-panel-card shadow-inner p-2.5">
                    <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2">⏱️ Tiempo de Escritura</label>
                    <div class="flex items-center justify-between">
                        <button @click="decrementTimeLimit" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-panel-input border-2 border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">-</button>
                        <div class="text-center">
                            <span class="text-3xl md:text-4xl font-black text-ink-main">{{ props.config.classic?.timeLimit || 60 }}</span>
                            <span class="text-ink-muted text-[10px] font-bold block -mt-1 uppercase">seg</span>
                        </div>
                        <button @click="incrementTimeLimit" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-panel-input border-2 border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">+</button>
                    </div>
                </div>

                <!-- Voting Duration -->
                <div class="bg-panel-input rounded-xl border-2 border-panel-card shadow-inner p-2.5">
                    <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2">🗳️ Tiempo de Votación</label>
                    <div class="flex items-center justify-between">
                        <button @click="decrementVotingDuration" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-panel-input border-2 border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">-</button>
                        <div class="text-center">
                            <span class="text-3xl md:text-4xl font-black text-ink-main">{{ props.config.classic?.votingDuration || 30 }}</span>
                            <span class="text-ink-muted text-[10px] font-bold block -mt-1 uppercase">seg</span>
                        </div>
                        <button @click="incrementVotingDuration" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-panel-input border-2 border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">+</button>
                    </div>
                </div>

                <hr class="border-t-[3px] border-white/10 rounded-full mt-4 mb-2" />

                <!-- MUTATORS -->
                <div>
                    <p class="text-ink-main text-[9px] font-black uppercase tracking-widest mb-3">⚡ Mutadores</p>

                    <!-- Suicidal Stop -->
                    <div class="bg-panel-input rounded-xl border-2 border-panel-card shadow-inner p-3 mb-3">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2.5">
                                <span class="text-xl">💀</span>
                                <span class="text-ink-main font-black text-sm">Stop Suicida</span>
                            </div>
                            <button
                                @click="emit('update-mutator', 'suicidalStop', !props.config.classic?.mutators?.suicidalStop)"
                                class="relative w-[3.25rem] h-8 rounded-full transition-all duration-300 border-[3px] flex-none"
                                :class="props.config.classic?.mutators?.suicidalStop ? 'bg-action-error border-action-error' : 'bg-panel-input border-panel-card shadow-inner'"
                            >
                                <span class="absolute top-0.5 w-5 h-5 rounded-full shadow-sm transition-all duration-300"
                                      :class="props.config.classic?.mutators?.suicidalStop ? 'bg-white left-[calc(100%-1.4rem)]' : 'bg-panel-card left-1'"></span>
                            </button>
                        </div>
                        <p class="text-ink-muted text-[10px] font-bold mt-2 ml-9">Si presionas STOP y te rechazan una palabra, pierdes todos tus puntos.</p>
                    </div>

                    <!-- Anonymous Voting -->
                    <div class="bg-panel-input rounded-xl border-2 border-panel-card shadow-inner p-3">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2.5">
                                <span class="text-xl">🎭</span>
                                <span class="text-ink-main font-black text-sm">Voto Anónimo</span>
                            </div>
                            <button
                                @click="emit('update-mutator', 'anonymousVoting', !props.config.classic?.mutators?.anonymousVoting)"
                                class="relative w-[3.25rem] h-8 rounded-full transition-all duration-300 border-[3px] flex-none"
                                :class="props.config.classic?.mutators?.anonymousVoting ? 'bg-action-blue border-action-blue' : 'bg-panel-input border-panel-card shadow-inner'"
                            >
                                <span class="absolute top-0.5 w-5 h-5 rounded-full shadow-sm transition-all duration-300"
                                      :class="props.config.classic?.mutators?.anonymousVoting ? 'bg-white left-[calc(100%-1.4rem)]' : 'bg-panel-card left-1'"></span>
                            </button>
                        </div>
                        <p class="text-ink-muted text-[10px] font-bold mt-2 ml-9">Las palabras se evalúan sin saber quién las escribió.</p>
                    </div>
                </div>
            </template>

            <!-- ===== IMPOSTOR MODE SETTINGS ===== -->
            <template v-else-if="props.config.mode === 'IMPOSTOR'">

                <!-- Category Count -->
                <div class="bg-panel-input rounded-xl border-2 border-panel-card shadow-inner p-2.5">
                    <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2">📦 Categorías en Juego</label>
                    <div class="flex items-center justify-between">
                        <button @click="decrementImpostorCategoryCount" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-panel-input border-2 border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">-</button>
                        <span class="text-3xl md:text-4xl font-black text-ink-main">{{ props.config.impostor?.categoryCount ?? 3 }}</span>
                        <button @click="incrementImpostorCategoryCount" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-panel-input border-2 border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">+</button>
                    </div>
                    <p class="text-ink-muted text-[8px] font-bold mt-2 text-center">Se seleccionarán al azar de nuestro catálogo secreto</p>
                </div>

                <!-- Rounds -->
                <div class="bg-panel-input rounded-xl border-2 border-panel-card shadow-inner p-2.5">
                    <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2">🔁 Rondas</label>
                    <div class="flex items-center justify-between">
                        <button @click="decrementImpostorRounds" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-panel-input border-2 border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">-</button>
                        <span class="text-3xl md:text-4xl font-black text-ink-main">{{ props.config.impostor?.rounds || 3 }}</span>
                        <button @click="incrementImpostorRounds" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-panel-input border-2 border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">+</button>
                    </div>
                </div>

                <!-- Typing Time -->
                <div class="bg-panel-input rounded-xl border-2 border-panel-card shadow-inner p-2.5">
                    <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2">⏱️ Tiempo de Escritura</label>
                    <div class="flex items-center justify-between">
                        <button @click="decrementImpostorTypingTime" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-panel-input border-2 border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">-</button>
                        <div class="text-center">
                            <span class="text-3xl md:text-4xl font-black text-ink-main">{{ props.config.impostor?.typingTime || 30 }}</span>
                            <span class="text-ink-muted text-[10px] font-bold block -mt-1 uppercase">seg</span>
                        </div>
                        <button @click="incrementImpostorTypingTime" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-panel-input border-2 border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">+</button>
                    </div>
                </div>

                <!-- Voting Time -->
                <div class="bg-panel-input rounded-xl border-2 border-panel-card shadow-inner p-2.5">
                    <label class="text-ink-main text-[8px] font-black uppercase tracking-widest block mb-2">🗳️ Tiempo del Tribunal</label>
                    <div class="flex items-center justify-between">
                        <button @click="decrementImpostorVotingTime" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-panel-input border-2 border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">-</button>
                        <div class="text-center">
                            <span class="text-3xl md:text-4xl font-black text-ink-main">{{ props.config.impostor?.votingTime || 40 }}</span>
                            <span class="text-ink-muted text-[10px] font-bold block -mt-1 uppercase">seg</span>
                        </div>
                        <button @click="incrementImpostorVotingTime" class="w-11 h-11 rounded-xl bg-panel-card cursor-pointer hover:bg-panel-input border-2 border-white/10 text-ink-main flex items-center justify-center font-black shadow-sm active:scale-95 transition-all text-xl">+</button>
                    </div>
                </div>

            </template>
        </div>
    </div>
</template>
