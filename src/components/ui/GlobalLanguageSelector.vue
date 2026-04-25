<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { setLanguage, type SupportedLanguage } from '../../i18n';

const { locale } = useI18n();

const languages: { code: SupportedLanguage, flag: string, label: string }[] = [
    { code: 'es', flag: '🇪🇸', label: 'ES' },
    { code: 'en', flag: '🇬🇧', label: 'EN' },
    { code: 'pt', flag: '🇧🇷', label: 'PT' }
];

const currentLang = computed(() => locale.value as SupportedLanguage);

const handleLangSelect = (code: SupportedLanguage) => {
    setLanguage(code);
};
</script>

<template>
    <div class="fixed top-4 left-4 z-50 flex gap-1.5 p-1.5 bg-panel-card/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg">
        <button 
            v-for="lang in languages" 
            :key="lang.code"
            @click="handleLangSelect(lang.code)"
            class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all active:scale-90"
            :class="[
                currentLang === lang.code 
                    ? 'bg-action-primary text-white shadow-md shadow-action-primary/30' 
                    : 'bg-transparent text-ink-muted hover:bg-white/5 hover:text-ink-main'
            ]"
            :title="lang.label"
        >
            {{ lang.flag }}
        </button>
    </div>
</template>
