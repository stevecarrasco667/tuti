import { ref } from 'vue';

export interface ToastMessage {
    id: number;
    text: string;
    type: 'info' | 'error' | 'success';
}

const toasts = ref<ToastMessage[]>([]);

// Deduplication: track recently shown messages to prevent duplicates in rapid succession
const recentMessages = new Map<string, number>();
const DEDUP_WINDOW_MS = 1500;

export function useToast() {
    const addToast = (text: string, type: ToastMessage['type'] = 'info') => {
        const key = `${type}:${text}`;
        const lastShown = recentMessages.get(key);
        if (lastShown && Date.now() - lastShown < DEDUP_WINDOW_MS) {
            return; // Duplicate — silently discard
        }
        recentMessages.set(key, Date.now());

        const id = Date.now();
        toasts.value.push({ id, text, type });
        setTimeout(() => {
            toasts.value = toasts.value.filter(t => t.id !== id);
            recentMessages.delete(key);
        }, 3000);
    };

    return {
        toasts,
        addToast
    };
}
