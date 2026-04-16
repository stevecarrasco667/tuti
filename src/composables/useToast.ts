import { ref } from 'vue';

export interface ToastMessage {
    id: number;
    text: string;
    type: 'info' | 'error' | 'success';
}

const toasts = ref<ToastMessage[]>([]);
// [Bug Fix] Deduplication: track recently shown toast texts to suppress identical
// toasts fired within 800ms (defense-in-depth against any remaining race conditions
// e.g. double socket listeners, double Vue watchers, or rapid server retries).
const recentTexts = new Map<string, number>();

export function useToast() {
    const addToast = (text: string, type: ToastMessage['type'] = 'info') => {
        // Suppress duplicate toast if same text was shown less than 800ms ago
        const lastShown = recentTexts.get(text);
        if (lastShown && Date.now() - lastShown < 800) return;
        recentTexts.set(text, Date.now());
        // Clean up the dedup entry after the window expires
        setTimeout(() => recentTexts.delete(text), 800);

        const id = Date.now();
        toasts.value.push({ id, text, type });
        setTimeout(() => {
            toasts.value = toasts.value.filter(t => t.id !== id);
        }, 3000); // 3 second duration
    };

    return {
        toasts,
        addToast
    };
}
