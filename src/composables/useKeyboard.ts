import { ref, onMounted, onUnmounted } from 'vue';

export function useKeyboard() {
    // Default to a safe fallback (100dvh in CSS handles the initial state)
    // We only rely on this dynamically if visualViewport is supported.
    const viewportHeight = ref(window.innerHeight);
    const keyboardHeight = ref(0);

    const updateHeights = () => {
        if (window.visualViewport) {
            viewportHeight.value = window.visualViewport.height;
            keyboardHeight.value = Math.max(0, window.innerHeight - window.visualViewport.height);
        } else {
            viewportHeight.value = window.innerHeight;
        }
    };

    onMounted(() => {
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateHeights);
            window.visualViewport.addEventListener('scroll', updateHeights);
        } else {
            window.addEventListener('resize', updateHeights);
        }
        updateHeights();
    });

    onUnmounted(() => {
        if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', updateHeights);
            window.visualViewport.removeEventListener('scroll', updateHeights);
        } else {
            window.removeEventListener('resize', updateHeights);
        }
    });

    return { viewportHeight, keyboardHeight };
}
