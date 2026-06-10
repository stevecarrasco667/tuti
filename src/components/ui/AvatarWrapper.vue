<template>
  <div class="relative inline-flex items-center justify-center" :class="wrapperClass">
    <!-- Cosmetic Border Frame (if active) -->
    <div
      v-if="frameClass"
      class="absolute -inset-1 rounded-full pointer-events-none z-10 cosmetic-frame"
      :class="frameClass"
    ></div>

    <!-- Inner Avatar Slot -->
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { STORE_ITEMS } from '../../composables/useProfile';

const props = defineProps<{
  frameId?: string | null;
}>();

const frameClass = computed(() => {
  if (!props.frameId) return null;
  const item = STORE_ITEMS.value.find(i => i.id === props.frameId);
  return item ? item.className : null;
});

const wrapperClass = computed(() => {
  return props.frameId ? 'avatar-wrapper-active' : '';
});
</script>

<style scoped>
.avatar-wrapper-active {
  padding: 2px;
}
</style>
