import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.compass.finance',
  appName: 'Compass Finance',
  webDir: 'out',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_compass',
      iconColor: '#F0B429'
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0B0E14'
    },
    CapacitorUpdater: {
      autoUpdate: true,
      appId: "com.compass.finance",
      defaultChannel: "production"
    }
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;
