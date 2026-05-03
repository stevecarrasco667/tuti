<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue';
import * as Sentry from '@sentry/vue';
import { useRouter } from 'vue-router';
import { useGame } from '../../composables/useGame';
import { useI18n } from 'vue-i18n';

const hasError = ref(false);
const errorDetails = ref<string>('');
const router = useRouter();
const { leaveGame } = useGame();
const { t } = useI18n();

// Capture any error from descendant components
onErrorCaptured((err: unknown, _instance: any, info: string) => {
    // 1. Log to our telemetry system
    Sentry.captureException(err);
    
    // 2. Set local error state for fallback UI
    hasError.value = true;
    errorDetails.value = err instanceof Error ? err.message : String(err);

    // 3. Stop error propagation to prevent global app crash
    return false; 
});

const reloadApp = () => {
    // Clear potentially corrupted game state
    leaveGame();
    // Soft reload by pushing home route
    hasError.value = false;
    errorDetails.value = '';
    router.push('/').catch(() => {
        // Hard reload fallback
        window.location.href = '/';
    });
};
</script>

<template>
  <slot v-if="!hasError"></slot>
  <div v-else class="flex-1 w-full h-full flex flex-col items-center justify-center bg-panel-base text-ink-main p-6 text-center">
    <div class="max-w-md w-full bg-panel-card p-8 rounded-3xl shadow-game-panel border border-white/10 flex flex-col items-center">
      <div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
        <span class="text-3xl">⚠️</span>
      </div>
      
      <h2 class="text-2xl font-black uppercase tracking-wider mb-2">{{ t('errorBoundary.title') }}</h2>
      <p class="text-ink-muted text-sm font-medium mb-6">
        {{ t('errorBoundary.description') }}
      </p>

      <div class="w-full bg-panel-input rounded-xl p-4 mb-6 text-left overflow-hidden">
        <p class="text-xs font-mono text-red-300 break-all opacity-80">{{ errorDetails || t('errorBoundary.unknownError') }}</p>
      </div>

      <button 
        @click="reloadApp"
        class="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg"
      >
        {{ t('errorBoundary.returnHome') }}
      </button>
    </div>
  </div>
</template>
