<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

import type { CategoryRef } from '../../../../shared/types';

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
    if (n <= 2) return 'h-24';   // 2 cat  — muy espacioso
    if (n === 3) return 'h-20';  // 3 cat
    if (n === 4) return 'h-16';  // 4 cat
    if (n <= 6)  return 'h-14';  // 5-6 cat
    if (n <= 8)  return 'h-11';  // 7-8 cat
    return              'h-9';   // 9-10 cat — compacto
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
        
        <div class="bg-panel-base border-[3px] border-white/50 rounded-3xl shadow-game-panel overflow-hidden relative transition-all">
            
            <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-action-primary via-action-accent to-action-primary opacity-90"></div>

            <!-- FASE 2: padding reducido, grid adaptativo por gridClass computed -->
            <div class="p-4 md:p-5">
                <div class="grid gap-3 md:gap-4 items-start" :class="gridClass">
                    <div v-for="(category, index) in categories" :key="category.id" class="group">
                        <!-- FASE 4: title tooltip para labels largas -->
                        <label
                            :title="category.name"
                            class="block font-black text-ink-soft mb-1.5 transition-colors group-focus-within:text-action-blue truncate tracking-widest text-xs uppercase cursor-default"
                        >
                            {{ category.name }}
                        </label>
                        <div class="relative">
                            <input 
                                :value="modelValue[category.name]"
                                @input="handleInput(category.name, $event)"
                                @focus="$emit('input-focus', $event)"
                                @keydown.enter.prevent="handleNextFocus(index)"
                                :ref="(el) => setInputRef(el, index)"
                                type="text"
                                autocomplete="off"
                                class="w-full bg-panel-input border-[3px] border-white/10 text-ink-main rounded-xl focus:bg-panel-input focus:border-action-primary focus:shadow-[0_0_0_4px_rgba(217,119,6,0.2)] outline-none transition-all placeholder-ink-muted/50 font-black py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
                                :class="[inputHeightClass, inputTextClass]"
                                :placeholder="(currentLetter || '') + '...'"
                                :disabled="isBlocked"
                            >
                            <!-- Filled indicator dot -->
                            <div v-if="modelValue[category.name]?.trim().length > 0"
                                 class="absolute right-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-action-primary shadow-[0_0_8px_rgba(46,204,113,0.8)] pointer-events-none">
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
