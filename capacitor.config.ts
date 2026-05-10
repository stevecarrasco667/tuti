import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tutigame.app',
  appName: 'Tuti',
  webDir: 'dist',

  plugins: {
    Keyboard: {
      resize: 'none',
      resizeOnFullScreen: true,
    }
  }
};

export default config;
