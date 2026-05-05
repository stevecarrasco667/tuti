<script setup lang="ts">
/**
 * TInput — Componente de input Neo-Brutalista
 * [FE-3.1] Variante 'game': fondo blanco, borde negro, texto oscuro legible.
 *          Diseñado para la fase de juego donde el contraste es crítico.
 * Variante 'dark': mantiene la estética original (panel morado) para
 *          inputs de configuración/lobby donde el fondo oscuro es correcto.
 * Variante 'code': monoespaciado centrado para códigos de sala.
 */
withDefaults(defineProps<{
    modelValue?: string;
    placeholder?: string;
    type?: string;
    maxlength?: number;
    disabled?: boolean;
    variant?: 'game' | 'dark' | 'code';
    inputClass?: string;
}>(), {
    modelValue: '',
    placeholder: '',
    type: 'text',
    disabled: false,
    variant: 'dark',
    inputClass: '',
});

const emit = defineEmits<{
    'update:modelValue': [value: string];
}>();
</script>

<template>
    <input
        :value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :maxlength="maxlength"
        :disabled="disabled"
        :class="[
            // Variante GAME: fondo blanco con borde negro (fase de juego)
            variant === 'game'
                ? 'nb-input'
                // Variante CODE: monoespaciado para códigos de sala
                : variant === 'code'
                ? 'w-full px-4 py-4 text-3xl font-display tracking-[0.2em] uppercase text-center bg-panel-input border-2 border-game-yellow/60 focus:border-game-yellow focus:ring-4 focus:ring-game-yellow/20 rounded-xl text-ink-main placeholder-ink-muted transition-all duration-150 outline-none'
                // Variante DARK (default): estética panel morada para lobby/configuración
                : 'w-full px-5 py-3.5 min-h-[48px] bg-panel-input border-2 border-white/15 focus:border-game-yellow focus:ring-4 focus:ring-game-yellow/25 rounded-xl text-ink-main placeholder-ink-muted transition-all duration-150 outline-none font-medium disabled:opacity-50 disabled:cursor-not-allowed',
            inputClass
        ]"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
</template>
