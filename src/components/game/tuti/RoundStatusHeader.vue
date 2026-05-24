<script setup lang="ts">
import { computed } from 'vue';
import { useSound } from '../../../composables/useSound';

const props = defineProps<{
    round: number;
    totalRounds: number;
    currentLetter: string | null;
    timeLeft: number | null;
    timerColor: string;
    status: string;
    isLastRound?: boolean;
}>();

defineEmits<{
    (e: 'exit'): void;
}>();

const { isMuted, toggleMute } = useSound();

// --- TIMER STATE (Soft-Pop 3-level urgency) ---
const timerState = computed(() => {
    const t = props.timeLeft;
    if (t === null) return 'idle';
    if (t > 20) return 'safe';
    if (t > 10) return 'warning';
    if (t > 5)  return 'panic';
    return 'critical';
});

const timerClasses = computed(() => {
    switch (timerState.value) {
        case 'safe':    return 'bg-game-yellow text-panel-base shadow-3d-yellow';
        case 'warning': return 'bg-game-red/80 text-white shadow-3d-red scale-105';
        case 'panic':   return 'bg-game-red text-white shadow-3d-red scale-110';
        case 'critical':return 'bg-game-red text-white shadow-3d-red scale-110 animate-heartbeat';
        default:        return 'bg-panel-card text-ink-muted shadow-3d-panel';
    }
});
</script>

