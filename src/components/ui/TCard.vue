<script setup lang="ts">
defineOptions({ inheritAttrs: false });

withDefaults(defineProps<{
    padding?: 'none' | 'sm' | 'md' | 'lg';
}>(), {
    padding: 'md',
});

const PADDING_MAP = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-8',
} as const;
</script>

<template>
    <div
        v-bind="$attrs"
        class="bg-panel-card backdrop-blur-xl rounded-3xl shadow-game-card border border-white/10 transition-all duration-300 relative overflow-hidden"
        :class="PADDING_MAP[padding]"
    >
        <slot />
    </div>
</template>
