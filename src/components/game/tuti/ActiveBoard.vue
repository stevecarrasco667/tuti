<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
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

// --- MOBILE KEYBOARD SPACER LOGIC ---
const keyboardHeight = ref(0);

const updateKeyboardHeight = () => {
    if (window.visualViewport) {
        keyboardHeight.value = Math.max(0, window.innerHeight - window.visualViewport.height);
    }
};

onMounted(() => {
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', updateKeyboardHeight);
        window.visualViewport.addEventListener('scroll', updateKeyboardHeight);
    }
});

onUnmounted(() => {
    if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateKeyboardHeight);
        window.visualViewport.removeEventListener('scroll', updateKeyboardHeight);
    }
});
</script>

<template>
    <!-- FASE 1: flex-col justify-center min-h-full para centrado vertical real -->
    <div class="w-full max-w-[95%] xl:max-w-7xl mx-auto flex flex-col justify-center min-h-full transition-all duration-500 ease-out">
        
        <!-- [FE-3] Panel del tablero: borde negro sólido + sombra hard -->
        <div class="bg-panel-card border-3 border-game-black/80 shadow-hard rounded-2xl overflow-hidden relative transition-all duration-300">

            <!-- [FE-3.4] Barra de progreso superior: amarillo → verde -->
            <div class="h-2 w-full bg-panel-base/50"
                 style="background: linear-gradient(to right, #5A1488 var(--prog), #5A1488 var(--prog))">
            </div>

            <!-- FASE 2: padding reducido, grid adaptativo por gridClass computed -->
            <div class="p-4 md:p-5">
                <div class="grid gap-3 md:gap-4 items-start" :class="gridClass">
                    <div v-for="(category, index) in categories" :key="category.id" class="group">
                        <!-- [FE-3.2] Label de categoría: badge tipo sticker amarillo -->
                        <label
                            :title="t(`categories.${category.id}`) || category.name"
                            class="inline-block mb-2 nb-badge-yellow truncate max-w-full cursor-default"
                            style="transform: rotate(-0.5deg);"
                        >
                            {{ t(`categories.${category.id}`, category.name) }}
                        </label>
                        <div class="relative">
                            <!-- [FE-3.1] Input blanco con borde negro — máximo contraste -->
                            <input
                                :value="modelValue[category.name]"
                                @input="handleInput(category.name, $event)"
                                @focus="$emit('input-focus', $event)"
                                @keydown.enter.prevent="handleNextFocus(index)"
                                :ref="(el) => setInputRef(el, index)"
                                type="text"
                                autocomplete="off"
                                class="nb-input font-black placeholder-gray-300"
                                :class="[
                                    inputHeightClass,
                                    inputTextClass,
                                    isSpectator ? 'opacity-60 grayscale' : ''
                                ]"
                                :placeholder="(currentLetter || '') + '...'"
                                :disabled="isBlocked || isSpectator"
                                :tabindex="isSpectator ? -1 : 0"
                            >
                            <!-- [FE-3.4] Indicador de completado: punto verde sólido -->
                            <div v-if="modelValue[category.name]?.trim().length > 0"
                                 class="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-game-green border-2 border-game-black shadow-hard-sm pointer-events-none">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- KEYBOARD SPACER -->
        <div :style="{ height: keyboardHeight + 'px' }" class="transition-all duration-300 pointer-events-none w-full"></div>
    </div>
</template>
