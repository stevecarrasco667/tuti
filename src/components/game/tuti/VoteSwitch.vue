<script setup lang="ts">
const props = defineProps<{
    modelValue: boolean;
    isAutoValidated?: boolean;
    label?: string;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
}>();

const toggle = () => {
    if (props.isAutoValidated) return;
    emit('update:modelValue', !props.modelValue);
    // Haptic feedback (mobile)
    if (navigator.vibrate) navigator.vibrate(20);
};
</script>

<template>
    <button 
        type="button"
        :aria-label="label || (modelValue ? 'Válido' : 'Rechazado')"
        :aria-checked="modelValue"
        role="switch"
        :disabled="isAutoValidated"
        @click="toggle"
        class="relative inline-flex h-11 w-[4.5rem] shrink-0 cursor-pointer rounded-full border-[3px] border-white transition-colors duration-200 ease-in-out focus-visible:outline-none shadow-sm disabled:cursor-not-allowed"
        :class="[
            isAutoValidated 
                ? 'bg-action-warning shadow-inner' 
                : modelValue 
                    ? 'bg-action-primary shadow-inner' 
                    : 'bg-action-error shadow-inner'
        ]"
    >
        <!-- Knob -->
        <span 
            class="pointer-events-none inline-flex h-9 w-9 my-auto transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out items-center justify-center text-sm border-2 border-panel-card"
            :class="[
                modelValue || isAutoValidated ? 'translate-x-[2.1rem]' : 'translate-x-[0.15rem]'
            ]"
        >
            <span v-if="isAutoValidated" class="text-base drop-shadow-sm leading-none">🛡️</span>
            <span v-else-if="modelValue" class="text-action-primary text-base font-black leading-none mt-1">✓</span>
            <span v-else class="text-action-error text-base font-black leading-none mt-1">✕</span>
        </span>
    </button>
</template>
