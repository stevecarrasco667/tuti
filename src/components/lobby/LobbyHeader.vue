<script setup lang="ts">
import TButton from '../ui/TButton.vue';
import TCard from '../ui/TCard.vue';

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
    <div class="flex-none px-3 pt-3 pb-2 lg:px-4 lg:pt-4">
        <TCard padding="none" class="p-3 flex items-center justify-between gap-3 rounded-2xl">
            <!-- Left: Back Button + Pub/Priv + Code -->
            <div class="flex items-center gap-3 min-w-0">
                <!-- Botón Volver al Home -->
                <button
                    @click="emit('leave')"
                    class="flex-none w-9 h-9 rounded-xl border-2 border-white/10 bg-panel-input hover:bg-white/10 flex items-center justify-center text-ink-soft hover:text-ink-main transition-all active:scale-90"
                    title="Volver al inicio"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </button>
                <!-- Public/Private Toggle (Host only) -->
                <button v-if="props.amIHost"
                    @click="emit('toggle-privacy')"
                    class="flex-none w-10 h-10 rounded-xl border-2 flex items-center justify-center text-lg transition-all active:scale-90"
                    :class="props.isPublic ? 'bg-action-primary border-green-400 shadow-game-btn' : 'bg-panel-input border-panel-card shadow-inner'"
                >
                    {{ props.isPublic ? '🌐' : '🔒' }}
                </button>
                <span v-else class="flex-none text-xl">{{ props.isPublic ? '🌐' : '🔒' }}</span>

                <!-- Room Code -->
                <div class="min-w-0">
                    <p class="text-ink-soft text-[7px] font-black uppercase tracking-widest">{{ props.isPublic ? 'Sala Pública' : 'Sala Privada' }}</p>
                    <span class="text-lg lg:text-xl font-black text-ink-main tracking-[0.2em] font-mono select-all block truncate">{{ props.roomId }}</span>
                </div>
            </div>

            <!-- Right: Copy Link -->
            <TButton variant="secondary" size="sm" class="flex-none" @click="emit('copy-link')">
                <span>{{ props.copied ? '✓' : '🔗' }}</span>
                <span class="hidden sm:inline">{{ props.copied ? 'Copiado' : 'Invitar' }}</span>
            </TButton>
        </TCard>
    </div>
</template>
