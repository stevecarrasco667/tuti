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
            <div class="px-4 py-2 text-[15px] break-words relative min-w-[60px] font-bold"
                :class="[
                    isMine 
                        ? 'bg-action-primary text-ink-base shadow-glow-primary rounded-t-[1.5rem] rounded-bl-[1.5rem] rounded-br-sm' 
                        : 'bg-white/10 backdrop-blur-md border-[2px] border-white/10 text-ink-main shadow-sm rounded-t-[1.5rem] rounded-br-[1.5rem] rounded-bl-sm'
                ]"
            >
                <div>{{ message.text }}</div>
                
                <!-- Timestamp -->
                <div class="text-[9px] mt-1 text-right w-full mix-blend-normal font-black tracking-widest"
                     :class="isMine ? 'text-ink-base/70' : 'text-ink-muted'">
                    {{ formattedTime }}
                </div>
            </div>
        </div>
    </div>
</template>
