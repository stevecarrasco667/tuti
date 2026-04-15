<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

// Referencia al evento nátivo de Chrome para la instalación
const deferredPrompt = ref<any>(null);
const showPrompt = ref(false);

const STORAGE_KEY = 'tutigame_pwa_dismissed';

const handleBeforeInstallPrompt = (e: Event) => {
    // Previene que Chrome muestre el mini-infobar abajo
    e.preventDefault();
    // Guardamos el evento para poder llamarlo con el botón personalizado
    deferredPrompt.value = e;
    
    // Verificamos si el usuario ya nos dijo "Ahora no"
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
        showPrompt.value = true;
    }
};

onMounted(() => {
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Si la app ya fue instalada y estamos corriendo standalone, nunca mostrar
    if (window.matchMedia('(display-mode: standalone)').matches) {
        showPrompt.value = false;
    }
});

onBeforeUnmount(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
});

const installPWA = async () => {
    if (!deferredPrompt.value) return;
    
    // Muestra el instalador nativo del navegador
    deferredPrompt.value.prompt();
    
    // Esperamos la respuesta del usuario
    const { outcome } = await deferredPrompt.value.userChoice;
    
    if (outcome === 'accepted') {
        console.log('[PWA] Usuario aceptó la instalación');
        showPrompt.value = false;
    } else {
        console.log('[PWA] Usuario canceló la instalación');
    }
    
    // El evento prompt solo se puede usar una vez, lo limpiamos
    deferredPrompt.value = null;
};

const dismissPrompt = () => {
    showPrompt.value = false;
    // No molestar más en este dispositivo (hasta que limpie localStorage)
    localStorage.setItem(STORAGE_KEY, 'true');
};
</script>

<template>
    <!-- Modal no intrusivo tipo "Slide-up Card" (Solid Pop Style) -->
    <Transition name="slide-up">
        <div v-if="showPrompt" class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
            <div class="bg-panel-card backdrop-blur-xl border border-purple-500/30 rounded-2xl p-5 shadow-[0_8px_32px_rgba(124,58,237,0.3)] flex flex-col gap-3 relative overflow-hidden group">
                
                <!-- Destello estético (Neon) -->
                <div class="absolute -top-10 -right-10 w-24 h-24 bg-pink-500/30 blur-3xl rounded-full pointer-events-none"></div>
                
                <div class="flex items-start gap-4 z-10">
                    <div class="w-12 h-12 flex-shrink-0 bg-gradient-to-br from-violet-500 to-pink-500 rounded-xl flex items-center justify-center text-white text-xl font-black shadow-lg border border-white/20">
                        T
                    </div>
                    <div>
                        <h3 class="text-white font-bold text-base leading-tight">Instala TutiGame</h3>
                        <p class="text-white/70 text-xs mt-1 leading-snug">Juega a pantalla completa, más rápido y sin abrir el navegador.</p>
                    </div>
                </div>

                <div class="flex gap-2 mt-1 z-10">
                    <button 
                        @click="installPWA"
                        class="flex-1 bg-white hover:bg-gray-100 text-purple-900 font-bold py-2 rounded-xl text-sm transition-transform active:scale-95 shadow-md"
                    >
                        Instalar Gratis
                    </button>
                    <button 
                        @click="dismissPrompt"
                        class="px-4 bg-white/5 hover:bg-white/10 text-white/50 font-semibold py-2 rounded-xl text-sm transition-colors border border-white/5 hover:border-white/10"
                    >
                        Ahora no
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.slide-up-enter-from {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
}
.slide-up-leave-to {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
}
</style>
