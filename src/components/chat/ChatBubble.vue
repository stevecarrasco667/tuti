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
    if (props.message.text === '[ERR_SPOILER_BLOCKED]') {
        return t('chat.spoilerBlocked');
    }
    return props.message.text;
});
</script>

<template>
    <div class="flex w-full mb-1" :class="isMine ? 'justify-end' : (message.type === 'SYSTEM' ? 'justify-center' : 'justify-start')">
        
        <!-- SYSTEM MESSAGE (Premium dark translucid pill) -->
        <div v-if="message.type === 'SYSTEM'" 
             class="text-[9px] font-black text-tuti-teal bg-panel-card/65 border border-tuti-teal/15 px-3 py-1.5 rounded-full uppercase tracking-[0.15em] my-1 text-center shadow-inner select-none">
            📢 {{ displayText }}
        </div>
        
        <!-- USER MESSAGE -->
        <div v-else class="flex flex-col max-w-[85%]" :class="isMine ? 'items-end' : 'items-start'">
            
            <!-- Sender Name (Highlighted in Cyan) -->
            <span v-if="!isMine" class="text-[10px] font-black text-action-info mb-1 ml-2.5 truncate max-w-[120px] uppercase tracking-wider select-none">
                {{ message.senderName }}
            </span>

            <!-- Bubble (High contrast and premium Glassmorphic borders) -->
            <div class="px-4 py-2.5 text-[14px] break-words relative min-w-[70px] font-medium leading-relaxed shadow-lg transition-all"
                :class="[
                    isMine 
                        ? 'bg-gradient-to-br from-action-secondary to-action-secondary-hover text-white shadow-[0_4px_14px_rgba(99,102,241,0.25)] border border-white/10 rounded-t-[1.25rem] rounded-bl-[1.25rem] rounded-br-sm' 
                        : 'bg-panel-card/45 backdrop-blur-md border border-white/5 text-ink-main shadow-[0_4px_12px_rgba(0,0,0,0.15)] rounded-t-[1.25rem] rounded-br-[1.25rem] rounded-bl-sm'
                ]"
            >
                <div class="whitespace-pre-wrap select-text">{{ displayText }}</div>
                
                <!-- Timestamp (Perfect contrast metadata) -->
                <div class="text-[9px] mt-1 text-right w-full font-black tracking-widest select-none opacity-80"
                     :class="isMine ? 'text-white/60' : 'text-ink-muted'">
                    {{ formattedTime }}
                </div>
            </div>
        </div>
    </div>
</template>
