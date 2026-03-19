<script setup lang="ts">
withDefaults(defineProps<{
    modelValue?: string;
    placeholder?: string;
    type?: string;
    maxlength?: number;
    disabled?: boolean;
    /**
     * 'default' — normal input
     * 'code'    — monospaced, centered, large tracking (sala codes, etc.)
     */
    variant?: 'default' | 'code';
    inputClass?: string;
}>(), {
    modelValue: '',
    placeholder: '',
    type: 'text',
    disabled: false,
    variant: 'default',
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
        class="w-full px-5 py-3.5 bg-panel-input border-2 border-white/20 backdrop-blur-md focus:border-action-primary focus:ring-4 focus:ring-action-primary/20 rounded-full text-ink-main placeholder-ink-muted/70 transition-all outline-none font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)]"
        :class="[
            variant === 'code'
                ? 'px-4 py-4 text-3xl font-mono tracking-[0.2em] font-black uppercase text-center'
                : 'text-base',
            inputClass
        ]"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
</template>
