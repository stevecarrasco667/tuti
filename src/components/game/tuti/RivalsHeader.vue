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
    isAFK?: boolean;
}

defineProps<{
    rivals: Rival[];
}>();
</script>

<template>
    <div class="flex flex-wrap items-center justify-center gap-6 mb-6 w-full max-w-6xl mx-auto z-10 lg:flex-col lg:h-full lg:w-full lg:justify-start lg:gap-4 lg:bg-panel-base/30 lg:backdrop-blur-2xl lg:p-5 lg:rounded-[2.5rem] lg:mb-0 lg:border lg:border-white/10 lg:shadow-[0_8px_32px_0_rgba(15,14,45,0.47)]">
        <h3 class="hidden lg:block text-xs font-black text-white/40 w-full uppercase tracking-widest mb-2 px-1">Rivales</h3>
        
        <div v-for="rival in rivals" :key="rival.id" 
             class="flex flex-col lg:flex-row items-center gap-1 lg:gap-3 group transition-all duration-500 lg:w-full"
             :class="{
                 'opacity-50 grayscale': !rival.isConnected,
                 'opacity-70 saturate-50': rival.isAFK && rival.isConnected
             }"
        >
            <!-- Avatar -->
            <div class="relative transition-transform group-hover:scale-110 flex-shrink-0">
                <!-- Conic Progress Ring -->
                <div 
                    class="absolute -inset-[4px] rounded-full p-[2px] transition-all duration-500 z-0"
                    :style="{
                        background: rival.isConnected 
                            ? `conic-gradient(#34d399 ${(rival.filledCount / (rival.totalCategories || 1)) * 360}deg, rgba(255,255,255,0.15) 0deg)`
                            : 'rgba(255,255,255,0.05)'
                    }"
                >
                    <!-- Background Mask for the ring -->
                    <div class="w-full h-full rounded-full bg-[#1e1b4b]"></div>
                </div>

                <!-- Active Typing Ping Wave -->
                <div v-if="rival.isActive && rival.isConnected && !rival.isAFK" 
                     class="absolute -inset-[4px] rounded-full border-2 border-tuti-teal animate-ping opacity-30 z-0">
                </div>

                <!-- Main Avatar Circle -->
                <div class="w-16 h-16 lg:w-12 lg:h-12 rounded-full bg-panel-card border-2 border-white/10 flex items-center justify-center text-3xl lg:text-xl shadow-sm relative z-10">
                    {{ rival.isConnected ? (rival.avatar || '👤') : '🔌' }}
                </div>
                
                <!-- AFK Indicator -->
                <div v-if="rival.isAFK && rival.isConnected" class="absolute -top-1 -right-1 z-20 text-[10px] bg-panel-card border border-white/20 rounded-full px-1.5 py-0.5 shadow-sm animate-bounce font-black" title="Ausente">💤</div>
                
                <!-- Active Typing Pencil Badge -->
                <div v-if="rival.isActive && rival.isConnected && !rival.isAFK" 
                     class="absolute -bottom-1 -right-1 z-20 bg-tuti-teal text-[#0f0e2d] rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black shadow-[0_0_10px_rgba(45,212,191,0.6)] animate-bounce"
                     title="Escribiendo...">
                    ✍️
                </div>
            </div>
            
            <div class="flex flex-col items-center lg:items-start">
                 <!-- Name (Desktop Only) -->
                <span class="hidden lg:block text-sm font-black text-ink-main truncate max-w-[120px]">{{ rival.name }}</span>

                <!-- Progress Badge -->
                <div class="bg-black/40 backdrop-blur-md px-3 py-1 lg:py-0.5 lg:px-2 rounded-full border border-white/10 text-xs font-mono font-bold text-white shadow-lg flex items-center gap-1">
                    <span :class="rival.isFinished ? 'text-green-400' : 'text-yellow-400 font-bold'">{{ rival.filledCount }}</span>
                    <span class="text-white/40">/</span>
                    <span class="text-white/60">{{ rival.totalCategories }}</span>
                </div>
            </div>
        </div>
    </div>
</template>
