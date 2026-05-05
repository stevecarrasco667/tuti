<script setup lang="ts">
/**
 * TButton — Componente de botón Neo-Brutalista
 * [FE-1.5] Efecto de press: al hacer active, el botón se "hunde" 4px
 * hacia abajo-derecha reduciendo la sombra hard a pressed.
 */
withDefaults(defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'accent';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    type?: 'button' | 'submit';
}>(), {
    variant: 'primary',
    size: 'md',
    disabled: false,
    type: 'button',
});

const VARIANT_MAP = {
    primary:   'nb-btn-primary',
    secondary: 'nb-btn-secondary',
    ghost:     'nb-btn-ghost',
    danger:    'nb-btn-danger',
    success:   'nb-btn-success',
    // 'accent' preservado como alias de success para compatibilidad
    accent:    'nb-btn-success',
} as const;

const SIZE_MAP = {
    sm: 'py-2 px-4 text-xs rounded-lg',
    md: 'py-3 px-6 text-sm rounded-xl',
    lg: 'py-4 px-8 text-base md:text-lg rounded-xl',
} as const;
</script>

<template>
    <button
        :type="type"
        :disabled="disabled"
        :class="[VARIANT_MAP[variant], SIZE_MAP[size]]"
    >
        <slot />
    </button>
</template>
