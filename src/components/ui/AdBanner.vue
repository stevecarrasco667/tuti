<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { useAds } from '../../composables/useAds';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  position: 'desktop-left' | 'mobile-inline' | 'lobby';
}>();

const { showBanner, hideBanner, adsEnabled, isNative } = useAds();
const { t } = useI18n();

// Identificador único para la inyección DOM de AdSense en la Web
const containerId = ref(`ad-slot-${props.position}-${Math.random().toString(36).substring(2, 9)}`);

// Alturas y anchos reservados para prevenir Cumulative Layout Shift (CLS)
const wrapperStyles = computed(() => {
  if (props.position === 'desktop-left') {
    return {
      width: '160px',
      minHeight: '600px',
    };
  } else if (props.position === 'lobby') {
    return {
      width: '100%',
      minHeight: '60px',
      maxHeight: '90px',   // Evita que AdSense expanda el contenedor en móvil real
      overflow: 'hidden',
    };
  } else {
    // mobile-inline
    return {
      width: '100%',
      maxWidth: '340px',
      minHeight: '60px',
      maxHeight: '90px',   // Evita que AdSense expanda el contenedor en móvil real
      overflow: 'hidden',
    };
  }
});

onMounted(async () => {
  if (!adsEnabled.value) return;

  // Inyectar o disparar el banner de forma correspondiente al entorno
  if (isNative.value) {
    // Para Capacitor AdMob, disparamos el banner nativo flotante global
    // Solo lo activamos en el Home (mobile-inline) o en el Lobby
    if (props.position === 'mobile-inline' || props.position === 'lobby') {
      await showBanner(containerId.value, 'mobile');
    }
  } else {
    // Para la Web, inyectamos AdSense en el contenedor DOM con ID único
    const adType = props.position === 'desktop-left' ? 'desktop' : 'mobile';
    await showBanner(containerId.value, adType);
  }
});

onUnmounted(async () => {
  if (isNative.value) {
    await hideBanner();
  }
});
</script>

<template>
  <div v-if="adsEnabled" 
       class="relative rounded-3xl p-px overflow-hidden select-none transition-all duration-300 border border-white/5 bg-gradient-to-br from-panel-card/80 to-panel-input/50 backdrop-blur-md shadow-lg flex flex-col items-center justify-center"
       :style="wrapperStyles"
       :class="[
         position === 'desktop-left' ? 'my-4 mr-2' : 'my-2 mx-auto',
       ]">
    
    <!-- Sutil etiqueta de publicidad de bajo impacto visual -->
    <div class="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-widest text-ink-muted uppercase bg-panel-base/80 border border-white/5 px-2.5 py-0.5 rounded-full z-10">
      {{ t('system.advertisement', 'ANUNCIO') }}
    </div>

    <!-- Contenedor del Anuncio (Solo Web / AdSense) -->
    <div v-if="!isNative" 
         :id="containerId" 
         class="w-full h-full flex items-center justify-center"
         :class="position === 'desktop-left' ? 'min-h-[600px]' : 'min-h-[60px]'">
      <!-- AdSense inyectará la etiqueta <ins> aquí en tiempo de ejecución -->
    </div>

    <!-- Espaciador Visual Seguro (Solo Móvil Capacitor / AdMob) -->
    <!-- Como AdMob nativo dibuja un banner flotante encima, evitamos el CLS o solapamiento mostrando una sutil tarjeta cósmica de soporte -->
    <div v-else class="w-full p-2 text-center flex flex-col items-center justify-center min-h-[60px] animate-fade-in">
      <h4 class="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-2">🚀 {{ t('system.supportingTuti', 'Apoyando a TutiGames') }}</h4>
      <p class="text-[9px] text-ink-muted leading-tight max-w-[260px] mt-1">
        {{ t('system.adSupportingText', 'Los anuncios nos permiten mantener los servidores multijugador online y gratis.') }}
      </p>
    </div>
    
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>
