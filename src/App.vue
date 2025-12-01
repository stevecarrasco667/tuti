<script setup lang="ts">
import { useSocket } from './composables/useSocket';

const { isConnected, lastMessage } = useSocket();
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full space-y-4">
    <h1 class="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
      Tutifruti Online
    </h1>
    
    <div class="p-6 bg-gray-800 rounded-xl border border-gray-700 shadow-xl">
      <div class="flex items-center space-x-3 mb-4">
        <div 
          class="w-4 h-4 rounded-full transition-colors duration-300"
          :class="isConnected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'"
        ></div>
        <span class="text-lg font-medium text-gray-300">
          Status: {{ isConnected ? 'Connected' : 'Disconnected' }}
        </span>
      </div>

      <div v-if="lastMessage" class="p-4 bg-gray-900 rounded-lg font-mono text-sm text-green-400 border border-gray-800">
        > {{ lastMessage }}
      </div>
    </div>
  </div>
</template>
