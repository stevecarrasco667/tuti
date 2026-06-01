<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { setLanguage, type SupportedLanguage } from '../../i18n';

const { locale } = useI18n();

const languages: { code: SupportedLanguage, flag: string, label: string }[] = [
    { code: 'es', flag: '🇪🇸', label: 'Español' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'pt', flag: '🇧🇷', label: 'Português' }
];

const currentLang = computed(() => locale.value as SupportedLanguage);
const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const handleLangSelect = (code: SupportedLanguage) => {
    setLanguage(code);
    isOpen.value = false;
};

const toggleDropdown = () => {
    isOpen.value = !isOpen.value;
};

const handleClickOutside = (event: MouseEvent) => {
    if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
        isOpen.value = false;
    }
};

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
    <div ref="containerRef" class="fixed top-20 right-4 z-[100]">
        <!-- Botón Principal -->
        <button 
            @click="toggleDropdown"
            class="w-12 h-12 flex items-center justify-center rounded-2xl bg-panel-card/80 backdrop-blur-md border-[3px] border-white/10 shadow-xl transition-all hover:bg-white/10 active:scale-95 group"
            :class="isOpen ? 'border-action-primary bg-panel-card' : ''"
            title="Seleccionar Idioma / Select Language"
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" class="w-5.5 h-5.5 text-ink-main group-hover:text-white transition-colors">
                <!-- Speech bubble outline with bottom-right tail -->
                <path d="M3 11.5c0-4.694 3.806-8.5 8.5-8.5 4.694 0 8.5 3.806 8.5 8.5 0 1.637-.463 3.167-1.265 4.464L20.5 21l-5.036-1.765A8.455 8.455 0 0111.5 20c-4.694 0-8.5-3.806-8.5-8.5z" />
                <!-- Grid globe lines representing translate/languages -->
                <circle cx="11.5" cy="11.5" r="5" />
                <line x1="11.5" y1="6.5" x2="11.5" y2="16.5" />
                <line x1="6.5" y1="11.5" x2="16.5" y2="11.5" />
                <path d="M11.5 6.5c1.8 1.2 2.8 2.8 2.8 5s-1 3.8-2.8 5c-1.8-1.2-2.8-2.8-2.8-5s1-3.8 2.8-5z" />
            </svg>
            <span class="absolute -bottom-1.5 -right-1.5 text-[10px] w-6 h-6 flex items-center justify-center bg-panel-base border-[2px] border-white/10 rounded-full drop-shadow-md z-10">{{ languages.find(l => l.code === currentLang)?.flag }}</span>
        </button>

        <!-- Dropdown Menu -->
        <Transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0 -translate-y-2 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 -translate-y-2 scale-95"
        >
            <div v-if="isOpen" class="absolute top-14 right-0 w-40 sm:w-48 mt-2 p-1.5 bg-panel-card/95 backdrop-blur-xl border-[3px] border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] origin-top-right flex flex-col gap-1">
                <button
                    v-for="lang in languages"
                    :key="lang.code"
                    @click="handleLangSelect(lang.code)"
                    class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] sm:text-xs tracking-wider transition-all"
                    :class="[
                        currentLang === lang.code
                            ? 'bg-action-primary/20 text-white border border-action-primary/30 shadow-inner'
                            : 'bg-transparent text-ink-muted hover:bg-white/5 hover:text-white border border-transparent'
                    ]"
                >
                    <span class="text-lg sm:text-xl drop-shadow-sm">{{ lang.flag }}</span>
                    <span class="flex-1 text-left">{{ lang.label }}</span>
                    
                    <svg v-if="currentLang === lang.code" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-action-primary shrink-0 drop-shadow-[0_0_5px_rgba(106,215,229,0.8)]">
                        <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        </Transition>
    </div>
</template>
