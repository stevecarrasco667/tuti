<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
    round: number;
    totalRounds: number;
    currentLetter: string | null;
    timeLeft: number | null;
    timerColor: string; // preservado por compatibilidad, pero ya no lo usamos directamente
    status: string;
}>();

defineEmits<{
    (e: 'exit'): void;
}>();

const { t } = useI18n();

// [FE-3.3] Timer: 3 estados visuales con comportamiento reactivo
const timerState = computed(() => {
    const t = props.timeLeft;
    if (t === null) return 'idle';
    if (t <= 10) return 'panic';   // rojo + pulse + shake
    if (t <= 20) return 'warning'; // naranja + scale
    return 'safe';                  // amarillo neutro
});

const timerWrapperClass = computed(() => ({
    safe:    'bg-game-yellow text-game-black border-2 border-game-black shadow-hard-sm scale-100',
    warning: 'bg-game-orange text-white border-2 border-game-black shadow-hard scale-105',
    panic:   'bg-game-red text-white border-2 border-game-black shadow-hard-red scale-110 animate-timer-pulse shadow-glow-red',
    idle:    'bg-panel-card text-ink-muted border-2 border-white/10',
}[timerState.value]));
</script>

<template>
    <div class="w-full lg:max-w-[1600px] lg:mx-auto lg:grid lg:gap-8 pointer-events-none z-40 relative mt-4"
         :class="status === 'PLAYING' ? 'lg:grid-cols-[280px_1fr_200px]' : 'lg:grid-cols-[1fr_200px]'">

        <!-- Left Dummy Column (PLAYING only) -->
        <div v-if="status === 'PLAYING'" class="hidden lg:block w-full"></div>

        <!-- Center: Pill de ronda + Letra + Timer -->
        <div class="flex-none h-16 flex items-center justify-between px-2 md:px-0 relative w-full pointer-events-none">

            <!-- [FE-3] Left: Pill de Ronda — Neo-Brutalista -->
            <div class="flex items-center gap-3 pointer-events-auto">
                <button @click="$emit('exit')"
                    class="nb-btn-ghost !border-solid !border-white/20 !min-h-[40px] !py-1.5 !px-2 !rounded-xl !shadow-none hover:!bg-white/10"
                    :title="t('gameHUD.exit')">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="size-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                    </svg>
                </button>
                <div class="bg-panel-card border-2 border-white/20 px-3 py-1.5 rounded-xl shadow-hard-white-sm">
                    <span class="block text-[9px] font-heading font-black text-ink-muted uppercase tracking-widest leading-none mb-0.5">Ronda</span>
                    <span class="text-base md:text-xl font-heading font-black text-ink-main leading-none">
                        {{ round }}<span class="text-[10px] text-ink-soft ml-0.5">/{{ totalRounds }}</span>
                    </span>
                </div>
            </div>

            <!-- [FE-3] Center: Badge de letra — Neo-Brutalista con sombra hard y borde negro -->
            <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                <div class="bg-game-yellow border-3 border-game-black shadow-hard
                            w-14 h-14 md:w-16 md:h-16 rounded-full
                            flex items-center justify-center
                            transition-transform duration-300 hover:scale-105">
                    <span class="font-display text-3xl md:text-4xl font-black text-game-black leading-none"
                          style="text-shadow: 2px 2px 0px rgba(0,0,0,0.15);">
                        {{ currentLetter }}
                    </span>
                </div>
            </div>

            <!-- [FE-3.3] Right: Timer con 3 estados de urgencia -->
            <div class="pointer-events-auto transition-all duration-200 rounded-xl px-3 py-1.5 flex items-center justify-center min-w-[60px]"
                 :class="timerWrapperClass">
                <span v-if="timeLeft !== null"
                      class="font-display text-2xl md:text-3xl font-black leading-none tabular-nums">
                    {{ timeLeft }}
                </span>
                <span v-else class="font-display text-2xl font-black text-ink-muted">--</span>
            </div>
        </div>

        <!-- Right Dummy Column (Chat space) -->
        <div class="hidden lg:block w-full"></div>
    </div>
</template>
