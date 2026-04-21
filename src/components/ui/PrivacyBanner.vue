<script setup lang="ts">
import { ref, onMounted } from 'vue';
import TButton from './TButton.vue';

const STORAGE_KEY = 'tuti-privacy-accepted';
const isVisible = ref(false);

onMounted(() => {
    if (typeof localStorage !== 'undefined') {
        const hasAccepted = localStorage.getItem(STORAGE_KEY);
        if (!hasAccepted) {
            isVisible.value = true;
        }
    }
});

const acceptPrivacy = () => {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, 'true');
    }
    isVisible.value = false;
};
</script>

<template>
    <Transition name="slide-up">
        <div v-if="isVisible" class="fixed bottom-0 left-0 w-full z-50 p-4 md:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div class="max-w-4xl mx-auto bg-panel-card/95 backdrop-blur-xl border border-white/10 p-5 md:p-6 rounded-3xl shadow-glow-primary flex flex-col md:flex-row items-center gap-4">
                <div class="flex-1 flex items-start gap-4">
                    <span class="text-3xl hidden sm:block">🍪</span>
                    <div>
                        <h4 class="text-white font-black uppercase tracking-widest text-sm mb-1">Tu Privacidad</h4>
                        <p class="text-ink-muted text-xs md:text-sm font-bold leading-relaxed">
                            Utilizamos almacenamiento local (LocalStorage) exclusivamente para mantener tu sesión activa y guardar tu avatar/nombre de forma temporal. <strong>No usamos cookies de rastreo ni publicidad de terceros.</strong>
                        </p>
                    </div>
                </div>
                <div class="flex-none w-full md:w-auto">
                    <TButton variant="primary" class="w-full md:w-auto text-sm" @click="acceptPrivacy">
                        Entendido
                    </TButton>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
    opacity: 0;
    transform: translateY(100%);
}
</style>
