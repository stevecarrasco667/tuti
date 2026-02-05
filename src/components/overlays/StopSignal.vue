<script setup lang="ts">
import { onMounted } from 'vue';
import { useSound } from '../../composables/useSound';

const emit = defineEmits(['finished']);
const { playStop } = useSound();

onMounted(() => {
    // 1. Audio & Haptics
    playStop();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    // 2. Auto-dismiss
    setTimeout(() => {
        emit('finished');
    }, 2000);
});
</script>

<template>
    <div class="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
        <!-- Backdrop flash -->
        <div class="absolute inset-0 bg-fuchsia-900/40 animate-flash"></div>
        
        <!-- Stamp -->
        <div class="relative transform rotate-[-12deg] border-8 border-current text-fuchsia-500 p-8 rounded-xl bg-black/80 shadow-[0_0_100px_rgba(236,72,153,0.6)] animate-stamp">
            <h1 class="text-8xl md:text-9xl font-black tracking-tighter uppercase drop-shadow-lg">
                ¡BASTA!
            </h1>
            <div class="absolute -bottom-4 -right-4 text-6xl">✋</div>
        </div>
    </div>
</template>

<style scoped>
@keyframes stamp {
    0% { transform: scale(5) rotate(0deg); opacity: 0; }
    50% { transform: scale(0.8) rotate(-12deg); opacity: 1; }
    70% { transform: scale(1.1) rotate(-12deg); }
    100% { transform: scale(1) rotate(-12deg); }
}
.animate-stamp {
    animation: stamp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes flash {
    0% { opacity: 0; }
    10% { opacity: 1; }
    100% { opacity: 0; }
}
.animate-flash {
    animation: flash 0.5s ease-out forwards;
}
</style>
