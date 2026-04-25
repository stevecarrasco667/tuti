import { createI18n } from 'vue-i18n';

export type SupportedLanguage = 'es' | 'en' | 'pt';

// Load default language from localStorage or navigator
export function detectLanguage(): SupportedLanguage {
    if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem('tuti-lang');
        if (cached === 'es' || cached === 'en' || cached === 'pt') {
            return cached;
        }
    }

    if (typeof navigator !== 'undefined') {
        const navLang = navigator.language.toLowerCase();
        if (navLang.startsWith('es')) return 'es';
        if (navLang.startsWith('pt')) return 'pt';
    }

    // Fallback to English for any other language
    return 'en';
}

const currentLanguage = detectLanguage();

export const i18n = createI18n({
    legacy: false,
    locale: currentLanguage,
    fallbackLocale: 'en',
    // Start with empty messages — all locales are loaded via setLanguage() below.
    messages: {}
});

// Dynamic locale loader — single code path for ALL locales (no dual static+dynamic warning)
const loadedLocales: string[] = [];

export async function setLanguage(lang: SupportedLanguage) {
    if (!loadedLocales.includes(lang)) {
        try {
            const messages = await import(`./locales/${lang}.json`);
            i18n.global.setLocaleMessage(lang, messages.default);
            loadedLocales.push(lang);
        } catch (e) {
            console.error(`[i18n] Failed to load locale ${lang}`, e);
            return;
        }
    }

    i18n.global.locale.value = lang;
    if (typeof window !== 'undefined') {
        localStorage.setItem('tuti-lang', lang);
        document.querySelector('html')?.setAttribute('lang', lang);
    }
}

// Eagerly load the detected language at module initialisation.
// Using the async path keeps es.json in its own chunk (no dual-import warning).
setLanguage(currentLanguage);

