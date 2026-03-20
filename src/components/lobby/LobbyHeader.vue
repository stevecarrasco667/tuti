<script setup lang="ts">
import TButton from '../ui/TButton.vue';
import TCard from '../ui/TCard.vue';
import { useSound } from '../../composables/useSound';

const { isMuted, toggleMute } = useSound();

const props = defineProps<{
    roomId: string;
    isPublic: boolean;
    amIHost: boolean;
    copied: boolean;
}>();

const emit = defineEmits<{
    (e: 'toggle-privacy'): void;
    (e: 'copy-link'): void;
    (e: 'navigate', view: string): void;
}>();
</script>

<template>
    <!-- STICKY HEADER: Room Code + Pub/Priv -->
    <div class="flex-none px-3 pt-3 pb-2 lg:px-4 lg:pt-4">
        <!-- HEADER TOP BAR: Back Navigation + Mute -->
        <div class="flex items-center justify-between mb-3 px-1">
            <button @click="emit('navigate', 'HOME')" class="flex items-center gap-1.5 text-ink-soft hover:text-white transition-colors group active:scale-95">
                <span class="w-8 h-8 rounded-full bg-panel-card hover:bg-panel-input flex items-center justify-center border border-white/5 transition-colors shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </span>
                <span class="text-[10px] font-black uppercase tracking-widest hidden sm:block mt-0.5">Volver al Menú Principal</span>
            </button>

            <!-- Local Mute Button -->
            <button 
                @click="toggleMute"
                class="p-1.5 rounded-full bg-panel-input border border-white/10 hover:bg-white/10 transition-colors shadow-sm active:scale-95"
                :title="isMuted ? 'Activar Sonido' : 'Silenciar Sonido'"
            >
                <svg v-if="!isMuted" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-ink-soft">
                    <path d="M9.348 14.651l-2.853-2.852H4V8.201h2.495l2.853-2.852v9.302zM15.536 10a5.002 5.002 0 00-2.316-4.195v8.39A5.002 5.002 0 0015.536 10z" />
                    <path d="M12.22 3.102v13.796A7.003 7.003 0 0018.5 10a7.003 7.003 0 00-6.28-6.898z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-red-400 opacity-80">
                    <path fill-rule="evenodd" d="M9.383 3.076a.75.75 0 011.066.079l.067.086 5.86 8.371a.75.75 0 01-1.127.949l-.067-.086-1.503-2.148H12v3.633a.75.75 0 01-1.077.677l-4.14-2.192H4a2 2 0 01-2-2V9.5a2 2 0 011.66-1.972l.34-.028h1.841l4.14-2.192a.75.75 0 011.402.399l.001 5.863L9.304 3.14a.75.75 0 01.079-1.064zM16.53 4.47a.75.75 0 011.06 0l1.94 1.94 1.94-1.94a.75.75 0 111.06 1.06L20.59 7.47l1.94 1.94a.75.75 0 11-1.06 1.06l-1.94-1.94-1.94 1.94a.75.75 0 01-1.06-1.06l1.94-1.94-1.94-1.94a.75.75 0 010-1.06z" clip-rule="evenodd" />
                </svg>
            </button>
        </div>

        <TCard padding="none" class="p-3 flex items-center justify-between gap-3 rounded-2xl">
            <!-- Left: Pub/Priv + Code -->
            <div class="flex items-center gap-3 min-w-0">
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
