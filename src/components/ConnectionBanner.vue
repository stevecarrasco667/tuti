<script setup lang="ts">
defineProps<{
    isConnected: boolean;
}>();
</script>

<template>
    <Transition name="slide-down">
        <div v-if="!isConnected" class="fixed top-0 left-0 w-full bg-red-600 text-white font-bold text-center text-sm py-2 z-[9999] shadow-md flex items-center justify-center gap-2">
            <span class="animate-pulse">⚠️</span>
            <span>Conexión perdida... intentando reconectar</span>
            <span class="animate-spin ml-1 text-xs">⏳</span>
        </div>
    </Transition>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
    transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
    transform: translateY(-100%);
    opacity: 0;
}
</style>
