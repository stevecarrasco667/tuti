<script setup lang="ts">
import type { GameConfig, CategoryRef } from '../../../shared/types';

const props = defineProps<{
    config: GameConfig;
    categories: CategoryRef[];
    amIHost: boolean;
    tSpec: {
        classic: { title: string; subtitle: string };
        impostor: { title: string; subtitle: string };
    };
}>();

const emit = defineEmits<{
    (e: 'update-config', field: string, value: any): void;
    (e: 'open-modal'): void;
    (e: 'open-tutorial', mode: 'CLASSIC' | 'IMPOSTOR'): void;
}>();
</script>

<template>
    <!-- Gartic Phone style 2x2 grid of games -->
    <div class="grid grid-cols-2 gap-3.5">
        <!-- Classic Card -->
        <div
            @click="props.amIHost && emit('update-config', 'mode', 'CLASSIC')"
            class="relative p-4 rounded-2xl border-[3px] transition-all duration-300 text-center group min-h-[110px] flex flex-col items-center justify-center select-none"
            :class="[
                props.config.mode === 'CLASSIC'
                    ? 'border-action-primary bg-action-primary/10 shadow-[0_4px_16px_rgba(245,158,11,0.15)] scale-[1.01]'
                    : 'border-white/10 bg-panel-card/45 hover:border-action-primary/50 hover:bg-panel-input/50 hover:scale-[1.02]',
                !props.amIHost ? 'cursor-not-allowed opacity-60 hover:scale-100' : 'cursor-pointer'
            ]"
        >
            <!-- Top-Left Pencil/Edit button (Host-only, selected only) -->
            <button v-if="props.amIHost && props.config.mode === 'CLASSIC'"
                @click.stop="emit('open-modal')"
                class="absolute top-2 left-2 w-8 h-8 rounded-xl bg-panel-card/90 border border-white/10 hover:border-action-primary text-action-primary hover:bg-panel-input flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer z-20"
                title="Editar Categorías"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                </svg>
            </button>

            <!-- Top-Right Help/Tutorial button (selected only) -->
            <button v-if="props.config.mode === 'CLASSIC'"
                @click.stop="emit('open-tutorial', 'CLASSIC')"
                class="absolute top-2 right-2 w-8 h-8 rounded-xl bg-panel-card/90 border border-white/10 hover:border-action-info text-action-info hover:bg-panel-input flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer z-20"
                title="Cómo Jugar"
            >
                <span class="text-xs font-black">❓</span>
            </button>

            <div class="text-3xl mb-1 group-hover:scale-110 transition-transform drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">🎯</div>
            <h4 class="text-ink-main font-black text-xs tracking-wider leading-none uppercase">{{ props.tSpec.classic.title }}</h4>
            <p class="text-ink-soft text-[9px] font-bold mt-1.5 leading-none opacity-85">{{ props.tSpec.classic.subtitle }}</p>

            <!-- Compact category count status -->
            <div class="mt-2.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-wider text-ink-soft select-none leading-none">
                {{ props.categories.length > 0 ? `${props.categories.length} Categorías` : '4 Categorías (Al Azar)' }}
            </div>
        </div>

        <!-- Impostor Card -->
        <div
            @click="props.amIHost && emit('update-config', 'mode', 'IMPOSTOR')"
            class="relative p-4 rounded-2xl border-[3px] transition-all duration-300 text-center group min-h-[110px] flex flex-col items-center justify-center select-none"
            :class="[
                props.config.mode === 'IMPOSTOR'
                    ? 'border-action-error bg-action-error/10 shadow-[0_4px_16px_rgba(239,68,68,0.15)] scale-[1.01]'
                    : 'border-white/10 bg-panel-card/45 hover:border-action-error/50 hover:bg-panel-input/50 hover:scale-[1.02]',
                !props.amIHost ? 'cursor-not-allowed opacity-60 hover:scale-100' : 'cursor-pointer'
            ]"
        >
            <!-- Top-Left Pencil/Edit button (Host-only, selected only) -->
            <button v-if="props.amIHost && props.config.mode === 'IMPOSTOR'"
                @click.stop="emit('open-modal')"
                class="absolute top-2 left-2 w-8 h-8 rounded-xl bg-panel-card/90 border border-white/10 hover:border-action-primary text-action-primary hover:bg-panel-input flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer z-20"
                title="Editar Categorías"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                </svg>
            </button>

            <!-- Top-Right Help/Tutorial button (selected only) -->
            <button v-if="props.config.mode === 'IMPOSTOR'"
                @click.stop="emit('open-tutorial', 'IMPOSTOR')"
                class="absolute top-2 right-2 w-8 h-8 rounded-xl bg-panel-card/90 border border-white/10 hover:border-action-info text-action-info hover:bg-panel-input flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer z-20"
                title="Cómo Jugar"
            >
                <span class="text-xs font-black">❓</span>
            </button>

            <div class="text-3xl mb-1 group-hover:scale-110 transition-transform drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">🕵️</div>
            <h4 class="text-ink-main font-black text-xs tracking-wider leading-none uppercase">{{ props.tSpec.impostor.title }}</h4>
            <p class="text-ink-soft text-[9px] font-bold mt-1.5 leading-none opacity-85">{{ props.tSpec.impostor.subtitle }}</p>

            <!-- Compact category status -->
            <div class="mt-2.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-wider text-ink-soft select-none leading-none">
                {{ props.categories.length > 0 ? `${props.categories.length} Temas` : 'Catálogo Aleatorio' }}
            </div>
        </div>

        <!-- Locked/Mystery Card 1 -->
        <div
            class="relative p-3.5 rounded-2xl border-2 border-dashed border-white/5 bg-panel-card/5 opacity-45 saturate-50 select-none flex flex-col items-center justify-center min-h-[110px] group transition-all duration-300 hover:opacity-60"
        >
            <div class="text-2xl mb-1 drop-shadow-sm group-hover:animate-bounce">🔒</div>
            <h4 class="text-ink-muted font-heading font-black text-[10px] tracking-widest leading-none uppercase">PRÓXIMAMENTE</h4>
            <p class="text-ink-muted text-[8px] font-bold mt-1 leading-none">Nuevo Juego 🤫</p>
        </div>

        <!-- Locked/Mystery Card 2 -->
        <div
            class="relative p-3.5 rounded-2xl border-2 border-dashed border-white/5 bg-panel-card/5 opacity-45 saturate-50 select-none flex flex-col items-center justify-center min-h-[110px] group transition-all duration-300 hover:opacity-60"
        >
            <div class="text-2xl mb-1 drop-shadow-sm group-hover:animate-bounce">🤫</div>
            <h4 class="text-ink-muted font-heading font-black text-[10px] tracking-widest leading-none uppercase">PRÓXIMAMENTE</h4>
            <p class="text-ink-muted text-[8px] font-bold mt-1 leading-none">¿Qué se vendrá? 👀</p>
        </div>
    </div>
</template>
