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
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: Record<string, string>): void;
    (e: 'input-focus', event: Event): void;
    (e: 'input-change', category: string, event: Event): void
}>();

const handleInput = (category: string, event: Event) => {
    emit('input-change', category, event);
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
        
        <div class="bg-indigo-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_0_40px_-10px_rgba(139,92,246,0.3)] overflow-hidden relative transition-all">
            
            <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fuchsia-500 via-yellow-400 to-fuchsia-500 opacity-70"></div>

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
                    <div v-for="category in categories" :key="category" class="group">
                        <label class="block font-bold text-indigo-200 mb-1.5 transition-colors group-focus-within:text-yellow-400 truncate tracking-wide text-sm md:text-xs uppercase">
                            {{ category }}
                        </label>
                        <div class="relative">
                            <input 
                                :value="modelValue[category]"
                                @input="handleInput(category, $event)"
                                @focus="$emit('input-focus', $event)"
                                @keydown.enter.prevent
                                type="text"
                                autocomplete="off"
                                class="w-full bg-black/20 border-b-2 border-white/10 text-white rounded-t-lg focus:bg-black/40 focus:border-yellow-400 focus:shadow-[0_4px_15px_-5px_rgba(250,204,21,0.4)] outline-none transition-all placeholder-white/10 font-medium h-14 md:h-12 py-3 md:py-2 px-3 text-2xl md:text-lg"
                                :placeholder="(currentLetter || '') + '...'"
                            >
                            <div v-if="modelValue[category]?.trim().length > 0" class="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)] pointer-events-none"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- KEYBOARD SPACER -->
        <div :style="{ height: keyboardHeight + 'px' }" class="transition-all duration-300 pointer-events-none w-full"></div>
    </div>
</template>
