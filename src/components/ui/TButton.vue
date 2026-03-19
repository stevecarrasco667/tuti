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
    primary:   'bg-action-primary hover:bg-action-primary-hover text-ink-base shadow-glow-primary disabled:opacity-50 text-panel-base', // Texto contrastante oscuro
    secondary: 'bg-action-secondary hover:bg-action-secondary-hover text-white backdrop-blur-sm',
    blue:      'bg-action-secondary hover:bg-action-secondary-hover text-white',
    teal:      'bg-action-accent hover:opacity-90 text-panel-base shadow-glow-primary',
    ghost:     'bg-transparent hover:bg-panel-input text-ink-main',
    danger:    'bg-action-error text-white shadow-glow-panic',
} as const;

const SIZE_MAP = {
    sm: 'py-2 px-4 text-xs rounded-full',
    md: 'py-3 px-6 text-sm rounded-full',
    lg: 'py-4 px-8 text-lg md:text-xl rounded-full',
} as const;
</script>

<template>
    <button
        :type="type"
        :disabled="disabled"
        class="font-black uppercase tracking-[0.08em] flex items-center justify-center gap-2 transition-all transform hover:scale-[1.03] active:scale-95 cursor-pointer disabled:cursor-not-allowed"
        :class="[VARIANT_MAP[variant], SIZE_MAP[size]]"
    >
        <slot />
    </button>
</template>
