<script setup lang="ts">
// [Sprint 2 - P2] Botones de acción post-partida.
// Duplicados en Desktop (sidebar) y Mobile (footer) eliminados — un solo componente.
defineProps<{
    amIHost: boolean;
    isCapturing: boolean;
}>();

defineEmits<{
    (e: 'restart'): void;
    (e: 'share'): void;
    (e: 'exit'): void;
}>();
</script>

<template>
    <div class="flex flex-col gap-2">
        <!-- Nueva Partida -->
        <button
            v-if="amIHost"
            @click="$emit('restart')"
            class="w-full bg-gradient-to-tr from-yellow-500 to-yellow-300 hover:from-yellow-400 hover:to-yellow-200 text-panel-base font-black text-sm uppercase tracking-[0.12em] py-3 rounded-xl shadow-[0_0_18px_rgba(250,204,21,0.4)] border-2 border-yellow-200 transition-all hover:-translate-y-0.5 active:scale-95"
        >
            🔥 Nueva Partida
        </button>
        <div v-else class="w-full flex items-center justify-center py-3 text-yellow-500/70 bg-panel-card/50 font-bold uppercase tracking-widest rounded-xl border border-yellow-500/20 text-xs">
            ⏳ Esperando anfitrión...
        </div>

        <div class="flex gap-2">
            <button
                id="btn-share-summary"
                @click="$emit('share')"
                :disabled="isCapturing"
                class="flex-[2] bg-white/5 hover:bg-white/10 border border-white/15 hover:border-yellow-400/40 text-white font-bold uppercase tracking-wider py-2 rounded-lg transition-all active:scale-95 disabled:opacity-50 text-[10px] flex items-center justify-center gap-1.5"
            >
                <span class="text-sm leading-none">{{ isCapturing ? '⏳' : '📸' }}</span>
                <span>{{ isCapturing ? 'Generando...' : 'Guardar Recuerdo' }}</span>
            </button>
            <button
                @click="$emit('exit')"
                class="flex-[1] bg-transparent hover:bg-red-500/10 border border-transparent hover:border-red-500/25 text-white/40 hover:text-red-400 font-bold uppercase tracking-wider py-2 rounded-lg transition-colors text-[10px] flex items-center justify-center gap-1"
            >
                <span>🚪</span><span>Salir</span>
            </button>
        </div>
    </div>
</template>
