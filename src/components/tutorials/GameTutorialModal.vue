<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import TModal from '../ui/TModal.vue';

const props = defineProps<{
    modelValue: boolean;
    mode: 'CLASSIC' | 'IMPOSTOR' | null;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
}>();

const step = ref(0);

// Reiniciar el paso cuando se abre
watch(() => props.modelValue, (isOpen) => {
    if (isOpen) {
        step.value = 0;
    }
});

const tutorialData = {
    'CLASSIC': {
        title: 'TUTI CLÁSICO',
        steps: [
            { icon: '🔤', text: 'Se elige una letra al azar. Deberás escribir una palabra que empiece con esa letra para cada categoría.' },
            { icon: '⏱️', text: 'El primero en completar su lista toca "Tuti" y el contador baja a 10 segundos para el resto.' },
            { icon: '⚖️', text: '¡Votación! El grupo decide si las respuestas raras o cuestionables de los demás son válidas.' }
        ]
    },
    'IMPOSTOR': {
        title: 'MODO IMPOSTOR',
        steps: [
            { icon: '🤫', text: 'Todos reciben la misma categoría secreta para escribir algo relacionado... menos el Impostor.' },
            { icon: '🎭', text: 'Si eres Impostor: Lee o observa lo que escriben los demás y disimula. Si eres Tripulante: Escribe una pista sin dejarla tan fácil.' },
            { icon: '🗳️', text: 'Tribunal Final. Debaten y votan por quién creen que es el impostor. ¡Ojo con las mentiras!' }
        ]
    }
};

const currentTutorial = computed(() => props.mode ? tutorialData[props.mode] : null);
const maxSteps = computed(() => currentTutorial.value?.steps.length || 0);

const nextStep = () => {
    if (step.value < maxSteps.value - 1) {
        step.value++;
    } else {
        emit('update:modelValue', false);
    }
};

const prevStep = () => {
    if (step.value > 0) step.value--;
};
</script>

<template>
    <TModal 
        :model-value="modelValue" 
        @update:model-value="emit('update:modelValue', $event)"
        :title="currentTutorial?.title || 'Tutorial'"
        max-width="sm"
    >
        <div class="relative w-full overflow-hidden">
            <Transition name="slide" mode="out-in">
                <!-- Se usa ':key="step"' para forzar la re-animación cuando cambia el paso -->
                <div v-if="currentTutorial && currentTutorial.steps[step]" :key="step" class="flex flex-col items-center justify-center min-h-[180px] sm:min-h-[220px] text-center px-2 py-4">
                    <!-- Icono Gigante -->
                    <div class="text-7xl sm:text-8xl mb-6 drop-shadow-2xl select-none transform transition-transform hover:scale-110">
                        {{ currentTutorial.steps[step].icon }}
                    </div>
                    
                    <!-- Texto de la Diapositiva -->
                    <p class="text-ink-main text-[13px] sm:text-sm font-black leading-relaxed max-w-[280px]">
                        {{ currentTutorial.steps[step].text }}
                    </p>
                </div>
            </Transition>
        </div>

        <!-- Navegación del Carrusel -->
        <div class="mt-8 flex flex-col items-center gap-5">
            <!-- Paginadores (Dots) -->
            <div class="flex items-center gap-3">
                <div 
                    v-for="(_, i) in maxSteps" :key="i"
                    class="w-2.5 h-2.5 rounded-full transition-all duration-300"
                    :class="i === step ? 'bg-action-primary scale-150 shadow-glow-primary' : 'bg-white/10'"
                ></div>
            </div>

            <!-- Botones de Acción -->
            <div class="flex items-center w-full justify-between gap-3 mt-1">
                <button 
                    @click="prevStep" 
                    class="flex-1 bg-panel-input hover:bg-panel-input/80 border-[3px] border-panel-card text-ink-muted hover:text-white py-3 rounded-xl font-black uppercase text-xs tracking-wider transition-all active:scale-95 disabled:opacity-0"
                    :disabled="step === 0"
                >
                    &lt; Atrás
                </button>
                <button 
                    @click="nextStep" 
                    class="flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-glow-primary border-[3px] cursor-pointer"
                    :class="step === maxSteps - 1 
                        ? 'bg-action-primary hover:bg-action-primary/90 text-panel-base border-white/20' 
                        : 'bg-white hover:bg-white/90 text-panel-base border-transparent'"
                >
                    {{ step === maxSteps - 1 ? '¡Listo!' : 'Siguiente >' }}
                </button>
            </div>
        </div>
    </TModal>
</template>

<style scoped>
/* Transición de deslizar para el carrusel */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(40px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-40px);
}
</style>
