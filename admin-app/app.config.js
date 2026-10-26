// Mock Test Hub Admin (Android). Firebase (instant alerts when the app is closed) is switched
// on automatically when google-services.json is in this folder (see README.md).
const fs = require('fs');
const path = require('path');

const hasFirebase = fs.existsSync(path.join(__dirname, 'google-services.json'));

module.exports = {
  expo: {
    name: 'MTH Admin',
    slug: 'mth-admin',
    version: '2.1.1',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: { image: './assets/splash-icon.png', resizeMode: 'contain', backgroundColor: '#1e4e79' },
    android: {
      package: 'com.mocktesthub.adminhub',
      versionCode: 4,
      adaptiveIcon: {
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      permissions: ['POST_NOTIFICATIONS', 'VIBRATE', 'RECEIVE_BOOT_COMPLETED'],
      ...(hasFirebase ? { googleServicesFile: './google-services.json' } : {}),
    },
    platforms: ['android', 'web'],
    plugins: [
      ['expo-notifications', { icon: './assets/notification-icon.png', color: '#1e4e79' }],
      'expo-secure-store',
      'expo-web-browser',
      './plugins/withReleaseSigning',
      './plugins/withLocalTestServer',
    ],
    extra: {
      apiBase: 'https://mocktesthub.vercel.app',
      firebase: hasFirebase,
    },
  },
};
