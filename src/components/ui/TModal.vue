<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

const props = defineProps<{
    modelValue: boolean;
    title?: string;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'close'): void;
}>();

// Cerrar el modal
const close = () => {
    emit('update:modelValue', false);
    emit('close');
};

// Cierre mediante evento presionar tecla ESC
const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.modelValue) {
        close();
    }
};

// Bloquear el scroll del body cuando el modal está abierto para evitar dobles scrolls,
// pero esto se maneja con watch, o al menos con eventos
import { watch } from 'vue';
watch(() => props.modelValue, (isOpen) => {
    if (isOpen && typeof document !== 'undefined') {
        document.body.style.overflow = 'hidden';
    } else if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
    }
});

onMounted(() => {
    if (typeof document !== 'undefined') {
        document.addEventListener('keydown', handleKeydown);
    }
});

onUnmounted(() => {
    if (typeof document !== 'undefined') {
        document.removeEventListener('keydown', handleKeydown);
        document.body.style.overflow = '';
    }
});

const maxWidthClass = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
}[props.maxWidth || 'md'];

</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="modelValue" class="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
                <!-- Backdrop (Fondo Oscurecido / Blur) con listener para cerrar al hacer clic fuera -->
                <div 
                    class="absolute inset-0 bg-panel-base/80 backdrop-blur-sm transition-opacity" 
                    @click="close"
                ></div>

                <!-- Ventana Modal -->
                <div class="relative bg-panel-card border-[3px] border-white/20 rounded-3xl shadow-2xl w-full flex flex-col flex-none max-h-full overflow-hidden transform transition-all" :class="maxWidthClass">
                    
                    <!-- Header -->
                    <div class="flex items-center justify-between p-4 border-b-2 border-white/10 shrink-0">
                        <h3 class="text-ink-main text-sm font-black uppercase tracking-widest">{{ title }}</h3>
                        <button 
                            @click="close"
                            class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/20 border-2 border-transparent hover:border-white/10 flex items-center justify-center text-ink-muted hover:text-white transition-all active:scale-95"
                            aria-label="Cerrar modal"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                        </button>
                    </div>

                    <!-- Contenido (Scrolleable internamente si es muy alto) -->
                    <div class="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
                        <slot></slot>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
/* Modal Transition: Slide up + fade in */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: translateY(20px) scale(0.95);
}
</style>
