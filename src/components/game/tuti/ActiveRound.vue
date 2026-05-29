<script setup lang="ts">

import { useGame } from '../../../composables/useGame';
import { useGameEffects } from '../../../composables/useGameEffects';
import ActiveBoard from './ActiveBoard.vue';
import type { CategoryRef } from '../../../../shared/types';

const props = defineProps<{
    categories: CategoryRef[];
    currentLetter: string | null;
    modelValue: Record<string, string>;
    rivalsActivity: any[];
    isBlocked?: boolean;
    isSpectator?: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: Record<string, string>): void;
}>();

const { debouncedUpdateAnswers, gameState, myUserId, amIHost } = useGame();
const { playClick } = useGameEffects(gameState, myUserId, amIHost);

const handleInput = (category: string, event: Event) => {
    const input = event.target as HTMLInputElement;
    let val = input.value;
    
    // First Letter Validation
    if (props.currentLetter && val.length > 0) {
        const firstChar = val.charAt(0).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const targetChar = props.currentLetter.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (firstChar !== targetChar) {
            val = ""; input.value = "";
            input.classList.add('bg-red-500/20', 'animate-pulse');
            setTimeout(() => input.classList.remove('bg-red-500/20', 'animate-pulse'), 500);
        }
    }
    
    // Update State
    const newAnswers = { ...props.modelValue, [category]: val };
    emit('update:modelValue', newAnswers);
    debouncedUpdateAnswers(newAnswers);
    
    playClick(); // Feedback
};

const handleInputFocus = (event: Event) => {
    playClick(); // Audio Unlock
    
    // Con interactive-widget=overlays-content, el viewport NO se achica al abrir
    // el teclado — el teclado se superpone como overlay. Por eso debemos SIEMPRE
    // hacer scroll al input enfocado para garantizar que quede visible por encima
    // del teclado. Usamos un delay de 300ms para dar tiempo al teclado a abrirse.
    const target = event.target as HTMLElement;
    setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
};
</script>

<template>
    <ActiveBoard 
        :categories="categories"
        :model-value="modelValue"
        :current-letter="currentLetter"
        :rivals-activity="rivalsActivity"
        @update:model-value="(val: Record<string, string>) => emit('update:modelValue', val)"
        @input-focus="handleInputFocus"
        @input-change="handleInput"
        :is-blocked="isBlocked"
        :is-spectator="isSpectator"
    />
</template>
