<script setup lang="ts">
// [Sprint 4 - Factor K] PostGameActions — Smart Share Unificado.
// El CTO nos dice: un solo CTA prominente para viralizar. Las acciones secundarias
// (Salir) quedan visualmente relegadas para no competir con el objetivo de compartir.
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
    <div class="flex flex-col gap-3">

        <!-- ── CTA PRINCIPAL: Compartir partida ─────────────────────────── -->
        <!-- Botón masivo y dominante. Es el único llamado a la acción que importa
             en esta pantalla para el Factor K del Sprint 4. -->
        <button
            id="btn-share-summary"
            @click="$emit('share')"
            :disabled="isCapturing"
            class="w-full relative overflow-hidden group bg-gradient-to-tr from-violet-600 via-purple-500 to-pink-500 hover:from-violet-500 hover:via-purple-400 hover:to-pink-400 text-white font-black text-sm uppercase tracking-[0.12em] py-4 rounded-2xl shadow-[0_0_24px_rgba(168,85,247,0.5)] border border-purple-300/20 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2"
        >
            <!-- Shimmer animado para captar la atención del ojo -->
            <span class="absolute inset-0 w-1/3 bg-white/10 skew-x-[-20deg] -translate-x-full group-hover:translate-x-[400%] transition-transform duration-700 ease-in-out pointer-events-none" />

            <span class="text-lg leading-none">{{ isCapturing ? '⏳' : '🚀' }}</span>
            <span>{{ isCapturing ? 'Preparando...' : 'Compartir partida' }}</span>
        </button>

        <!-- ── ACCIONES PRIMARIAS: Solo para el host ─────────────────────── -->
        <button
            v-if="amIHost"
            @click="$emit('restart')"
            class="w-full bg-white/5 hover:bg-yellow-400/10 border border-white/10 hover:border-yellow-400/30 text-yellow-400/90 font-bold text-xs uppercase tracking-widest py-2.5 rounded-xl transition-all active:scale-95"
        >
            🔥 Nueva Partida
        </button>
        <div
            v-else
            class="w-full flex items-center justify-center py-2.5 text-white/30 text-xs font-semibold uppercase tracking-widest"
        >
            ⏳ Esperando al anfitrión...
        </div>

        <!-- ── ACCIÓN SECUNDARIA: Salir (visualmente en segundo plano) ──── -->
        <button
            @click="$emit('exit')"
            class="w-full text-white/25 hover:text-red-400/70 font-semibold text-[10px] uppercase tracking-widest py-1.5 transition-colors"
        >
            🚪 Salir
        </button>
    </div>
</template>
