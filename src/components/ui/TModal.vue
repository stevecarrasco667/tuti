<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
    modelValue: boolean;
    title?: string;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'close'): void;
}>();

// ── Focus Trap ────────────────────────────────────────────────────────────────
const dialogRef = ref<HTMLElement | null>(null);

/** Selector de elementos focusables estándar (WCAG 2.1) */
const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

function trapFocus(e: KeyboardEvent) {
    if (!dialogRef.value || !props.modelValue) return;
    const focusable = Array.from(dialogRef.value.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.key === 'Tab') {
        if (e.shiftKey) {
            // Shift+Tab: si el foco está en el primer elemento, saltar al último
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            // Tab: si el foco está en el último elemento, saltar al primero
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }
}

// Guardar el elemento que tenía el foco antes de abrir el modal
let previouslyFocused: HTMLElement | null = null;

watch(() => props.modelValue, (isOpen) => {
    if (typeof document === 'undefined') return;

    if (isOpen) {
        document.body.style.overflow = 'hidden';
        previouslyFocused = document.activeElement as HTMLElement;
        // Defer el foco al primer elemento focusable del diálogo
        setTimeout(() => {
            const focusable = dialogRef.value?.querySelector<HTMLElement>(FOCUSABLE);
            focusable?.focus();
        }, 50);
    } else {
        document.body.style.overflow = '';
        // Devolver el foco al elemento que lo tenía antes de abrir
        previouslyFocused?.focus();
        previouslyFocused = null;
    }
});

// Cerrar el modal
const close = () => {
    emit('update:modelValue', false);
    emit('close');
};

// Cierre mediante tecla ESC
const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.modelValue) {
        close();
    }
    trapFocus(e);
};

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
            <div
                v-if="modelValue"
                ref="dialogRef"
                class="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6"
                role="dialog"
                aria-modal="true"
                :aria-labelledby="title ? 'tmodal-title' : undefined"
            >
                <!-- Backdrop (Fondo Oscurecido / Blur) con listener para cerrar al hacer clic fuera -->
                <div 
                    class="absolute inset-0 bg-panel-base/80 backdrop-blur-sm transition-opacity" 
                    @click="close"
                ></div>

                <!-- Ventana Modal -->
                <div class="relative bg-panel-card border-2 border-white/10 rounded-3xl shadow-warm w-full flex flex-col flex-none max-h-full overflow-hidden transform transition-all backdrop-blur-xl" :class="maxWidthClass">
                    
                    <!-- Header -->
                    <div class="flex items-center justify-between p-4 border-b-2 border-white/10 shrink-0">
                        <h3 id="tmodal-title" class="text-ink-main text-sm font-black uppercase tracking-widest">{{ title }}</h3>
                        <button 
                            @click="close"
                            class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/20 border-2 border-transparent hover:border-white/10 flex items-center justify-center text-ink-muted hover:text-white transition-all active:scale-95"
                            :aria-label="t('common.closeModal')"
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
