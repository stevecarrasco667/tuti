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
        class="w-full bg-panel-input border-2 border-panel-card focus:border-action-cyan rounded-xl text-ink-main placeholder-ink-muted transition-all outline-none shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
        :class="[
            variant === 'code'
                ? 'px-4 py-4 text-3xl font-mono tracking-[0.2em] font-black uppercase text-center'
                : 'px-3 py-2 text-base font-black',
            inputClass
        ]"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
</template>
