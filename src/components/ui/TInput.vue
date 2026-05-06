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
        class="sp-input"
        :class="[
            variant === 'code'
                ? 'px-4 py-4 text-3xl font-display tracking-[0.2em] uppercase text-center'
                : 'text-base',
            inputClass
        ]"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
</template>
