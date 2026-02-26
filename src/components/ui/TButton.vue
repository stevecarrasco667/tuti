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
    primary:   'bg-action-primary hover:bg-action-hover text-white shadow-game-btn border-[3px] border-green-400 disabled:bg-panel-input disabled:text-ink-muted disabled:border-panel-card disabled:shadow-none',
    secondary: 'bg-panel-card hover:bg-white text-action-blue border-2 border-white shadow-sm',
    blue:      'bg-action-blue hover:bg-blue-500 text-white shadow-game-btn border-[3px] border-blue-400',
    teal:      'bg-tuti-teal hover:bg-teal-300 text-ink-main shadow-game-btn border-[3px] border-white/60',
    ghost:     'bg-panel-modal hover:bg-white text-ink-soft border-2 border-white',
    danger:    'bg-action-error hover:bg-red-600 text-white shadow-game-btn border-[3px] border-red-400',
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
        class="font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
        :class="[VARIANT_MAP[variant], SIZE_MAP[size]]"
    >
        <slot />
    </button>
</template>
