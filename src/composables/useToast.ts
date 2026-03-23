import { ref } from 'vue';

export interface ToastMessage {
    id: number;
    text: string;
    type: 'info' | 'error' | 'success';
}

const toasts = ref<ToastMessage[]>([]);

export function useToast() {
    const addToast = (text: string, type: ToastMessage['type'] = 'info') => {
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
