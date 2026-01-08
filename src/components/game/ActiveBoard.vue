<script setup lang="ts">


const props = defineProps<{
    categories: string[];
    modelValue: Record<string, string>;
    currentLetter: string | null;
    boardConfig: {
        containerMaxWidth: string;
        gridCols: string;
        inputSize: string;
        labelSize: string;
    };
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

// Helper to handle input changes and emit updates
const handleInput = (category: string, event: Event) => {
    emit('input-change', category, event);
};
</script>

<template>
    <div class="w-full transition-all duration-500 ease-out" :class="boardConfig.containerMaxWidth">
                
        <!-- THE ELECTRIC BOARD -->
        <div class="bg-indigo-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_0_40px_-10px_rgba(139,92,246,0.3)] overflow-hidden relative transition-all">
            
            <!-- Board Header / Decoration -->
            <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fuchsia-500 via-yellow-400 to-fuchsia-500 opacity-70"></div>

            <!-- Rivals HUD (Numeric Badges) -->
                <div v-if="rivalsActivity.length > 0" class="bg-black/30 border-b border-white/5 px-4 py-3 flex items-center justify-center gap-4 overflow-x-auto scrollbar-hide">
                    <div v-for="rival in rivalsActivity" :key="rival.id" 
                        class="flex items-center gap-2 opacity-90 transition-opacity"
                        :title="rival.name"
                >
                    <div class="relative">
                        <span class="text-2xl filter drop-shadow">{{ rival.avatar || '👤' }}</span>
                        <div v-if="rival.isFinished" class="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-black"></div>
                    </div>
                    <!-- Yellow Badge -->
                    <div class="bg-indigo-600/50 px-2 py-0.5 rounded-md border border-white/10 text-yellow-400 font-mono text-xs font-bold shadow-sm">
                        {{ rival.filledCount }}/{{ rival.totalCategories }}
                    </div>
                    </div>
                </div>

            <!-- Content Area -->
            <div class="p-5 md:p-8">
                
                <!-- PLAYING: Inputs Grid -->
                <div class="grid gap-4" :class="boardConfig.gridCols">
                    <div v-for="category in categories" :key="category" class="group">
                        <label class="block font-bold text-indigo-200 mb-1.5 transition-colors group-focus-within:text-yellow-400 truncate tracking-wide"
                                :class="boardConfig.labelSize"
                        >
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
                                class="w-full bg-black/20 border-b-2 border-white/10 text-white rounded-t-lg focus:bg-black/40 focus:border-yellow-400 focus:shadow-[0_4px_15px_-5px_rgba(250,204,21,0.4)] outline-none transition-all placeholder-white/10 font-medium"
                                :class="boardConfig.inputSize"
                                :placeholder="(currentLetter || '') + '...'"
                            >
                            <!-- Status Dot (Subtle) -->
                            <div v-if="modelValue[category]?.trim().length > 0" class="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)] pointer-events-none"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
