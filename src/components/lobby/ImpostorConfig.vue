<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { GameConfig } from '../../../shared/types';

const { locale } = useI18n();

const props = defineProps<{
    config: GameConfig;
    amIHost: boolean;
    impostorTypingOptions: number[];
    impostorVotingOptions: number[];
}>();

const emit = defineEmits<{
    (e: 'update-config', field: string, value: any): void;
}>();

function handleNumericInput(field: string, rawValue: string, min: number, max: number, options?: number[]) {
    let val = parseInt(rawValue, 10);
    if (isNaN(val)) return;
    if (options && options.length > 0) {
        val = options.reduce((prev, curr) =>
            Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev
        );
    }
    val = Math.max(min, Math.min(max, val));
    emit('update-config', field, val);
}
</script>

<template>
    <div class="flex flex-col gap-2 bg-panel-card/15 p-2 rounded-2xl border border-white/5">

        <!-- Category Count stepper -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 bg-panel-input/35 border border-white/10 rounded-xl hover:border-white/20 transition-all">
            <div class="flex items-start gap-3 min-w-0">
                <span class="text-xl flex-none leading-none mt-0.5">📦</span>
                <div class="flex flex-col min-w-0">
                    <span class="text-ink-main font-heading font-black text-xs uppercase tracking-wide leading-none">Categorías por Ronda</span>
                    <span class="text-ink-muted text-[9px] font-bold mt-1 leading-normal max-w-sm">
                        {{ locale === 'en' ? 'Number of secret categories' : locale === 'pt' ? 'Número de temas secretos' : 'Número de temas secretos por ronda' }}
                    </span>
                </div>
            </div>
            <div class="relative w-36 sm:w-40 flex-none">
                <select
                    :disabled="!props.amIHost"
                    :value="props.config.impostor?.categoryCount ?? 3"
                    @change="handleNumericInput('impostor.categoryCount', ($event.target as HTMLSelectElement).value, 1, 8)"
                    class="w-full bg-panel-card border-[2px] border-white/10 text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner h-11 select-none"
                >
                    <option v-for="n in 8" :key="n" :value="n" class="bg-panel-card">{{ n }} {{ n === 1 ? 'Categoría' : 'Categorías' }}</option>
                </select>
                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[9px]">▼</span>
            </div>
        </div>

        <!-- Rounds stepper -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 bg-panel-input/35 border border-white/10 rounded-xl hover:border-white/20 transition-all">
            <div class="flex items-start gap-3 min-w-0">
                <span class="text-xl flex-none leading-none mt-0.5">🔁</span>
                <div class="flex flex-col min-w-0">
                    <span class="text-ink-main font-heading font-black text-xs uppercase tracking-wide leading-none">Rondas</span>
                    <span class="text-ink-muted text-[9px] font-bold mt-1 leading-normal max-w-sm">
                        {{ locale === 'en' ? 'Number of impostor rounds' : locale === 'pt' ? 'Número de rodadas de impostor' : 'Número de rondas de la partida' }}
                    </span>
                </div>
            </div>
            <div class="relative w-36 sm:w-40 flex-none">
                <select
                    :disabled="!props.amIHost"
                    :value="props.config.impostor?.rounds || 3"
                    @change="handleNumericInput('impostor.rounds', ($event.target as HTMLSelectElement).value, 1, 10)"
                    class="w-full bg-panel-card border-[2px] border-white/10 text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner h-11 select-none"
                >
                    <option v-for="n in 10" :key="n" :value="n" class="bg-panel-card">{{ n }} {{ n === 1 ? 'Ronda' : 'Rondas' }}</option>
                </select>
                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[9px]">▼</span>
            </div>
        </div>

        <!-- Typing time stepper -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 bg-panel-input/35 border border-white/10 rounded-xl hover:border-white/20 transition-all">
            <div class="flex items-start gap-3 min-w-0">
                <span class="text-xl flex-none leading-none mt-0.5">⏱️</span>
                <div class="flex flex-col min-w-0">
                    <span class="text-ink-main font-heading font-black text-xs uppercase tracking-wide leading-none">Tiempo de Escritura</span>
                    <span class="text-ink-muted text-[9px] font-bold mt-1 leading-normal max-w-sm">
                        {{ locale === 'en' ? 'Time limit to write your word' : locale === 'pt' ? 'Tempo para escrever sua palavra' : 'Tiempo para escribir tu palabra' }}
                    </span>
                </div>
            </div>
            <div class="relative w-36 sm:w-40 flex-none">
                <select
                    :disabled="!props.amIHost"
                    :value="props.config.impostor?.typingTime || 30"
                    @change="handleNumericInput('impostor.typingTime', ($event.target as HTMLSelectElement).value, 10, 60, impostorTypingOptions)"
                    class="w-full bg-panel-card border-[2px] border-white/10 text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner h-11 select-none"
                >
                    <option v-for="opt in impostorTypingOptions" :key="opt" :value="opt" class="bg-panel-card">{{ opt }} Segundos</option>
                </select>
                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[9px]">▼</span>
            </div>
        </div>

        <!-- Voting time stepper -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 bg-panel-input/35 border border-white/10 rounded-xl hover:border-white/20 transition-all">
            <div class="flex items-start gap-3 min-w-0">
                <span class="text-xl flex-none leading-none mt-0.5">🗳️</span>
                <div class="flex flex-col min-w-0">
                    <span class="text-ink-main font-heading font-black text-xs uppercase tracking-wide leading-none">Tiempo de Tribunal</span>
                    <span class="text-ink-muted text-[9px] font-bold mt-1 leading-normal max-w-sm">
                        {{ locale === 'en' ? 'Time limit for discussion and voting' : locale === 'pt' ? 'Tempo para debate e votação' : 'Tiempo para debate y votación en el tribunal' }}
                    </span>
                </div>
            </div>
            <div class="relative w-36 sm:w-40 flex-none">
                <select
                    :disabled="!props.amIHost"
                    :value="props.config.impostor?.votingTime || 40"
                    @change="handleNumericInput('impostor.votingTime', ($event.target as HTMLSelectElement).value, 15, 120, impostorVotingOptions)"
                    class="w-full bg-panel-card border-[2px] border-white/10 text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner h-11 select-none"
                >
                    <option v-for="opt in impostorVotingOptions" :key="opt" :value="opt" class="bg-panel-card">{{ opt }} Segundos</option>
                </select>
                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[9px]">▼</span>
            </div>
        </div>
    </div>
</template>
