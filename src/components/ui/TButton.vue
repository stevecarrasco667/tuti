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
    primary:   'bg-action-primary hover:bg-action-primary-hover shadow-glow-primary disabled:opacity-50 text-white border-2 border-white/20',
    secondary: 'bg-transparent hover:bg-white/5 text-ink-main border-2 border-white/10',
    ghost:     'bg-panel-raised hover:bg-panel-card text-ink-soft border-2 border-white/5',
    danger:    'bg-action-error text-white shadow-glow-panic border-2 border-white/20',
    accent:    'bg-action-success text-panel-base shadow-glow-success hover:opacity-90 border-2 border-white/20',
} as const;

const SIZE_MAP = {
    sm: 'py-2 px-4 text-xs rounded-xl',
    md: 'py-3 px-6 text-sm rounded-xl',
    lg: 'py-4 px-8 text-lg md:text-xl rounded-2xl',
} as const;
</script>

<template>
    <button
        :type="type"
        :disabled="disabled"
        class="font-black uppercase whitespace-nowrap tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ease-out hover:-translate-y-1 active:scale-95 active:translate-y-0 cursor-pointer disabled:cursor-not-allowed min-h-[48px] focus:outline-none focus-visible:ring-4 focus-visible:ring-action-primary/50 relative overflow-hidden"
        :class="[VARIANT_MAP[variant], SIZE_MAP[size]]"
    >
        <slot />
    </button>
</template>
