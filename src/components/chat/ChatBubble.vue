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
            <span v-if="!isMine" class="text-[10px] font-black text-ink-muted mb-1 ml-2 truncate max-w-[120px] uppercase tracking-wider">
                {{ message.senderName }}
            </span>

            <!-- Bubble -->
            <div class="px-3 py-2 text-sm shadow-sm break-words relative min-w-[60px] font-bold"
                :class="[
                    isMine 
                        ? 'bg-action-primary border-[3px] border-green-300 text-white rounded-[1.2rem] rounded-tr-[4px]' 
                        : 'bg-white border-[3px] border-slate-200 text-ink-main rounded-[1.2rem] rounded-tl-[4px]'
                ]"
            >
                <div>{{ message.text }}</div>
                
                <!-- Timestamp -->
                <div class="text-[9px] mt-1 text-right w-full mix-blend-normal font-black"
                     :class="isMine ? 'text-green-100' : 'text-slate-400'">
                    {{ formattedTime }}
                </div>
            </div>
        </div>
    </div>
</template>
