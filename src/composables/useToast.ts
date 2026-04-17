import { ref } from 'vue';

// [Sprint H4 — FE-2] Unified toast type covers both the global system (info/error/success)
// and the in-game session toasts (join/leave/stop-warning) that previously lived in useGameEffects.
// A single system means a single renderer in App.vue — no more dual overlapping toast stacks.
export interface ToastMessage {
    id: number;
    text: string;
    type: 'info' | 'error' | 'success' | 'join' | 'leave' | 'stop-warning';
    groupId?: string; // Deduplication key for in-game events (join/leave floods)
}

const toasts = ref<ToastMessage[]>([]);

// Deduplication: track recently shown messages to prevent duplicates in rapid succession
const recentMessages = new Map<string, number>();
const DEDUP_WINDOW_MS = 1500;

export function useToast() {
    const addToast = (
        text: string,
        type: ToastMessage['type'] = 'info',
        groupId?: string
    ) => {
        // Group-based deduplication: for join/leave/stop-warning, suppress if same groupId exists
        if (groupId) {
            const alreadyShown = toasts.value.some(t => t.groupId === groupId);
            if (alreadyShown) return;
        }

        // Key-based deduplication: suppress rapid identical messages (existing behaviour)
        const key = `${type}:${text}`;
        const lastShown = recentMessages.get(key);
        if (lastShown && Date.now() - lastShown < DEDUP_WINDOW_MS) {
            return; // Duplicate — silently discard
        }
        recentMessages.set(key, Date.now());

        const id = Date.now();
        toasts.value.push({ id, text, type, groupId });
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
