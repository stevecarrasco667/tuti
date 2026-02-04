<script setup lang="ts">


interface Rival {
    id: string;
    name: string;
    avatar: string;
    filledCount: number;
    totalCategories: number;
    isFinished: boolean;
    isActive: boolean;
    isConnected: boolean;
}

defineProps<{
    rivals: Rival[];
}>();
</script>

<template>
    <div class="flex flex-wrap items-center justify-center gap-6 mb-6 w-full max-w-6xl mx-auto z-10 lg:flex-col lg:h-full lg:w-full lg:justify-start lg:gap-4 lg:bg-indigo-950/30 lg:p-4 lg:rounded-2xl lg:mb-0 lg:border lg:border-white/5">
        <h3 class="hidden lg:block text-xs font-bold text-white/50 w-full uppercase tracking-wider mb-2">Rivales</h3>
        
        <div v-for="rival in rivals" :key="rival.id" 
             class="flex flex-col lg:flex-row items-center gap-1 lg:gap-3 group transition-all duration-500 lg:w-full"
             :class="{'opacity-50 grayscale': !rival.isConnected}"
        >
            <!-- Avatar -->
            <div class="relative transition-transform group-hover:scale-110 flex-shrink-0">
                 <div class="w-16 h-16 lg:w-12 lg:h-12 rounded-full bg-gradient-to-b from-indigo-500 to-indigo-700 border-2 border-white/20 flex items-center justify-center text-3xl lg:text-xl shadow-xl relative z-10">
                    {{ rival.isConnected ? (rival.avatar || '👤') : '🔌' }}
                </div>
                <!-- Status Ring -->
                 <div v-if="rival.isActive && rival.isConnected" class="absolute inset-0 rounded-full border-2 border-yellow-400/50 animate-pulse"></div>
            </div>
            
            <div class="flex flex-col items-center lg:items-start">
                 <!-- Name (Desktop Only) -->
                <span class="hidden lg:block text-sm font-bold text-white truncate max-w-[120px]">{{ rival.name }}</span>

                <!-- Progress Badge -->
                <div class="bg-black/40 backdrop-blur-md px-3 py-1 lg:py-0.5 lg:px-2 rounded-full border border-white/10 text-xs font-mono font-bold text-white shadow-lg flex items-center gap-1">
                    <span :class="rival.isFinished ? 'text-green-400' : 'text-yellow-400'">{{ rival.filledCount }}</span>
                    <span class="text-white/40">/</span>
                    <span class="text-white/60">{{ rival.totalCategories }}</span>
                </div>
            </div>
        </div>
    </div>
</template>
