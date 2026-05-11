import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tutigame.app',
  appName: 'Tuti',
  webDir: 'dist',

  // El WebView de Android sirve desde https://localhost por defecto.
  // Esto causa que el header Origin sea "https://localhost", y Cloudflare/PartyKit
  // rechaza conexiones WebSocket con ese origin.
  // Al usar el dominio real, el Origin coincide con la versión web y es aceptado.
  server: {
    hostname: 'tutigame.pages.dev',
    androidScheme: 'https'
  },

  plugins: {
    Keyboard: {
      resize: 'none',
      resizeOnFullScreen: true,
    }
  }
};

export default config;
