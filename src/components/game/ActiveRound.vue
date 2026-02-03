<script setup lang="ts">

import { useGame } from '../../composables/useGame';
import { useGameEffects } from '../../composables/useGameEffects';
import ActiveBoard from '../game/ActiveBoard.vue';

const props = defineProps<{
    categories: string[];
    currentLetter: string | null;
    modelValue: Record<string, string>;
    rivalsActivity: any[]; // Using any for simplicity as Interface is complex or importing from types might be better
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
    const target = event.target as HTMLElement;
    // Mobile Scroll Assist
    setTimeout(() => { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
};
</script>

<template>
    <ActiveBoard 
        :categories="categories"
        :model-value="modelValue"
        :current-letter="currentLetter"
        :rivals-activity="rivalsActivity"
        @update:model-value="(val) => emit('update:modelValue', val)"
        @input-focus="handleInputFocus"
        @input-change="handleInput"
    />
</template>
