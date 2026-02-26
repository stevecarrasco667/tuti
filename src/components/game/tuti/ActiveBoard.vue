<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
    categories: string[];
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
        // Height difference between window and viewport = Virtual Keyboard Height
        // const diff = window.innerHeight - window.visualViewport.height;
        // We use Math.max to avoid negative numbers or weird glitches active board might be smaller
        keyboardHeight.value = Math.max(0, window.innerHeight - window.visualViewport.height);
    }
};

onMounted(() => {
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', updateKeyboardHeight);
        window.visualViewport.addEventListener('scroll', updateKeyboardHeight); // Sometimes scroll changes viewport too
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
    <div class="w-full max-w-[95%] xl:max-w-7xl mx-auto transition-all duration-500 ease-out">
        
        <div class="bg-panel-base border-[3px] border-white/50 rounded-3xl shadow-game-panel overflow-hidden relative transition-all">
            
            <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-action-primary via-action-accent to-action-primary opacity-90"></div>

            <!-- Rivals Header REMOVED (Moved to GameView) -->

            <div class="p-5 md:p-8">
                <!-- Smart Grid Logic -->
                <div class="grid gap-4 md:gap-6 items-start"
                     :class="[
                        'grid-cols-1',       // Mobile
                        'md:grid-cols-2',    // Tablet
                        'lg:grid-cols-3',    // Desktop Standard
                        categories.length > 3 ? 'xl:grid-cols-4' : '' // Ultrawide optimization
                     ]"
                >
                    <div v-for="(category, index) in categories" :key="category" class="group">
                        <label class="block font-black text-ink-soft mb-1.5 transition-colors group-focus-within:text-action-blue truncate tracking-widest text-sm md:text-xs uppercase">
                            {{ category }}
                        </label>
                        <div class="relative">
                            <input 
                                :value="modelValue[category]"
                                @input="handleInput(category, $event)"
                                @focus="$emit('input-focus', $event)"
                                @keydown.enter.prevent="handleNextFocus(index)"
                                :ref="(el) => setInputRef(el, index)"
                                type="text"
                                autocomplete="off"
                                class="w-full bg-panel-input border-[3px] border-white text-ink-main rounded-xl focus:bg-white focus:border-action-cyan focus:shadow-[0_0_0_4px_rgba(56,189,248,0.2)] outline-none transition-all placeholder-ink-muted/50 font-black h-14 md:h-12 py-3 md:py-2 px-4 text-2xl md:text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
                                :placeholder="(currentLetter || '') + '...'"
                                :disabled="isBlocked"
                            >
                            <div v-if="modelValue[category]?.trim().length > 0" class="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-action-primary shadow-[0_0_8px_rgba(46,204,113,0.8)] pointer-events-none"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- KEYBOARD SPACER -->
        <div :style="{ height: keyboardHeight + 'px' }" class="transition-all duration-300 pointer-events-none w-full"></div>
    </div>
</template>
