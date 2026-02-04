<script setup lang="ts">
import { ref, onMounted } from 'vue';

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
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div v-if="!showGo" class="text-[12rem] font-black text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.5)] animate-ping-slow">
            {{ count }}
        </div>
        <div v-else class="text-[8rem] font-black text-yellow-400 drop-shadow-[0_0_50px_rgba(250,204,21,0.8)] animate-bounce-in">
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
</style>
