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
        class="relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed"
        :class="[
            isAutoValidated 
                ? 'bg-amber-500/80 shadow-lg shadow-amber-500/30' 
                : modelValue 
                    ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' 
                    : 'bg-red-500/70 shadow-lg shadow-red-500/20'
        ]"
    >
        <!-- Knob -->
        <span 
            class="pointer-events-none inline-flex h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out items-center justify-center text-sm"
            :class="[
                modelValue || isAutoValidated ? 'translate-x-6' : 'translate-x-0'
            ]"
        >
            <span v-if="isAutoValidated">🛡️</span>
            <span v-else-if="modelValue" class="text-emerald-500 text-xs font-black">✓</span>
            <span v-else class="text-red-500 text-xs font-black">✕</span>
        </span>
    </button>
</template>
