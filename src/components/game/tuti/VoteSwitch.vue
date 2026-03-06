<script setup lang="ts">
const props = defineProps<{
    modelValue: boolean;
    isAutoValidated?: boolean;
    label?: string;
    // Phase 3: compact prop from parent (7+ players)
    isCompact?: boolean;
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
    <!--
        Phase 3: Scalable VoteSwitch
        Normal mode  → h-11 w-[4.5rem] (44px × 72px) — original
        Compact mode → h-8  w-[3rem]   (32px × 48px) — for 7+ players
        Container queries handle edge cases via [container-type] on VotingCard
    -->
    <button
        type="button"
        :aria-label="label || (modelValue ? 'Válido' : 'Rechazado')"
        :aria-checked="modelValue"
        role="switch"
        :disabled="isAutoValidated"
        @click="toggle"
        class="relative inline-flex shrink-0 cursor-pointer rounded-full border-[3px] border-white/10 transition-colors duration-200 ease-in-out focus-visible:outline-none shadow-sm disabled:cursor-not-allowed"
        :class="[
            isCompact ? 'h-8 w-12' : 'h-11 w-[4.5rem]',
            isAutoValidated
                ? 'bg-action-warning shadow-inner'
                : modelValue
                    ? 'bg-action-primary shadow-inner'
                    : 'bg-action-error shadow-inner'
        ]"
    >
        <!-- Knob -->
        <span
            class="pointer-events-none inline-flex my-auto transform rounded-full bg-ink-main shadow-md transition-transform duration-200 ease-in-out items-center justify-center border-2 border-panel-card/50"
            :class="[
                isCompact ? 'h-6 w-6 text-xs' : 'h-9 w-9 text-sm',
                isCompact
                    ? (modelValue || isAutoValidated ? 'translate-x-[1.35rem]' : 'translate-x-[0.1rem]')
                    : (modelValue || isAutoValidated ? 'translate-x-[2.1rem]'   : 'translate-x-[0.15rem]')
            ]"
        >
            <span v-if="isAutoValidated" class="drop-shadow-sm leading-none">🛡️</span>
            <span v-else-if="modelValue" class="text-action-primary font-black leading-none mt-[1px]">✓</span>
            <span v-else class="text-action-error font-black leading-none mt-[1px]">✕</span>
        </span>
    </button>
</template>
