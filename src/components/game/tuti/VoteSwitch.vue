<script setup lang="ts">
type CardSize = 'xl' | 'lg' | 'md' | 'sm';

const props = defineProps<{
    modelValue: boolean;
    isAutoValidated?: boolean;
    label?: string;
    cardSize?: CardSize;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
}>();

const toggle = () => {
    if (props.isAutoValidated) return;
    emit('update:modelValue', !props.modelValue);
    if (navigator.vibrate) navigator.vibrate(20);
};
</script>

<template>
    <!--
        VoteSwitch escalado por cardSize:
        xl/lg → h-11 w-[4.5rem] (44×72px) — grande y cómodo
        md    → h-11 w-[4.5rem]           — igual que xl/lg
        sm    → h-8  w-[3rem]  (32×48px)  — modo compacto 7-8 jugadores
    -->
    <button
        type="button"
        :aria-label="label || (modelValue ? 'Válido' : 'Rechazado')"
        :aria-checked="modelValue"
        role="switch"
        :disabled="isAutoValidated"
        @click="toggle"
        class="relative inline-flex shrink-0 cursor-pointer rounded-full border-[3px] border-white/10 transition-all duration-300 ease-in-out focus-visible:outline-none disabled:cursor-not-allowed hover:-translate-y-0.5"
        :class="[
            cardSize === 'sm' ? 'h-8 w-12' : 'h-11 w-[4.5rem]',
            isAutoValidated
                ? 'bg-action-warning shadow-glow-primary'
                : modelValue
                    ? 'bg-action-primary shadow-glow-primary'
                    : 'bg-action-error shadow-glow-panic'
        ]"
    >
        <!-- Knob -->
        <span
            class="pointer-events-none inline-flex my-auto transform rounded-full bg-ink-main shadow-lg transition-transform duration-200 ease-in-out items-center justify-center border-2 border-panel-card/50"
            :class="[
                cardSize === 'sm' ? 'h-6 w-6 text-xs' : 'h-9 w-9 text-sm',
                cardSize === 'sm'
                    ? (modelValue || isAutoValidated ? 'translate-x-[1.35rem]' : 'translate-x-[0.1rem]')
                    : (modelValue || isAutoValidated ? 'translate-x-[2.1rem]'  : 'translate-x-[0.15rem]')
            ]"
        >
            <span v-if="isAutoValidated" class="drop-shadow-sm leading-none">🛡️</span>
            <span v-else-if="modelValue" class="text-action-primary font-black leading-none mt-[1px]">✓</span>
            <span v-else class="text-action-error font-black leading-none mt-[1px]">✕</span>
        </span>
    </button>
</template>
