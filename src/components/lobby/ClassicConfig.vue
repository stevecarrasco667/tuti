<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { GameConfig } from '../../../shared/types';
import { useProfile, STORE_ITEMS } from '../../composables/useProfile';

const { t, locale } = useI18n();
const { unlockedFrames } = useProfile();

const props = defineProps<{
    config: GameConfig;
    amIHost: boolean;
    timeLimitOptions: number[];
    votingOptions: number[];
}>();

const emit = defineEmits<{
    (e: 'update-config', field: string, value: any): void;
    (e: 'update-mutator', mutator: string, value: boolean): void;
}>();

const unlockedPacks = computed(() => {
    return STORE_ITEMS.value.filter(item => item.type === 'EXPANSION' && unlockedFrames.value.includes(item.id));
});

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

        <!-- Category Pack selection -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 bg-panel-input/35 border border-white/10 rounded-xl hover:border-white/20 transition-all">
            <div class="flex items-start gap-3 min-w-0">
                <span class="text-xl flex-none leading-none mt-0.5">📦</span>
                <div class="flex flex-col min-w-0">
                    <span class="text-ink-main font-heading font-black text-xs uppercase tracking-wide leading-none">Paquete de Categorías</span>
                    <span class="text-ink-muted text-[9px] font-bold mt-1 leading-normal max-w-sm">
                        {{ locale === 'en' ? 'Play with premium category expansion packs' : locale === 'pt' ? 'Jogue com pacotes de categorias premium' : 'Jugar con paquetes de categorías premium adquiridos' }}
                    </span>
                </div>
            </div>
            <div class="relative w-36 sm:w-40 flex-none">
                <select
                    :disabled="!props.amIHost"
                    :value="props.config.activePackId || ''"
                    @change="emit('update-config', 'activePackId', ($event.target as HTMLSelectElement).value || null)"
                    class="w-full bg-panel-card border-[2px] border-white/10 text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner h-11 select-none"
                >
                    <option value="" class="bg-panel-card">Ninguno (Gratis)</option>
                    <option v-for="pack in unlockedPacks" :key="pack.id" :value="pack.id" class="bg-panel-card">
                        {{ t(pack.name) || pack.name }}
                    </option>
                </select>
                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[9px]">▼</span>
            </div>
        </div>

        <!-- Category Count (only when no manual categories selected) -->
        <div v-if="!(props.config.classic?.categories?.length > 0)" class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 bg-panel-input/35 border border-white/10 rounded-xl hover:border-white/20 transition-all">
            <div class="flex items-start gap-3 min-w-0">
                <span class="text-xl flex-none leading-none mt-0.5">🎲</span>
                <div class="flex flex-col min-w-0">
                    <span class="text-ink-main font-heading font-black text-xs uppercase tracking-wide leading-none">Categorías Aleatorias</span>
                    <span class="text-ink-muted text-[9px] font-bold mt-1 leading-normal max-w-sm">
                        {{ locale === 'en' ? 'Amount of random categories' : locale === 'pt' ? 'Quantidade de categorias aleatórias' : 'Cantidad de categorías que se elegirán al azar' }}
                    </span>
                </div>
            </div>
            <div class="relative w-36 sm:w-40 flex-none">
                <select
                    :disabled="!props.amIHost"
                    :value="props.config.classic?.categoryCount ?? 4"
                    @change="handleNumericInput('classic.categoryCount', ($event.target as HTMLSelectElement).value, 1, 10)"
                    class="w-full bg-panel-card border-[2px] border-white/10 text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner h-11 select-none"
                >
                    <option v-for="n in 10" :key="n" :value="n" class="bg-panel-card">{{ n }} {{ n === 1 ? 'Categoría' : 'Categorías' }}</option>
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
                        {{ locale === 'en' ? 'Number of game rounds' : locale === 'pt' ? 'Número de rodadas do jogo' : 'Número de rondas de la partida' }}
                    </span>
                </div>
            </div>
            <div class="relative w-36 sm:w-40 flex-none">
                <select
                    :disabled="!props.amIHost"
                    :value="props.config.classic?.rounds || 3"
                    @change="handleNumericInput('classic.rounds', ($event.target as HTMLSelectElement).value, 1, 20)"
                    class="w-full bg-panel-card border-[2px] border-white/10 text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner h-11 select-none"
                >
                    <option v-for="n in 10" :key="n" :value="n" class="bg-panel-card">{{ n }} {{ n === 1 ? 'Ronda' : 'Rondas' }}</option>
                    <option :value="12" class="bg-panel-card">12 Rondas</option>
                    <option :value="15" class="bg-panel-card">15 Rondas</option>
                    <option :value="20" class="bg-panel-card">20 Rondas</option>
                </select>
                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[9px]">▼</span>
            </div>
        </div>

        <!-- Time limit stepper -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 bg-panel-input/35 border border-white/10 rounded-xl hover:border-white/20 transition-all">
            <div class="flex items-start gap-3 min-w-0">
                <span class="text-xl flex-none leading-none mt-0.5">⏱️</span>
                <div class="flex flex-col min-w-0">
                    <span class="text-ink-main font-heading font-black text-xs uppercase tracking-wide leading-none">Tiempo por Ronda</span>
                    <span class="text-ink-muted text-[9px] font-bold mt-1 leading-normal max-w-sm">
                        {{ locale === 'en' ? 'Time limit to write words per round' : locale === 'pt' ? 'Tempo para escrever palavras por rodada' : 'Tiempo para escribir palabras en cada ronda' }}
                    </span>
                </div>
            </div>
            <div class="relative w-36 sm:w-40 flex-none">
                <select
                    :disabled="!props.amIHost"
                    :value="props.config.classic?.timeLimit || 60"
                    @change="handleNumericInput('classic.timeLimit', ($event.target as HTMLSelectElement).value, 30, 180, timeLimitOptions)"
                    class="w-full bg-panel-card border-[2px] border-white/10 text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner h-11 select-none"
                >
                    <option v-for="opt in timeLimitOptions" :key="opt" :value="opt" class="bg-panel-card">{{ opt }} Segundos</option>
                </select>
                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[9px]">▼</span>
            </div>
        </div>

        <!-- Voting duration stepper -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 bg-panel-input/35 border border-white/10 rounded-xl hover:border-white/20 transition-all">
            <div class="flex items-start gap-3 min-w-0">
                <span class="text-xl flex-none leading-none mt-0.5">🗳️</span>
                <div class="flex flex-col min-w-0">
                    <span class="text-ink-main font-heading font-black text-xs uppercase tracking-wide leading-none">Tiempo de Votación</span>
                    <span class="text-ink-muted text-[9px] font-bold mt-1 leading-normal max-w-sm">
                        {{ locale === 'en' ? 'Time to vote and validate answers' : locale === 'pt' ? 'Tempo para votar e qualificar respostas' : 'Tiempo para calificar y votar las respuestas' }}
                    </span>
                </div>
            </div>
            <div class="relative w-36 sm:w-40 flex-none">
                <select
                    :disabled="!props.amIHost"
                    :value="props.config.classic?.votingDuration || 20"
                    @change="handleNumericInput('classic.votingDuration', ($event.target as HTMLSelectElement).value, 10, 120, votingOptions)"
                    class="w-full bg-panel-card border-[2px] border-white/10 text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner h-11 select-none"
                >
                    <option v-for="opt in votingOptions" :key="opt" :value="opt" class="bg-panel-card">{{ opt }} Segundos</option>
                </select>
                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[9px]">▼</span>
            </div>
        </div>

        <!-- Suicidal Stop -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 bg-panel-input/35 border border-white/10 rounded-xl hover:border-white/20 transition-all">
            <div class="flex items-start gap-3 min-w-0">
                <span class="text-xl flex-none leading-none mt-0.5">💀</span>
                <div class="flex flex-col min-w-0">
                    <span class="text-ink-main font-heading font-black text-xs uppercase tracking-wide leading-none">Stop Suicida</span>
                    <span class="text-ink-muted text-[9px] font-bold mt-1 leading-normal max-w-sm">Quien diga BASTA pierde puntos si la ronda era mala</span>
                </div>
            </div>
            <div class="relative w-36 sm:w-40 flex-none">
                <select
                    :disabled="!props.amIHost"
                    :value="props.config.classic?.mutators?.suicidalStop ? 'true' : 'false'"
                    @change="emit('update-mutator', 'suicidalStop', ($event.target as HTMLSelectElement).value === 'true')"
                    class="w-full bg-panel-card border-[2px] border-white/10 text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner h-11 select-none"
                >
                    <option value="false" class="bg-panel-card">DESACTIVADO</option>
                    <option value="true" class="bg-panel-card text-action-error font-black">ACTIVADO 💀</option>
                </select>
                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[9px]">▼</span>
            </div>
        </div>

        <!-- Anonymous Voting -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 bg-panel-input/35 border border-white/10 rounded-xl hover:border-white/20 transition-all">
            <div class="flex items-start gap-3 min-w-0">
                <span class="text-xl flex-none leading-none mt-0.5">🎭</span>
                <div class="flex flex-col min-w-0">
                    <span class="text-ink-main font-heading font-black text-xs uppercase tracking-wide leading-none">Votación Anónima</span>
                    <span class="text-ink-muted text-[9px] font-bold mt-1 leading-normal max-w-sm">Los votos de las respuestas se ocultan hasta el final</span>
                </div>
            </div>
            <div class="relative w-36 sm:w-40 flex-none">
                <select
                    :disabled="!props.amIHost"
                    :value="props.config.classic?.mutators?.anonymousVoting ? 'true' : 'false'"
                    @change="emit('update-mutator', 'anonymousVoting', ($event.target as HTMLSelectElement).value === 'true')"
                    class="w-full bg-panel-card border-[2px] border-white/10 text-ink-main text-[10px] font-black uppercase tracking-wider pl-3.5 pr-8 py-2 rounded-xl appearance-none cursor-pointer hover:bg-panel-input transition-colors focus:outline-none focus:border-action-primary shadow-inner h-11 select-none"
                >
                    <option value="false" class="bg-panel-card">DESACTIVADO</option>
                    <option value="true" class="bg-panel-card text-action-blue font-black">ACTIVADO 🎭</option>
                </select>
                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-[9px]">▼</span>
            </div>
        </div>
    </div>
</template>
