<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { setLanguage, type SupportedLanguage } from '../../i18n';

const props = defineProps<{
    inline?: boolean;
}>();

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
    <div ref="containerRef" :class="props.inline ? 'relative' : 'fixed top-20 right-4 z-[100]'">
        <button 
            @click="toggleDropdown"
            class="flex items-center justify-center transition-all active:scale-95 group"
            :class="[
                props.inline 
                    ? 'w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10' 
                    : 'w-12 h-12 rounded-2xl bg-panel-card/80 backdrop-blur-md border-[3px] border-white/10 shadow-xl hover:bg-white/10',
                isOpen ? 'border-action-primary bg-panel-card' : ''
            ]"
            title="Seleccionar Idioma / Select Language"
        >
            <img 
                src="/languages.png" 
                alt="Idiomas" 
                class="object-contain transition-transform duration-200 group-hover:scale-110 rounded-full select-none"
                :class="props.inline ? 'w-5 h-5' : 'w-7 h-7'"
            />
            <span 
                class="absolute flex items-center justify-center bg-panel-base border border-white/10 rounded-full drop-shadow-md z-10 font-bold"
                :class="props.inline 
                    ? '-bottom-1 -right-1 text-[8px] w-5 h-5' 
                    : '-bottom-1.5 -right-1.5 text-[10px] w-6 h-6'"
            >
                {{ languages.find(l => l.code === currentLang)?.flag }}
            </span>
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
            <div 
                v-if="isOpen" 
                class="absolute p-1.5 bg-panel-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col gap-1"
                :class="props.inline 
                    ? 'bottom-12 left-0 w-40 origin-bottom-left z-50' 
                    : 'top-14 right-0 w-40 sm:w-48 mt-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)] border-[3px] origin-top-right'"
            >
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
