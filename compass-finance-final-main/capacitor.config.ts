import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.brilliant.compassfinance',
  appName: 'Compass Finance',
  webDir: 'out',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_compass',
      iconColor: '#F0B429',
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0B0E14',
    },
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
