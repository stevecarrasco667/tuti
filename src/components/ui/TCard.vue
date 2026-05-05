<script setup lang="ts">
/**
 * TCard — Componente de tarjeta Neo-Brutalista
 * [FE-1.2/1.3] Variante 'game' usa borde negro sólido + sombra hard.
 * Variante 'paper' simula papel/ticket para tarjetas de respuesta.
 * Variante 'panel' preserva la estética glassmorphism para layouts de fondo.
 */
defineOptions({ inheritAttrs: false });

withDefaults(defineProps<{
    padding?: 'none' | 'sm' | 'md' | 'lg';
    variant?: 'game' | 'paper' | 'panel';
}>(), {
    padding: 'md',
    variant: 'game',
});

const PADDING_MAP = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-7',
} as const;

const VARIANT_MAP = {
    // Neo-Brutalista: fondo panel con borde negro y sombra sólida
    game:  'nb-card',
    // Estilo papel/ticket: fondo crema, borde negro, para tarjetas de respuesta/resultados
    paper: 'nb-card-paper',
    // Preservado para fondos y layouts de navegación
    panel: 'bg-panel-card backdrop-blur-xl rounded-3xl shadow-game-card border border-white/10',
} as const;
</script>

<template>
    <div
        v-bind="$attrs"
        class="transition-all duration-150 relative overflow-hidden"
        :class="[VARIANT_MAP[variant], PADDING_MAP[padding]]"
    >
        <slot />
    </div>
</template>
