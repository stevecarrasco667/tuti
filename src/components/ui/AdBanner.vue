<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const props = defineProps<{
    slotId: string;
    adClient?: string;     // Reemplaza con tu data-ad-client de AdSense
    adSlot?: string;       // Reemplaza con tu data-ad-slot de AdSense
}>();

const insRef = ref<HTMLElement | null>(null);

onMounted(() => {
    const el = insRef.value;
    if (!el) return;

    // Guard: solo inicializar si el slot no fue ya procesado por AdSense
    if (el.getAttribute('data-adsbygoogle-status') === 'done') return;

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (e) {
        console.warn('[AdBanner] adsbygoogle.push() falló:', e);
    }
});

onUnmounted(() => {
    // Limpiar el atributo para que el próximo onMounted pueda reiniciar el slot
    const el = insRef.value;
    if (el) el.removeAttribute('data-adsbygoogle-status');
});
</script>

<template>
    <!-- 
        Contenedor AdSense seguro para Vue SPA.
        - Sustituye data-ad-client con tu Publisher ID (ca-pub-XXXXXXXXX)
        - Sustituye data-ad-slot con el ID de slot de cada banner
        - El script global de AdSense debe estar en index.html, NO aquí
    -->
    <div :id="`ad-container-${slotId}`" class="w-full flex items-center justify-center my-2 min-h-[60px]">
        <ins
            ref="insRef"
            class="adsbygoogle"
            style="display:block; width:100%; max-width:728px; height:60px;"
            :data-ad-client="adClient || 'ca-pub-XXXXXXXXXXXXXXXXX'"
            :data-ad-slot="adSlot || '0000000000'"
            data-ad-format="auto"
            data-full-width-responsive="true"
        ></ins>
    </div>
</template>
