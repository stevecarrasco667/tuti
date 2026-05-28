<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { useAds } from '../../composables/useAds';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  position: 'desktop-left' | 'mobile-inline' | 'lobby' | 'mobile-sticky';
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
      minHeight: '250px',
    };
  } else if (props.position === 'mobile-sticky') {
    return {
      width: '320px',
      height: '50px',
      minHeight: '50px',
    };
  } else {
    // mobile-inline
    return {
      width: '100%',
      maxWidth: '340px',
      minHeight: '100px',
    };
  }
});

onMounted(async () => {
  if (!adsEnabled.value) return;

  // Inyectar o disparar el banner de forma correspondiente al entorno
  if (isNative.value) {
    // Para Capacitor AdMob, disparamos el banner nativo flotante global
    if (props.position === 'mobile-inline' || props.position === 'lobby' || props.position === 'mobile-sticky') {
      await showBanner(containerId.value, props.position);
    }
  } else {
    // Para la Web, inyectamos AdSense en el contenedor DOM con ID único
    await showBanner(containerId.value, props.position);
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
       class="relative select-none transition-all duration-300 flex flex-col items-center justify-center"
       :style="wrapperStyles"
       :class="[
         position === 'mobile-sticky' 
           ? 'bg-transparent border-0 shadow-none rounded-none !my-0 !mx-auto' 
           : 'border border-white/5 bg-gradient-to-br from-panel-card/80 to-panel-input/50 backdrop-blur-md shadow-lg rounded-3xl p-px',
         position === 'desktop-left' ? 'my-4 mr-2' : (position !== 'mobile-sticky' ? 'my-6 mx-auto' : '')
       ]">
    
    <!-- Sutil etiqueta de publicidad de bajo impacto visual (ocultada en sticky móvil de 50px por seguridad de solapamientos) -->
    <div v-if="position !== 'mobile-sticky'" class="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-widest text-ink-muted uppercase bg-panel-base/80 border border-white/5 px-2.5 py-0.5 rounded-full z-10">
      {{ t('system.advertisement', 'ANUNCIO') }}
    </div>

    <!-- Contenedor del Anuncio (Solo Web / AdSense) -->
    <div v-if="!isNative" 
         :id="containerId" 
         class="w-full h-full flex items-center justify-center"
         :class="position === 'mobile-sticky' ? 'min-h-[50px]' : 'min-h-[100px]'">
      <!-- AdSense inyectará la etiqueta <ins> aquí en tiempo de ejecución -->
    </div>

    <!-- Espaciador Visual Seguro (Solo Móvil Capacitor / AdMob) -->
    <!-- Como AdMob nativo dibuja un banner flotante encima, evitamos el CLS o solapamiento mostrando sutil tarjeta cósmica de soporte -->
    <div v-else class="w-full p-2 text-center flex flex-col items-center justify-center animate-fade-in"
         :class="position === 'mobile-sticky' ? 'min-h-[50px]' : 'min-h-[100px]'">
      <template v-if="position !== 'mobile-sticky'">
        <h4 class="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-2">🚀 {{ t('system.supportingTuti', 'Apoyando a TutiGames') }}</h4>
        <p class="text-[9px] text-ink-muted leading-tight max-w-[260px] mt-1">
          {{ t('system.adSupportingText', 'Los anuncios nos permiten mantener los servidores multijugador online y gratis.') }}
        </p>
      </template>
      <template v-else>
        <span class="text-[8px] font-black text-ink-muted uppercase tracking-wider">💙 {{ t('system.supportingTutiShort', 'Apoyando a TutiGames') }}</span>
      </template>
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
