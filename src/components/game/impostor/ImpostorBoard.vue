<script setup lang="ts">
import { computed } from 'vue';
import { RoomState } from '../../../../shared/types';
import ImpostorReveal from './ImpostorReveal.vue';
import ImpostorTyping from './ImpostorTyping.vue';
import ImpostorVoting from './ImpostorVoting.vue';
import ImpostorResults from './ImpostorResults.vue';
import ChatWidget from '../../chat/ChatWidget.vue';
import MobileChatDrawer from '../../chat/MobileChatDrawer.vue';

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

const isDead = computed(() => {
    if (!impostorData.value) return false;
    return !impostorData.value.alivePlayers.includes(props.myUserId);
});

const handleSubmit = (word: string) => {
    emit('submit-answers', { "0": word });
};
</script>

<template>
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 w-full h-full overflow-hidden p-4 relative">
        
        <!-- JUEGO (Columna Izquierda 1fr) -->
        <div class="h-full w-full flex flex-col items-center justify-center relative rounded-2xl overflow-hidden bg-black/20 shadow-inner">
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

            <!-- PHASE: VOTING (El Tribunal) -->
            <ImpostorVoting
                v-else-if="currentPhase === 'VOTING' && impostorData"
                :impostor-data="impostorData"
                :players="gameState.players"
                :my-user-id="myUserId"
                :time-remaining="timeRemaining"
                :timer-color="timerColor"
            />
            
            <!-- PHASE: RESULTS -->
            <ImpostorResults
                v-else-if="currentPhase === 'RESULTS' && impostorData"
                :impostor-data="impostorData"
                :players="gameState.players"
                :time-remaining="timeRemaining"
                :timer-color="timerColor"
            />

            <!-- FALLBACK LOBBY / INTERMISSION -->
            <div v-else class="text-white/40 italic">Cargando modo Impostor...</div>
        </Transition>
        </div>

        <!-- SOCIAL (Columna Derecha 320px Desktop Only) -->
        <div class="hidden lg:flex flex-col h-full rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/5">
            <ChatWidget :is-disabled="isDead" />
        </div>

        <!-- CHAT MÓVIL (FAB) -->
        <MobileChatDrawer class="lg:hidden" :is-disabled="isDead" />
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
