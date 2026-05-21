<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
    roomId: string;
    isPublic: boolean;
    amIHost: boolean;
    copied: boolean;
}>();

const emit = defineEmits<{
    (e: 'toggle-privacy'): void;
    (e: 'copy-link'): void;
    (e: 'leave'): void;
}>();
</script>

<template>
    <!-- STICKY HEADER: Room Code + Pub/Priv -->
    <div class="flex-none px-3 pt-2 pb-1 lg:px-4 lg:pt-3">
        <div class="bg-panel-card/90 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 pr-[4.5rem] lg:pr-3 flex items-center justify-between gap-3 shadow-md relative">
            <!-- Left: Back Button + Pub/Priv + Code -->
            <div class="flex items-center gap-3 min-w-0">
                <!-- Botón Volver al Home -->
                <button
                    @click="emit('leave')"
                    class="flex-none w-9 h-9 rounded-xl border border-white/10 bg-panel-input hover:bg-white/15 flex items-center justify-center text-ink-soft hover:text-ink-main transition-all active:scale-90 cursor-pointer"
                    :title="t('lobby.header.back')"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </button>
                <!-- Public/Private Toggle (Host only) -->
                <button v-if="props.amIHost"
                    @click="emit('toggle-privacy')"
                    class="flex-none w-9 h-9 rounded-xl border flex items-center justify-center text-base transition-all active:scale-90 cursor-pointer"
                    :class="props.isPublic ? 'bg-game-green border-game-green-dark shadow-game-btn text-panel-base' : 'bg-panel-input border-white/10 text-ink-soft hover:text-ink-main shadow-inner'"
                >
                    {{ props.isPublic ? '🌐' : '🔒' }}
                </button>
                <div v-else class="flex-none w-9 h-9 rounded-xl border border-white/5 bg-panel-input/50 flex items-center justify-center text-base opacity-75">
                    {{ props.isPublic ? '🌐' : '🔒' }}
                </div>

                <!-- Room Code -->
                <div class="min-w-0">
                    <p class="text-ink-muted/80 text-[9px] font-black uppercase tracking-wider leading-none">{{ props.isPublic ? t('lobby.header.publicRoom') : t('lobby.header.privateRoom') }}</p>
                    <span class="text-base lg:text-lg font-black text-ink-main tracking-[0.2em] font-mono select-all block truncate leading-none mt-1">{{ props.roomId }}</span>
                </div>
            </div>

            <!-- Right: Copy Link -->
            <button
                @click="emit('copy-link')"
                class="flex-none px-3.5 py-1.5 h-9 rounded-xl bg-game-yellow text-panel-base font-black text-xs uppercase tracking-wider shadow-game-btn hover:bg-game-yellow-dark active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer"
            >
                <span class="text-[14px] leading-none">{{ props.copied ? '✓' : '🔗' }}</span>
                <span class="hidden sm:inline">{{ props.copied ? t('lobby.header.copied') : t('lobby.header.invite') }}</span>
            </button>
        </div>
    </div>
</template>
