<script setup lang="ts">
import { computed } from 'vue';
import { RoomState } from '../../../../shared/types';
import ImpostorReveal from './ImpostorReveal.vue';
import ImpostorTyping from './ImpostorTyping.vue';
import ImpostorVoting from './ImpostorVoting.vue';
import ImpostorLastWish from './ImpostorLastWish.vue';
import ImpostorResults from './ImpostorResults.vue';
import ChatWidget from '../../chat/ChatWidget.vue';
import MobileChatDrawer from '../../chat/MobileChatDrawer.vue';
import GameHUD from '../GameHUD.vue';
import { useChat } from '../../../composables/useChat';

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

const { isChatMinimized } = useChat();

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
    <div class="grid gap-4 w-full h-full overflow-hidden p-4 relative"
         :class="isChatMinimized ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[1fr_320px]'">
        
        <!-- JUEGO (Columna Central Expandida) -->
        <div class="h-full w-full flex flex-col relative rounded-3xl overflow-hidden shadow-inner bg-panel-base/30">
            <!-- TOP HUD ESTANDARIZADO -->
            <GameHUD 
                :title="impostorData?.currentCategoryName || 'Impostor'"
                :subtitle="currentPhase === 'ROLE_REVEAL' ? 'Roles' : 'Categoría'"
                :time-left="timeRemaining"
                :timer-color="timerColor"
                @exit="emit('exit')"
            />
            
            <!-- MAIN CONTENT AREA -->
            <div class="flex-1 flex flex-col items-center justify-center relative min-h-0 overflow-y-auto w-full">

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

            <!-- PHASE: LAST_WISH [P10] -->
            <ImpostorLastWish
                v-else-if="currentPhase === 'last_wish' && impostorData"
                :impostor-data="impostorData"
                :players="gameState.players"
                :my-user-id="myUserId"
                :time-remaining="timeRemaining"
                :timer-color="timerColor"
            />

            <!-- FALLBACK LOBBY / INTERMISSION -->
            <div v-else class="text-ink-main/40 font-black uppercase tracking-widest animate-pulse">Cargando modo Impostor...</div>
        </Transition>
            </div>
        </div>

        <!-- Espaciador Oculto para reservar el Grid cuando el Chat está Abierto -->
        <div v-if="!isChatMinimized" class="hidden lg:block w-full h-full"></div>

        <!-- CHAT FLOTANTE (Desktop Only) -->
        <div class="hidden lg:flex flex-col fixed bottom-6 right-6 z-[100] h-[500px] max-h-[80vh] transition-all duration-300"
             :class="isChatMinimized ? 'w-16 h-16 pointer-events-none' : 'w-[320px] pointer-events-auto'">
            <div class="w-full h-full pointer-events-auto flex items-end justify-end">
                <ChatWidget :is-disabled="isDead" />
            </div>
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
