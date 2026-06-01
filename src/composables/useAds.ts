import { ref } from 'vue';
import { supabase } from '../lib/supabase';

// ── Tipos y Configuración ──────────────────────────────────────────────────────
export interface AdConfig {
  adsDisabled: boolean;
  adSenseClientId: string;
  adSenseSlotBanner: string;
  adMobBannerId: string;
  adMobInterstitialId: string;
}

// IDs de Prueba Oficiales de Google (Evitan baneos en desarrollo y QA)
const DEFAULT_CONFIG: AdConfig = {
  adsDisabled: false,
  adSenseClientId: 'ca-pub-3940256099942544',      // AdSense Test Publisher
  adSenseSlotBanner: '1234567890',
  adMobBannerId: 'ca-app-pub-3940256099942544/6300978111',      // AdMob Android Banner Test ID
  adMobInterstitialId: 'ca-app-pub-3940256099942544/1033173712', // AdMob Android Interstitial Test ID
};

// ── Estado Singleton (Mantenido en caliente entre rutas) ────────────────────────
const isNative = ref(false);
const adsInitialized = ref(false);
const adsEnabled = ref(true);
const config = ref<AdConfig>({ ...DEFAULT_CONFIG });

// Guardar referencias a listeners para evitar duplicados y memory leaks
let adMobDismissListener: any = null;
let adMobFailedListener: any = null;

