<script setup lang="ts">
import { useGame } from '../composables/useGame';

const { isUpdateAvailable } = useGame();

const reload = () => {
    window.location.reload();
};
</script>

<template>
    <div v-if="isUpdateAvailable" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md">
        <div class="bg-indigo-900 border border-white/20 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-fade-in-up">
            <div class="text-5xl mb-4">🚀</div>
            <h2 class="text-2xl font-black text-white mb-2">¡Actualización Disponible!</h2>
            <p class="text-indigo-200 mb-6">Hemos mejorado el juego. Necesitas recargar para continuar sin errores.</p>
            
            <button @click="reload" class="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-black text-lg shadow-lg hover:scale-105 transition-transform">
                ACTUALIZAR AHORA
            </button>
        </div>
    </div>
</template>

<style scoped>
@keyframes fade-in-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
    animation: fade-in-up 0.5s ease-out forwards;
}
</style>
