import { ref, watch } from 'vue';

const sfxEnabled = ref(localStorage.getItem('tuti-settings-sfx') !== 'false');
const bgmEnabled = ref(localStorage.getItem('tuti-settings-bgm') !== 'false');
const vibrationEnabled = ref(localStorage.getItem('tuti-settings-vibration') !== 'false');
const bgAnimationsEnabled = ref(localStorage.getItem('tuti-settings-bg-animations') !== 'false');
const autoFocusEnabled = ref(localStorage.getItem('tuti-settings-autofocus') !== 'false');
const particlesEnabled = ref(localStorage.getItem('tuti-settings-particles') !== 'false');
const colorblindMode = ref(localStorage.getItem('tuti-settings-colorblind') === 'true');
const largeTextEnabled = ref(localStorage.getItem('tuti-settings-largetext') === 'true');

export function useAppSettings() {
    watch(sfxEnabled, (val) => localStorage.setItem('tuti-settings-sfx', String(val)));
    watch(bgmEnabled, (val) => localStorage.setItem('tuti-settings-bgm', String(val)));
    watch(vibrationEnabled, (val) => localStorage.setItem('tuti-settings-vibration', String(val)));
    
    watch(bgAnimationsEnabled, (val) => {
        localStorage.setItem('tuti-settings-bg-animations', String(val));
        applyAnimationsState(val);
    });
    
    watch(autoFocusEnabled, (val) => localStorage.setItem('tuti-settings-autofocus', String(val)));
    watch(particlesEnabled, (val) => localStorage.setItem('tuti-settings-particles', String(val)));
    
    watch(colorblindMode, (val) => {
        localStorage.setItem('tuti-settings-colorblind', String(val));
        applyColorblindState(val);
    });

    watch(largeTextEnabled, (val) => {
        localStorage.setItem('tuti-settings-largetext', String(val));
        applyLargeTextState(val);
    });

    const applyAnimationsState = (enabled: boolean) => {
        if (typeof document !== 'undefined') {
            const body = document.body;
            if (enabled) {
                body.classList.remove('disable-bg-animations');
            } else {
                body.classList.add('disable-bg-animations');
            }
        }
    };

    const applyColorblindState = (enabled: boolean) => {
        if (typeof document !== 'undefined') {
            const html = document.documentElement;
            if (enabled) {
                html.classList.add('colorblind-mode');
            } else {
                html.classList.remove('colorblind-mode');
            }
        }
    };

    const applyLargeTextState = (enabled: boolean) => {
        if (typeof document !== 'undefined') {
            const html = document.documentElement;
            if (enabled) {
                html.classList.add('large-text');
            } else {
                html.classList.remove('large-text');
            }
        }
    };

    // Initial application of classes
    const initSettings = () => {
        if (typeof window !== 'undefined') {
            applyAnimationsState(bgAnimationsEnabled.value);
            applyColorblindState(colorblindMode.value);
            applyLargeTextState(largeTextEnabled.value);
        }
    };

    return {
        sfxEnabled,
        bgmEnabled,
        vibrationEnabled,
        bgAnimationsEnabled,
        autoFocusEnabled,
        particlesEnabled,
        colorblindMode,
        largeTextEnabled,
        initSettings
    };
}
