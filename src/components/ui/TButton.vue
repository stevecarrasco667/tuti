<script setup lang="ts">
withDefaults(defineProps<{
    variant?: 'primary' | 'secondary' | 'blue' | 'teal' | 'ghost' | 'danger';
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
    primary:   'bg-action-primary hover:bg-action-primary-hover text-white shadow-warm disabled:opacity-50',
    secondary: 'bg-action-secondary hover:bg-action-secondary-hover text-white',
    blue:      'bg-action-secondary hover:bg-action-secondary-hover text-white',
    teal:      'bg-action-accent hover:opacity-90 text-white shadow-warm',
    ghost:     'bg-transparent hover:bg-panel-input text-ink-main',
    danger:    'bg-action-error text-white',
} as const;

const SIZE_MAP = {
    sm: 'py-2 px-3 text-xs rounded-xl',
    md: 'py-3 px-4 text-sm rounded-xl',
    lg: 'py-5 px-4 text-lg rounded-2xl',
} as const;
</script>

<template>
    <button
        :type="type"
        :disabled="disabled"
        class="font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer disabled:cursor-not-allowed"
        :class="[VARIANT_MAP[variant], SIZE_MAP[size]]"
    >
        <slot />
    </button>
</template>
