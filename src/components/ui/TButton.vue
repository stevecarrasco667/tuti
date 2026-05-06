<script setup lang="ts">
withDefaults(defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
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
    primary:   'sp-btn-primary',
    secondary: 'sp-btn-secondary',
    ghost:     'bg-panel-raised hover:bg-panel-card text-ink-soft border-2 border-white/5 rounded-2xl transition-all duration-75',
    danger:    'sp-btn-danger',
    accent:    'sp-btn-success',
} as const;

const SIZE_MAP = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg md:text-xl min-h-[56px]',
} as const;
</script>

<template>
    <button
        :type="type"
        :disabled="disabled"
        class="sp-btn"
        :class="[VARIANT_MAP[variant], SIZE_MAP[size], variant === 'ghost' ? '' : '']"
    >
        <slot />
    </button>
</template>
