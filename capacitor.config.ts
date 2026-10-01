import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.meta.codeatlas',
  appName: 'Meta',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
