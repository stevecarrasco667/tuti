import { ref, computed } from 'vue';
import { useGame } from './useGame';
import { useRouter } from 'vue-router';

// Estado global persistido fuera de la función de fábrica para mantener la pestaña activa entre montajes
const currentTab = ref<'home' | 'store' | 'profile' | 'history'>('home');

export function useNavigation() {
    const { gameState } = useGame();
    const router = useRouter();

    const isMenuVisible = computed(() => {
        if (!router || !router.currentRoute.value) return true;

        const path = router.currentRoute.value.path;

        // Ocultar si estamos en lobby, juego o pantalla de resultados (GameOver)
        // ya que la partida requiere concentración y el diseño HUD del juego tiene sus propios controles.
        if (
            path.startsWith('/lobby/') ||
            path.startsWith('/game/') ||
            path.startsWith('/results/')
        ) {
            return false;
        }

        // Validación secundaria basada en el estado lógico del juego:
        // Si hay una partida activa y no estamos en LOBBY ni en GAME_OVER, ocultamos el menú principal.
        if (
            gameState.value &&
            gameState.value.status !== 'LOBBY' &&
            gameState.value.status !== 'GAME_OVER'
        ) {
            return false;
        }

        return true;
    });

    const setTab = (tab: 'home' | 'store' | 'profile' | 'history') => {
        currentTab.value = tab;
        // Si volvemos a 'home', nos aseguramos de redirigir a la vista raíz '/'
        if (tab === 'home') {
            router.push('/');
        }
    };

    return {
        currentTab,
        isMenuVisible,
        setTab
    };
}
