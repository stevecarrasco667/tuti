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
        <div class="h-full w-full flex flex-col items-center justify-center relative rounded-3xl overflow-hidden shadow-inner">
            <!-- TOP: Botón rápido de salida transparente en la cabecera -->
            <div class="absolute top-4 right-4 z-[90]">
            <button @click="emit('exit')" class="text-white bg-action-error/80 hover:bg-red-500 p-2 text-sm font-black uppercase tracking-widest rounded-xl shadow-game-btn border-2 border-white/50 backdrop-blur-sm transition-all active:scale-95 cursor-pointer">
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
            <div v-else class="text-ink-main/40 font-black uppercase tracking-widest animate-pulse">Cargando modo Impostor...</div>
        </Transition>
        </div>

        <!-- SOCIAL (Columna Derecha 320px Desktop Only) -->
        <div class="hidden lg:flex flex-col h-full rounded-3xl overflow-hidden shadow-game-panel border-[3px] border-white/50 bg-panel-base/30">
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
