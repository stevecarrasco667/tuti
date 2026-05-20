<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { CategoryRef } from '../../../../shared/types';

const { t } = useI18n();

const props = defineProps<{
    categories: CategoryRef[];
    modelValue: Record<string, string>;
    currentLetter: string | null;
    rivalsActivity: Array<{
        id: string;
        name: string;
        avatar: string;
        filledCount: number;
        totalCategories: number;
        isFinished: boolean;
        isActive: boolean;
    }>;
    isBlocked?: boolean;
    isSpectator?: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: Record<string, string>): void;
    (e: 'input-focus', event: Event): void;
    (e: 'input-change', category: string, event: Event): void
}>();

const handleInput = (category: string, event: Event) => {
    emit('input-change', category, event);
};

// --- SMART GRID LOGIC ---
// Adapts column count dynamically based on number of categories
const gridClass = computed(() => {
    const n = props.categories.length;
    if (n <= 2) return 'grid-cols-1 sm:grid-cols-2';
    if (n === 3) return 'grid-cols-1 sm:grid-cols-3';
    if (n === 4) return 'grid-cols-2 sm:grid-cols-4';
    if (n <= 6)  return 'grid-cols-2 sm:grid-cols-3';
    if (n <= 8)  return 'grid-cols-2 sm:grid-cols-4';
    return             'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5'; // 9-10
});

// Altura de cada input: inversamente proporcional al conteo de categorías
// Con pocas categorías el input es alto y cómodo; con muchas es compacto
const inputHeightClass = computed(() => {
    const n = props.categories.length;
    if (n <= 2) return 'h-24';   // 2 cat
    if (n === 3) return 'h-20';  // 3 cat
    if (n === 4) return 'h-16';  // 4 cat
    if (n <= 6)  return 'h-14';  // 5-6 cat
    if (n <= 8)  return 'h-12';  // 7-8 cat
    return              'h-11';  // 9-10 cat — min-h-[44px] garantizado
});

// Fuente del input: escala igual que la altura
const inputTextClass = computed(() => {
    const n = props.categories.length;
    if (n <= 2) return 'text-3xl';
    if (n === 3) return 'text-2xl';
    if (n === 4) return 'text-2xl';
    if (n <= 6)  return 'text-xl';
    if (n <= 8)  return 'text-base';
    return              'text-sm';
});

// --- KEYBOARD NAVIGATION ---
const inputElements = ref<(HTMLInputElement | null)[]>([]);

const setInputRef = (el: any, index: number) => {
    if (el) inputElements.value[index] = el as HTMLInputElement;
};

const handleNextFocus = (currentIndex: number) => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < props.categories.length) {
        inputElements.value[nextIndex]?.focus();
    } else {
        // Last element: just blur for now to close keyboard on mobile
        inputElements.value[currentIndex]?.blur();
    }
};

// --- SMART GRID LOGIC ---
</script>

<template>
    <!-- FASE 1: flex-col justify-center min-h-full para centrado vertical real -->
    <div class="w-full max-w-[95%] xl:max-w-7xl mx-auto flex flex-col justify-center min-h-full transition-all duration-500 ease-out">
        
        <div class="bg-panel-base/30 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(15,14,45,0.47)] overflow-hidden relative transition-all duration-300">
            
            <!-- FASE 2: padding reducido, grid adaptativo por gridClass computed -->
            <div class="p-4 md:p-5">
                <div class="grid gap-3 md:gap-4 items-start" :class="gridClass">
                    <div v-for="(category, index) in categories" :key="category.id" class="group">
                        <!-- Soft-Pop: label como burbuja sutil encima del input -->
                        <label
                            :title="t(`categories.${category.id}`) || category.name"
                            class="inline-block font-heading font-black text-[10px] uppercase tracking-widest px-3 py-1 mb-2
                                   bg-gradient-to-r from-tuti-teal/20 to-tuti-teal/5 text-tuti-teal border border-tuti-teal/30 rounded-full cursor-default truncate max-w-full shadow-[0_2px_8px_rgba(45,212,191,0.05)]"
                        >
                            {{ t(`categories.${category.id}`, category.name) }}
                        </label>
                        <div class="relative">
                            <!-- Soft-Pop input: fondo crema suave, sombra interior, sin bordes negros -->
                            <input 
                                :value="modelValue[category.name]"
                                @input="handleInput(category.name, $event)"
                                @focus="$emit('input-focus', $event)"
                                @keydown.enter.prevent="handleNextFocus(index)"
                                :ref="(el) => setInputRef(el, index)"
                                type="text"
                                autocomplete="off"
                                class="w-full px-5 py-2.5 rounded-2xl bg-[#2dd4bf]/10 text-ink-main placeholder-ink-muted/30 font-heading font-black border-2 border-[#2dd4bf]/25 outline-none transition-all duration-300 focus:border-tuti-teal focus:shadow-[0_0_15px_rgba(45,212,191,0.35),_inset_0_2px_8px_rgba(0,0,0,0.5)] disabled:cursor-not-allowed"
                                :class="[
                                    inputHeightClass, 
                                    inputTextClass,
                                    isSpectator ? 'opacity-60 grayscale' : 'disabled:opacity-50'
                                ]"
                                :placeholder="(currentLetter || '') + '...'"
                                :disabled="isBlocked || isSpectator"
                                :tabindex="isSpectator ? -1 : 0"
                            >
                            <!-- Indicador de completado — checkmark verde con animación de rebote y neon glow -->
                            <div v-if="modelValue[category.name]?.trim().length > 0"
                                 class="absolute right-4 top-1/2 -translate-y-1/2
                                        flex items-center justify-center w-6 h-6 rounded-full 
                                        bg-[#34d399] text-[#0f0e2d] text-xs font-black shadow-[0_0_12px_rgba(52,211,153,0.6)]
                                        pointer-events-none transition-all duration-300 animate-bounce">
                                 ✓
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
