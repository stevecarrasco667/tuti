<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useActiveReactions } from '../../composables/useActiveReactions';
import { useProfile, STORE_ITEMS } from '../../composables/useProfile';

const { sendReaction } = useActiveReactions();
const { unlockedFrames } = useProfile();

const isOpen = ref(false);
const wheelRef = ref<HTMLElement | null>(null);

const DEFAULT_EMOJIS = ['😂', '💀', '🤡', '❤️', '👍', '🔥', '🎉', '💩'];

// Filter unlocked premium emojis from the catalog
const unlockedPremiumEmojis = computed(() => {
    return STORE_ITEMS.value.filter(
        item => item.type === 'EMOJI' && unlockedFrames.value.includes(item.id)
    );
});

const toggleOpen = () => {
    isOpen.value = !isOpen.value;
};

const handleSelectEmoji = (emoji: string) => {
    sendReaction(emoji);
    // Keep it open for combos, but auto-close after a delay
    scheduleAutoClose();
};

const handleSelectPremium = (id: string, url?: string) => {
    sendReaction(id, url);
    scheduleAutoClose();
};

// Auto close handling
let autoCloseTimer: ReturnType<typeof setTimeout> | null = null;
const scheduleAutoClose = () => {
    if (autoCloseTimer) clearTimeout(autoCloseTimer);
    autoCloseTimer = setTimeout(() => {
        isOpen.value = false;
    }, 2500); // closes after 2.5s of inactivity
};

const cancelAutoClose = () => {
    if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        autoCloseTimer = null;
    }
};

// Close when clicking outside
const handleClickOutside = (event: MouseEvent) => {
    if (wheelRef.value && !wheelRef.value.contains(event.target as Node)) {
        isOpen.value = false;
    }
};

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
    if (autoCloseTimer) clearTimeout(autoCloseTimer);
});
</script>

<template>
    <div ref="wheelRef" class="fixed bottom-24 right-4 md:right-8 z-50 flex flex-col items-end gap-3 select-none">
        
        <!-- Reactions Popover Dock -->
        <Transition name="dock-fade">
            <div 
                v-if="isOpen" 
                @mouseenter="cancelAutoClose"
                @mouseleave="scheduleAutoClose"
                class="bg-[#0f0e2d]/90 backdrop-blur-xl border border-white/10 p-3.5 rounded-3xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] flex flex-col gap-3 min-w-[200px] max-w-[280px]"
            >
                <!-- Default Emojis Section -->
                <div>
                    <span class="text-[8px] font-black uppercase text-white/40 tracking-widest block mb-2 px-1">Reacciones Gratis</span>
                    <div class="grid grid-cols-4 gap-2">
                        <button 
                            v-for="em in DEFAULT_EMOJIS" 
                            :key="em"
                            @click="handleSelectEmoji(em)"
                            class="w-10 h-10 rounded-full hover:bg-white/10 active:scale-90 transition-all text-xl flex items-center justify-center cursor-pointer"
                        >
                            {{ em }}
                        </button>
                    </div>
                </div>

                <!-- Premium Emojis Section -->
                <div v-if="unlockedPremiumEmojis.length > 0">
                    <div class="w-full h-[1px] bg-white/15 my-1"></div>
                    <span class="text-[8px] font-black uppercase text-game-yellow tracking-widest block mb-2 px-1 flex items-center gap-1">
                        ✨ Emojis Premium
                    </span>
                    <div class="grid grid-cols-4 gap-2">
                        <button 
                            v-for="item in unlockedPremiumEmojis" 
                            :key="item.id"
                            @click="handleSelectPremium(item.id, item.metadata?.url)"
                            class="w-10 h-10 rounded-full hover:bg-white/10 border border-white/5 bg-white/5 active:scale-90 transition-all flex items-center justify-center cursor-pointer overflow-hidden p-1"
                            :title="item.name"
                        >
                            <img v-if="item.metadata?.url" :src="item.metadata.url" class="w-full h-full object-contain" alt="premium emoji" />
                            <span v-else class="text-xl">🤯</span>
                        </button>
                    </div>
                </div>
                
                <!-- If no premium unlocked, show tip -->
                <div v-else class="text-center pt-1">
                    <div class="w-full h-[1px] bg-white/10 my-1"></div>
                    <span class="text-[7px] font-bold text-white/30 uppercase tracking-wider block">
                        Compra emojis premium en la tienda 🛍️
                    </span>
                </div>
            </div>
        </Transition>

        <!-- Floating Trigger Button -->
        <button 
            @click="toggleOpen"
            class="w-12 h-12 rounded-full border border-white/10 bg-[#0f0e2d]/65 hover:bg-[#0f0e2d]/85 text-white flex items-center justify-center text-xl cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_32px_rgba(168,85,247,0.3)] active:scale-95 transition-all relative group overflow-hidden"
            :class="{ 'border-purple-500/50 bg-[#0f0e2d]/90': isOpen }"
            title="Enviar reacción"
        >
            <!-- Pulse Glow effect -->
            <span class="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            
            <!-- Animated Icon -->
            <span v-if="!isOpen" class="transform group-hover:rotate-12 transition-transform duration-300">🎭</span>
            <span v-else class="text-sm font-black text-white">✕</span>
        </button>
    </div>
</template>

<style scoped>
.dock-fade-enter-active, .dock-fade-leave-active {
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dock-fade-enter-from, .dock-fade-leave-to {
    opacity: 0;
    transform: scale(0.85) translateY(10px);
}
</style>
