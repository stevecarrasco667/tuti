<script setup lang="ts">
import { computed } from 'vue';
import type { ChatMessage } from '../../../shared/types';
import { useGameState } from '../../composables/useGameState';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
    message: ChatMessage;
    isMine: boolean;
}>();

const { gameState } = useGameState();
const { t } = useI18n();

const formattedTime = computed(() => {
    return new Date(props.message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
});

const displayText = computed(() => {
    if (props.message.type === 'SYSTEM' && props.message.code) {
        return t(`system.${props.message.code}`, props.message.args || {}, { locale: gameState.value?.config?.lang || 'es' });
    }
    return props.message.text;
});
</script>

<template>
    <div class="flex w-full mb-1" :class="isMine ? 'justify-end' : (message.type === 'SYSTEM' ? 'justify-center' : 'justify-start')">
        
        <!-- SYSTEM MESSAGE -->
        <div v-if="message.type === 'SYSTEM'" class="text-[10px] font-bold text-ink-muted/70 bg-black/20 px-3 py-1 rounded-full uppercase tracking-wider my-1 text-center">
            {{ displayText }}
        </div>
        
        <!-- USER MESSAGE -->
        <div v-else class="flex flex-col max-w-[85%]" :class="isMine ? 'items-end' : 'items-start'">
            
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
                <div>{{ displayText }}</div>
                
                <!-- Timestamp -->
                <div class="text-[9px] mt-1 text-right w-full mix-blend-normal font-black tracking-widest"
                     :class="isMine ? 'text-ink-base/70' : 'text-ink-muted'">
                    {{ formattedTime }}
                </div>
            </div>
        </div>
    </div>
</template>
