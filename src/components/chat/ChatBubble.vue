<script setup lang="ts">
import { computed } from 'vue';
import type { ChatMessage } from '../../../shared/types';

const props = defineProps<{
    message: ChatMessage;
    isMine: boolean;
}>();

const formattedTime = computed(() => {
    return new Date(props.message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
});
</script>

<template>
    <div class="flex w-full mb-1" :class="isMine ? 'justify-end' : 'justify-start'">
        <div class="flex flex-col max-w-[85%]" :class="isMine ? 'items-end' : 'items-start'">
            
            <!-- Sender Name (Only for others) -->
            <span v-if="!isMine" class="text-[10px] font-bold text-white/50 mb-1 ml-1 truncate max-w-[120px]">
                {{ message.senderName }}
            </span>

            <!-- Bubble -->
            <div class="px-3 py-2 text-sm shadow-md break-words relative min-w-[60px]"
                :class="[
                    isMine 
                        ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
                        : 'bg-white/10 text-indigo-100 rounded-2xl rounded-tl-sm backdrop-blur-sm border border-white/5'
                ]"
            >
                <div>{{ message.text }}</div>
                
                <!-- Timestamp -->
                <div class="text-[9px] mt-1 text-right w-full opacity-60 mix-blend-plus-lighter">
                    {{ formattedTime }}
                </div>
            </div>
        </div>
    </div>
</template>
