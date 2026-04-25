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
import { useI18n } from 'vue-i18n';

const props = defineProps<{
    gameState: RoomState;
    myUserId: string;
    amIHost: boolean;
    isStopping: boolean;
    timeRemaining: number;
    timerColor: string;
    isSpectator?: boolean;
}>();

const emit = defineEmits<{
    (e: 'exit'): void;
    (e: 'submit-answers', answers: Record<string, string>): void;
}>();

const impostorData = computed(() => props.gameState.impostorData);
const currentPhase = computed(() => props.gameState.status);

const { t } = useI18n();

const isDead = computed(() => {
    if (!impostorData.value) return false;
    return !impostorData.value.alivePlayers.includes(props.myUserId);
});

const handleSubmit = (word: string) => {
    emit('submit-answers', { "0": word });
};
</script>

<template>
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4 w-full h-full overflow-hidden p-4 relative">
        
        <!-- JUEGO (Columna Izquierda 1fr) -->
        <div class="h-full w-full flex flex-col items-center justify-center relative rounded-3xl overflow-hidden shadow-inner">
            <!-- TOP-LEFT: Botón de salida, igual que GameHUD, sin solapamiento -->
            <button @click="emit('exit')" class="absolute top-3 left-3 z-[90] text-white/60 hover:text-white transition-colors p-1" :title="t('gameHUD.exit')">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
            </button>

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
                :is-spectator="isSpectator"
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
                :is-spectator="isSpectator"
            />
            
            <!-- PHASE: RESULTS -->
            <ImpostorResults
                v-else-if="currentPhase === 'RESULTS' && impostorData"
                :impostor-data="impostorData"
                :players="gameState.players"
                :time-remaining="timeRemaining"
                :timer-color="timerColor"
                :is-spectator="isSpectator"
            />

            <!-- PHASE: LAST_WISH [P10] -->
            <ImpostorLastWish
                v-else-if="currentPhase === 'LAST_WISH' && impostorData"
                :impostor-data="impostorData"
                :players="gameState.players"
                :my-user-id="myUserId"
                :time-remaining="timeRemaining"
                :timer-color="timerColor"
                :is-spectator="isSpectator"
            />

            <!-- FALLBACK LOBBY / INTERMISSION -->
            <div v-else class="text-ink-main/40 font-black uppercase tracking-widest animate-pulse">{{ t('impostorBoard.loading') }}</div>
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
