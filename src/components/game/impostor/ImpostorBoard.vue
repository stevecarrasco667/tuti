<script setup lang="ts">
import { computed } from 'vue';
import { RoomState } from '../../../../shared/types';
import ImpostorReveal from './ImpostorReveal.vue';
import ImpostorTyping from './ImpostorTyping.vue';

const props = defineProps<{
    gameState: RoomState;
    myUserId: string;
    amIHost: boolean;
    isStopping: boolean;
    timeRemaining: number;
    timerColor: string;
}>();

const emit = defineEmits<{
    (e: 'exit'): void;
    (e: 'submit-answers', answers: Record<string, string>): void;
}>();

const impostorData = computed(() => props.gameState.impostorData);
const currentPhase = computed(() => props.gameState.status);

const handleSubmit = (word: string) => {
    emit('submit-answers', { "0": word });
};
</script>

<template>
    <div class="h-full w-full flex flex-col items-center justify-center p-4 relative overflow-hidden">
        
        <!-- TOP: Botón rápido de salida transparente en la cabecera -->
        <div class="absolute top-4 right-4 z-[90]">
            <button @click="emit('exit')" class="text-white/50 hover:text-white/90 p-2 text-sm font-bold bg-black/20 rounded-lg backdrop-blur-sm transition-colors cursor-pointer">
                SALIR
            </button>
        </div>

        <Transition name="phase-fade" mode="out-in">
            <!-- PHASE: ROLE_REVEAL -->
            <ImpostorReveal
                v-if="currentPhase === 'ROLE_REVEAL' && impostorData"
                :impostor-data="impostorData"
                :my-user-id="myUserId"
                :time-remaining="timeRemaining"
                :timer-color="timerColor"
            />
            
            <!-- PHASE: TYPING -->
            <ImpostorTyping
                v-else-if="currentPhase === 'TYPING' && impostorData"
                :impostor-data="impostorData"
                :players="gameState.players"
                :my-user-id="myUserId"
                :time-remaining="timeRemaining"
                :timer-color="timerColor"
                @submit="handleSubmit"
            />
            
            <!-- PHASE: EXPOSITION (Placeholder / Future sprint) -->
            <div v-else-if="currentPhase === 'EXPOSITION'" class="text-center font-black animate-pulse text-white/80">
                <h1 class="text-3xl text-red-500 mb-2 font-mono">FASE DE EXPOSICIÓN</h1>
                <p>El impostor camina entre nosotros...</p>
                <div class="mt-4 font-mono text-xl" :class="timerColor">{{ Math.max(0, timeRemaining) }}s</div>
            </div>

            <!-- FALLBACK LOBBY / INTERMISSION -->
            <div v-else class="text-white/40 italic">Esperando inicio...</div>
        </Transition>
    </div>
</template>

<style scoped>
.phase-fade-enter-active,
.phase-fade-leave-active {
    transition: opacity 0.5s ease-in-out, transform 0.5s ease;
}
.phase-fade-enter-from,
.phase-fade-leave-to {
    opacity: 0;
    transform: scale(0.95);
}
</style>
