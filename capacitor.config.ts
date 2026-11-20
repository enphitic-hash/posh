import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ug.co.poshproperties.passport',
  appName: 'Posh',
  webDir: 'dist',
  backgroundColor: '#0B4A24',
  android: { backgroundColor: '#0B4A24' },
  plugins: {
    SplashScreen: { launchShowDuration: 1200, launchAutoHide: true, backgroundColor: '#0B4A24', androidScaleType: 'CENTER_CROP', showSpinner: false },
    StatusBar: { backgroundColor: '#062E17', style: 'DARK' },
  },
}

export default config