<template>
    <div class="w-full lg:max-w-[1600px] lg:mx-auto lg:grid lg:gap-8 px-2 pointer-events-none z-40 relative mt-4"
         :class="status === 'PLAYING' ? 'lg:grid-cols-[220px_1fr_200px]' : 'lg:grid-cols-[1fr_200px]'">
         
        <!-- Left Column: Exit + Round Badge (Desktop in PLAYING phase) -->
        <div v-if="status === 'PLAYING'" class="hidden lg:flex items-center w-full pointer-events-auto">
            <div class="flex items-center gap-3 md:gap-4 w-auto bg-panel-card/80 backdrop-blur-md px-2 py-1.5 md:px-3 md:py-2 rounded-2xl shadow-3d-panel border border-white/5">
                <!-- Exit Button -->
                <button 
                    @click="$emit('exit')"
                    class="text-ink-soft hover:text-white transition-all p-1.5 md:p-2 bg-panel-input rounded-xl shadow-3d-panel border border-white/5 active:translate-y-[3px] active:shadow-none"
                    title="Salir"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="size-5 md:size-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                    </svg>
                </button>

                <div class="flex flex-col pr-2 md:pr-4">
                    <span class="text-[9px] md:text-[10px] uppercase font-black text-ink-muted tracking-widest leading-none mb-0.5 ronda-label">Ronda</span>
                    <span class="text-base md:text-xl font-heading font-black text-ink-main leading-none ronda-number">
                        {{ round }}<span class="text-[10px] md:text-xs text-ink-soft ml-0.5">/{{ totalRounds }}</span>
                    </span>
                </div>
            </div>
        </div>

        <!-- Center Active Column -->
        <div class="flex-none h-16 flex items-center justify-between px-2 md:px-0 relative w-full pointer-events-none">
            
            <!-- Left: Exit & Round (Soft-Pop Pill - Hidden on desktop in PLAYING because it renders in column 1) -->
            <div 
                class="flex items-center gap-3 md:gap-4 w-auto bg-panel-card/80 backdrop-blur-md px-2 py-1.5 md:px-3 md:py-2 rounded-2xl shadow-3d-panel border border-white/5 pointer-events-auto exit-pill"
                :class="status === 'PLAYING' ? 'lg:hidden' : ''"
            >
                <!-- Exit Button -->
                <button 
                    @click="$emit('exit')"
                    class="text-ink-soft hover:text-white transition-all p-1.5 md:p-2 bg-panel-input rounded-xl shadow-3d-panel border border-white/5 active:translate-y-[3px] active:shadow-none"
                    title="Salir"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="size-5 md:size-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                    </svg>
                </button>

                <div class="flex flex-col pr-2 md:pr-4">
                    <span class="text-[9px] md:text-[10px] uppercase font-black text-ink-muted tracking-widest leading-none mb-0.5 ronda-label">Ronda</span>
                    <span class="text-base md:text-xl font-heading font-black text-ink-main leading-none ronda-number">
                        {{ round }}<span class="text-[10px] md:text-xs text-ink-soft ml-0.5">/{{ totalRounds }}</span>
                    </span>
                </div>
            </div>

            <!-- Left Spacer (Desktop-only to force Timer to the right side of the flex container) -->
            <div v-if="status === 'PLAYING'" class="hidden lg:block w-1 h-1 pointer-events-none"></div>

            <!-- Center: THE LETTER BADGE (Glassmorphic Orb with Neon Glow) -->
            <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none flex items-center justify-center">
                <!-- Outer Ring (Clockwise) -->
                <div class="absolute w-14 h-14 md:w-18 md:h-18 rounded-full border border-dashed border-tuti-teal/30 animate-spin-slow outer-ring"></div>
                <!-- Inner Ring (Counter-clockwise) -->
                <div class="absolute w-12 h-12 md:w-15 md:h-15 rounded-full border border-dotted border-game-yellow/30 animate-spin-reverse inner-ring"></div>
                
                <!-- Main Glassmorphic Neon Orb -->
                <div class="w-10 h-10 md:w-12 md:h-12 rounded-full
                            bg-gradient-to-b from-[#1b1947]/90 to-[#0e0c2d]/95
                            border-2 border-tuti-teal/50
                            shadow-[0_0_25px_rgba(45,212,191,0.45),_inset_0_1px_4px_rgba(255,255,255,0.15)]
                            flex items-center justify-center
                            transition-all duration-300 relative z-20 neon-orb-container">
                    <span class="text-xl md:text-2xl font-heading font-black text-tuti-teal drop-shadow-[0_0_10px_rgba(45,212,191,0.8)] neon-orb-text">
                        {{ currentLetter }}
                    </span>
                </div>
            </div>

            <!-- Right: Controls (Volume + Timer) -->
            <div class="flex items-center gap-2 md:gap-3 pointer-events-auto controls-group">
                <!-- Volume Button (Symmetric esmerilado square 3D button - Hidden on desktop) -->
                <button 
                    @click="toggleMute"
                    class="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-xl bg-panel-card/80 border border-white/10 text-white shadow-3d-panel hover:bg-white/10 active:translate-y-[3px] active:shadow-none transition-all volume-btn lg:hidden"
                    :title="isMuted ? 'Activar sonido' : 'Silenciar sonido'"
                >
                    <svg v-if="!isMuted" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 opacity-90">
                        <path d="M9.348 14.651l-2.853-2.852H4V8.201h2.495l2.853-2.852v9.302zM15.536 10a5.002 5.002 0 00-2.316-4.195v8.39A5.002 5.002 0 0015.536 10z" />
                        <path d="M12.22 3.102v13.796A7.003 7.003 0 0018.5 10a7.003 7.003 0 00-6.28-6.898z" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 opacity-50 text-red-400">
                        <path fill-rule="evenodd" d="M9.383 3.076a.75.75 0 011.066.079l.067.086 5.86 8.371a.75.75 0 01-1.127.949l-.067-.086-1.503-2.148H12v3.633a.75.75 0 01-1.077.677l-4.14-2.192H4a2 2 0 01-2-2V9.5a2 2 0 011.66-1.972l.34-.028h1.841l4.14-2.192a.75.75 0 011.402.399l.001 5.863L9.304 3.14a.75.75 0 01.079-1.064zM16.53 4.47a.75.75 0 011.06 0l1.94 1.94 1.94-1.94a.75.75 0 111.06 1.06L20.59 7.47l1.94 1.94a.75.75 0 11-1.06 1.06l-1.94-1.94-1.94 1.94a.75.75 0 01-1.06-1.06l1.94-1.94-1.94-1.94a.75.75 0 010-1.06z" clip-rule="evenodd" />
                    </svg>
                </button>

                <!-- Timer Badge -->
                <div class="flex items-center rounded-2xl px-4 py-2 transition-all duration-300 h-10 md:h-11 timer-badge"
                     :class="timerClasses">
                    <div v-if="timeLeft !== null" class="flex items-center gap-2">
                        <span class="text-sm">⏱️</span>
                        <span class="font-mono text-lg md:text-xl font-black leading-none tabular-nums">
                            {{ timeLeft }}
                        </span>
                    </div>
                    <span v-else class="text-lg md:text-xl font-black opacity-50">--</span>
                </div>
            </div>
        </div>

        <!-- Right Column: Volume Button above Chat (Desktop) -->
        <div class="hidden lg:flex items-center justify-end w-full pointer-events-auto pr-4">
            <!-- Volume Button (Symmetric esmerilado square 3D button) -->
            <button 
                @click="toggleMute"
                class="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-xl bg-panel-card/80 border border-white/10 text-white shadow-3d-panel hover:bg-white/10 active:translate-y-[3px] active:shadow-none transition-all volume-btn"
                :title="isMuted ? 'Activar sonido' : 'Silenciar sonido'"
            >
                <svg v-if="!isMuted" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 opacity-90">
                    <path d="M9.348 14.651l-2.853-2.852H4V8.201h2.495l2.853-2.852v9.302zM15.536 10a5.002 5.002 0 00-2.316-4.195v8.39A5.002 5.002 0 0015.536 10z" />
                    <path d="M12.22 3.102v13.796A7.003 7.003 0 0018.5 10a7.003 7.003 0 00-6.28-6.898z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 opacity-50 text-red-400">
                    <path fill-rule="evenodd" d="M9.383 3.076a.75.75 0 011.066.079l.067.086 5.86 8.371a.75.75 0 01-1.127.949l-.067-.086-1.503-2.148H12v3.633a.75.75 0 01-1.077.677l-4.14-2.192H4a2 2 0 01-2-2V9.5a2 2 0 011.66-1.972l.34-.028h1.841l4.14-2.192a.75.75 0 011.402.399l.001 5.863L9.304 3.14a.75.75 0 01.079-1.064zM16.53 4.47a.75.75 0 011.06 0l1.94 1.94 1.94-1.94a.75.75 0 111.06 1.06L20.59 7.47l1.94 1.94a.75.75 0 11-1.06 1.06l-1.94-1.94-1.94 1.94a.75.75 0 01-1.06-1.06l1.94-1.94-1.94-1.94a.75.75 0 010-1.06z" clip-rule="evenodd" />
                </svg>
            </button>
        </div>
    </div>
</template>

<style scoped>
@keyframes heartbeat {
    0%, 100% { transform: scale(1.1); }
    15% { transform: scale(1.3); }
    30% { transform: scale(1.1); }
    45% { transform: scale(1.3); }
    60% { transform: scale(1.1); }
}
.animate-heartbeat {
    animation: heartbeat 1s ease-in-out infinite;
}
@keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
@keyframes spin-reverse {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
}
.animate-spin-slow {
    animation: spin-slow 10s linear infinite;
}
.animate-spin-reverse {
    animation: spin-reverse 7s linear infinite;
}

/* Custom responsive scaling for very narrow mobile screens to avoid overlap */
@media (max-width: 380px) {
  .neon-orb-container {
    width: 2.125rem !important; /* ~34px */
    height: 2.125rem !important;
  }
  .neon-orb-text {
    font-size: 1.125rem !important; /* ~18px */
  }
  .outer-ring {
    width: 3rem !important;
    height: 3rem !important;
  }
  .inner-ring {
    width: 2.5rem !important;
    height: 2.5rem !important;
  }
  .exit-pill {
    padding: 0.25rem 0.375rem !important;
    gap: 0.25rem !important;
  }
  .exit-pill svg {
    width: 1.125rem !important;
    height: 1.125rem !important;
  }
  .exit-pill .ronda-label {
    font-size: 8px !important;
  }
  .exit-pill .ronda-number {
    font-size: 0.875rem !important;
  }
  .controls-group {
    gap: 0.25rem !important;
  }
  .controls-group button.volume-btn {
    width: 2.25rem !important;
    height: 2.25rem !important;
  }
  .controls-group button.volume-btn svg {
    width: 1.125rem !important;
    height: 1.125rem !important;
  }
  .controls-group .timer-badge {
    height: 2.25rem !important;
    padding-left: 0.5rem !important;
    padding-right: 0.5rem !important;
  }
  .controls-group .timer-badge span {
    font-size: 0.875rem !important;
  }
}
</style>
