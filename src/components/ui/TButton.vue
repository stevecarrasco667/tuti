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
    primary:   'bg-action-primary hover:bg-action-primary-hover shadow-glow-primary disabled:opacity-50 text-panel-base', // Texto contrastante oscuro
    secondary: 'bg-action-secondary hover:bg-action-secondary-hover text-white backdrop-blur-sm',
    ghost:     'bg-transparent hover:bg-panel-input text-ink-main',
    danger:    'bg-action-error text-white shadow-glow-panic',
    accent:    'bg-action-primary text-panel-base shadow-glow-primary hover:opacity-90',
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
        class="font-black uppercase whitespace-nowrap tracking-[0.08em] flex items-center justify-center gap-2 transition-all duration-300 ease-out hover:-translate-y-1 active:scale-95 active:translate-y-0 cursor-pointer disabled:cursor-not-allowed min-h-[44px] focus:outline-none focus-visible:ring-4 focus-visible:ring-action-primary/50"
        :class="[VARIANT_MAP[variant], SIZE_MAP[size]]"
    >
        <slot />
    </button>
</template>
