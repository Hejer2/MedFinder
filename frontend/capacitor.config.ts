import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.medfinder.app',
  appName: 'MedFinder',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
