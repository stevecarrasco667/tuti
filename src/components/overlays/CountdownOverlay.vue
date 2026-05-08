<script setup lang="ts">
import { ref, onMounted } from 'vue';

const props = defineProps<{
    round?: number;
    totalRounds?: number;
    letter?: string | null;
}>();

const emit = defineEmits(['finished']);
const count = ref(3);
const showGo = ref(false);

onMounted(() => {
    const interval = setInterval(() => {
        if (count.value > 1) {
            count.value--;
            // Play bloop sound?
        } else {
            clearInterval(interval);
            showGo.value = true;
            // Play Go sound?
            setTimeout(() => {
                emit('finished');
            }, 800);
        }
    }, 1000);
});
</script>

<template>
    <div class="fixed inset-0 z-overlay flex flex-col items-center justify-center bg-tuti-base/90 backdrop-blur-md">
        
        <!-- Detalles de la Ronda -->
        <div v-if="round && totalRounds" class="mb-4 text-center animate-fade-in-down">
            <span class="text-white/60 font-black tracking-[0.3em] uppercase text-sm md:text-base">
                Ronda
            </span>
            <h2 class="text-4xl md:text-5xl font-black text-white mt-1">
                {{ round }}<span class="text-white/40 text-2xl md:text-3xl">/{{ totalRounds }}</span>
            </h2>
        </div>
        
        <!-- Letra Elegida -->
        <div v-if="letter" class="mb-8 animate-bounce-in-delay">
            <div class="w-24 h-24 md:w-32 md:h-32 rounded-full bg-game-yellow shadow-[0_0_40px_rgba(255,204,0,0.4)] flex items-center justify-center border-4 border-white/20">
                <span class="text-[4rem] md:text-[5.5rem] font-heading font-black text-panel-base drop-shadow-sm leading-none mt-2">{{ letter }}</span>
            </div>
        </div>

        <!-- The Countdown -->
        <div v-if="!showGo" class="text-[8rem] md:text-[12rem] font-black text-white drop-shadow-md animate-ping-slow text-stroke z-10 leading-none">
            {{ count }}
        </div>
        <div v-else class="text-[6rem] md:text-[10rem] font-black text-action-warning drop-shadow-md animate-bounce-in text-stroke z-10 leading-none">
            ¡YA!
        </div>
    </div>
</template>

<style scoped>
@keyframes ping-slow {
    0% { transform: scale(0.8); opacity: 0; }
    50% { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
}
.animate-ping-slow {
    animation: ping-slow 0.8s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes bounce-in {
    0% { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
}
.animate-bounce-in {
    animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes fade-in-down {
    0% { opacity: 0; transform: translateY(-20px); }
    100% { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-down {
    animation: fade-in-down 0.5s ease-out forwards;
}

.animate-bounce-in-delay {
    animation: bounce-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards 0.2s;
    opacity: 0;
}
</style>