export function useAds() {

  /**
   * Inicializa de forma segura la infraestructura de anuncios detectando el entorno.
   * Consulta el Kill Switch en Supabase antes de cargar cualquier SDK o elemento.
   */
  const initAds = async () => {
    if (adsInitialized.value) return;

    // 1. Detección de entorno Nativo vs Web
    isNative.value = !!(window as any).Capacitor?.isNativePlatform?.();

    try {
      const { data, error } = await supabase
        .from('global_config')
        .select('value')
        .eq('key', 'ads_disabled')
        .single();

      if (error) {
        console.info('[Ads] Nota: No se pudo leer el Kill Switch en Supabase (puede ser debido a que la tabla global_config no existe aún en este entorno). Usando fallback local activo.', error.message);
      } else if (data) {
        // data.value puede ser un booleano directo o venir encapsulado en JSON
        const disabledVal = typeof data.value === 'object' && data.value !== null 
          ? (data.value as any).disabled 
          : data.value;
          
        if (disabledVal === true || disabledVal === 'true') {
          console.warn('[Ads] 🛡️ Kill Switch activo de forma remota. Anuncios deshabilitados.');
          adsEnabled.value = false;
          adsInitialized.value = true;
          return;
        }
      }
    } catch (e: any) {
      // Fallback seguro: si Supabase no responde o la tabla no existe, los anuncios se mantienen activos por defecto
      console.warn('[Ads] ⚠️ Supabase no disponible para Kill Switch, utilizando configuración local activa.', e?.message || e);
    }

    // 3. Cargar credenciales desde variables de entorno si están configuradas
    config.value.adSenseClientId = import.meta.env.VITE_ADSENSE_CLIENT_ID || DEFAULT_CONFIG.adSenseClientId;
    config.value.adSenseSlotBanner = import.meta.env.VITE_ADSENSE_SLOT_BANNER || DEFAULT_CONFIG.adSenseSlotBanner;
    config.value.adMobBannerId = import.meta.env.VITE_ADMOB_BANNER_ID || DEFAULT_CONFIG.adMobBannerId;
    config.value.adMobInterstitialId = import.meta.env.VITE_ADMOB_INTERSTITIAL_ID || DEFAULT_CONFIG.adMobInterstitialId;

    // 4. Inicialización según Plataforma
    if (isNative.value) {
      await initAdMob();
    } else {
      await initAdSense();
    }

    adsInitialized.value = true;
  };

  /**
   * Inicializa el SDK de AdMob (Capacitor Nativo)
   */
  const initAdMob = async () => {
    try {
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.initialize({
        initializeForTesting: import.meta.env.DEV, // IDs de test en desarrollo
      });
      console.log('[Ads] 📱 AdMob inicializado con éxito.');
    } catch (err) {
      console.error('[Ads] ❌ Error inicializando AdMob nativo:', err);
    }
  };

  /**
   * Inicializa el script y tag de AdSense (Navegador Web)
   */
  const initAdSense = async () => {
    try {
      if (document.querySelector('script[src*="adsbygoogle.js"]')) return; // Evita inyecciones duplicadas
      
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.value.adSenseClientId}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
      console.log('[Ads] 🌐 Script de AdSense inyectado en cabecera.');
    } catch (err) {
      console.error('[Ads] ❌ Error inyectando script de AdSense:', err);
    }
  };

  /**
   * Inyecta de forma segura un banner publicitario en un contenedor específico
   * @param containerId ID del elemento DOM donde se insertará el banner web
   * @param adType 'desktop' para banner lateral grande | 'mobile' para banner pequeño fijo
   */
  const showBanner = async (containerId: string, adType: 'desktop' | 'mobile' = 'mobile') => {
    if (!adsEnabled.value) return;

    try {
      if (isNative.value) {
        const { AdMob, BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob');
        
        await AdMob.showBanner({
          adId: config.value.adMobBannerId,
          adSize: BannerAdSize.BANNER,           // Tamaño estándar pequeño (320×50) — no ocupa toda la pantalla
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,                             // Sin margen extra para que el banner quede pegado al borde inferior
          isTesting: import.meta.env.DEV
        });
      } else {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Salvaguarda indestructible contra 'availableWidth=0':
        // Si el contenedor mide 0px de ancho físico (oculto por CSS responsivo o aún no maquetado),
        // abortamos la inyección para evitar que el script de AdSense falle en consola.
        const width = container.offsetWidth;
        if (width === 0) {
          console.info(`[Ads] Contenedor '${containerId}' mide 0px (oculto por CSS). Omitiendo inyección.`);
          return;
        }

        container.innerHTML = ''; // Limpiar contenedor
        
        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.setAttribute('data-ad-client', config.value.adSenseClientId);
        ins.setAttribute('data-ad-slot', config.value.adSenseSlotBanner);

        if (adType === 'desktop') {
          // Desktop lateral: banner vertical grande (skyscraper 160x600)
          // Usamos format:auto sin responsive para que AdSense elija el mejor vertical
          ins.style.width = '160px';
          ins.style.minHeight = '600px';
          ins.setAttribute('data-ad-format', 'auto');
        } else {
          // Mobile / lobby: banner horizontal fijo pequeño (320×50)
          // SIN data-ad-format:auto ni data-full-width-responsive — evita que en móvil
          // real Google elija anuncios enormes (250px+)
          ins.style.width = '320px';
          ins.style.height = '50px';
          ins.style.maxWidth = '100%';
        }
        
        container.appendChild(ins);

        // Disparar push de anuncios
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        console.log(`[Ads] Banner de AdSense cargado (tipo: ${adType}).`);
      }
    } catch (err) {
      console.warn('[Ads] ⚠️ Error al mostrar el banner publicitario:', err);
    }
  };

  /**
   * Oculta y retira el banner publicitario activo en pantalla
   */
  const hideBanner = async () => {
    if (!isNative.value) return; // En web el banner simplemente fluye con el DOM
    try {
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.removeBanner();
    } catch (err) {
      console.warn('[Ads] Error al ocultar banner de AdMob:', err);
    }
  };

  /**
   * Realiza una precarga (Pre-caching) silenciosa en segundo plano del anuncio intersticial.
   * Se ejecuta durante el transcurso del juego o al iniciar la pantalla de fin de partida.
   */
  const preloadInterstitial = async () => {
    if (!adsEnabled.value || !isNative.value) return;
    try {
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.prepareInterstitial({
        adId: config.value.adMobInterstitialId,
        isTesting: import.meta.env.DEV
      });
      console.log('[Ads] 🎬 Anuncio intersticial nativo precargado en segundo plano.');
    } catch (err) {
      console.warn('[Ads] Error al precargar intersticial:', err);
    }
  };

  /**
   * Dispara el anuncio intersticial nativo de video a pantalla completa.
   * Retorna una Promesa que se resuelve únicamente cuando el usuario CIERRA o FALLA el anuncio,
   * con un temporizador estricto de Grace Timeout (1.5 segundos) que salta limpia y rápidamente para no arruinar la UX.
   */
  const triggerInterstitial = async (): Promise<boolean> => {
    if (!adsEnabled.value) return false;

    return new Promise(async (resolve) => {
      let resolved = false;

      // ── Margen de Seguridad: Grace Timeout (1.5s) ──
      const graceTimer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanupListeners();
          console.warn('[Ads] ⏱️ Timeout del anuncio intersticial excedido (1.5s). Continuando partida de inmediato.');
          resolve(false);
        }
      }, 1500);

      // Limpieza interna de listeners para evitar solapamientos y pérdidas de memoria
      const cleanupListeners = () => {
        if (adMobDismissListener) {
          adMobDismissListener.remove();
          adMobDismissListener = null;
        }
        if (adMobFailedListener) {
          adMobFailedListener.remove();
          adMobFailedListener = null;
        }
      };

      try {
        if (isNative.value) {
          const { AdMob } = await import('@capacitor-community/admob');

          // Suscribirse a los eventos de cierre y error del plugin Capacitor
          adMobDismissListener = await AdMob.addListener('interstitialAdDismissed' as any, () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(graceTimer);
              cleanupListeners();
              console.log('[Ads] 🎬 Intersticial cerrado correctamente por el usuario.');
              resolve(true);
            }
          });

          adMobFailedListener = await AdMob.addListener('interstitialAdFailedToShow' as any, () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(graceTimer);
              cleanupListeners();
              console.warn('[Ads] 🎬 Falló la muestra del intersticial nativo.');
              resolve(false);
            }
          });

          // Disparar la visualización del anuncio precargado
          await AdMob.showInterstitial();
        } else {
          // Entorno Web: AdSense no dispone de trigger programático imperativo asíncrono nativo.
          // Resuelve de inmediato para que la web no se congele buscando llamadas no soportadas.
          resolved = true;
          clearTimeout(graceTimer);
          resolve(false);
        }
      } catch (err) {
        console.error('[Ads] ❌ Excepción en triggerInterstitial:', err);
        if (!resolved) {
          resolved = true;
          clearTimeout(graceTimer);
          cleanupListeners();
          resolve(false);
        }
      }
    });
  };

  return {
    initAds,
    showBanner,
    hideBanner,
    preloadInterstitial,
    triggerInterstitial,
    adsEnabled,
    isNative,
  };
}
