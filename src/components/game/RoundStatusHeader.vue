<script setup lang="ts">
defineProps<{
    round: number;
    totalRounds: number;
    currentLetter: string | null;
    timeLeft: number | null;
    timerColor: string;
}>();

defineEmits<{
    (e: 'exit'): void;
}>();
</script>

<template>
    <div class="flex-none h-20 bg-indigo-950/20 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 z-40 relative">
            
        <!-- Left: Exit & Round -->
        <div class="flex items-center gap-4 w-[120px]">
            <!-- Exit Button -->
            <button @click="$emit('exit')" class="text-white/60 hover:text-white transition-colors p-1" title="Salir">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
            </button>

            <div class="flex flex-col">
                <span class="text-[10px] uppercase font-bold text-indigo-300 tracking-widest">Ronda</span>
                <span class="text-xl font-black text-yellow-400 leading-none">
                    {{ round }}<span class="text-xs text-white/40 ml-0.5">/{{ totalRounds }}</span>
                </span>
            </div>
        </div>

        <!-- Center: THE BADGE (Current Letter) -->
        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
             <!-- If canStop is true, this might be overshadowed by the Stop Button on Mobile? 
                  Design decision: On Mobile, maybe hide Letter if button is crucial? 
                  Or keep Button small? 
                  User requested integration. Let's put the Stop Button NEXT to the badge or replace the badge??
                  Actually, the Badge is critical. The Stop Button is critical.
                  Let's try to fit them. On desktop: Letter Center, Button Right.
                  On Mobile: Letter Center, Button ??
                  
                  Let's look at the "Refactor de Layout" request again:
                  "Extraer toda la parte superior... a RoundStatusHeader".
                  
                  Let's put the STOP BUTTON in the header, probably on the right side if space permits, 
                  or keep the Letter in the Center and put the Button to the immediate right of it?
             -->
             <!-- Let's keep the Badge in the exact center. -->
            <div class="relative group">
                <div class="absolute inset-0 bg-fuchsia-500 rounded-xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <div class="relative bg-gradient-to-br from-indigo-600 to-violet-700 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border border-white/10 transform transition-transform group-hover:scale-105">
                    <span class="text-4xl font-black text-white drop-shadow-md">{{ currentLetter }}</span>
                </div>
            </div>
        </div>

        <!-- Right: Timer -->
        <div class="flex flex-col items-end w-[50px] md:w-[60px]">
            <span v-if="timeLeft !== null" 
                class="font-mono text-xl font-bold leading-none tabular-nums"
                :class="timerColor"
            >
                {{ timeLeft }}
            </span>
            <span v-else class="text-xl font-bold text-white/20">--</span>
        </div>
    </div>
</template>
