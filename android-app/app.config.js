// MockTest Hub for Android: a native app (no website inside). It replaces the old app on
// Google Play: same app id and signing key, higher version code. Firebase (notifications) is
// switched on automatically when google-services.json is in this folder.
const fs = require('fs');
const path = require('path');

const hasFirebase = fs.existsSync(path.join(__dirname, 'google-services.json'));

module.exports = {
  expo: {
    name: 'MockTest Hub',
    slug: 'mocktesthub',
    scheme: 'mocktesthub',
    version: '2.1.6',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: { image: './assets/splash-icon.png', resizeMode: 'contain', backgroundColor: '#1e4e79' },
    android: {
      package: 'com.mocktesthub',
      // Higher than any version of the old app on Google Play
      versionCode: 107,
      adaptiveIcon: {
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      permissions: ['POST_NOTIFICATIONS', 'VIBRATE'],
      softwareKeyboardLayoutMode: 'resize',
      ...(hasFirebase ? { googleServicesFile: './google-services.json' } : {}),
    },
    platforms: ['android', 'web'],
    plugins: [
      ['expo-notifications', { icon: './assets/notification-icon.png', color: '#1e4e79' }],
      'expo-secure-store',
      'expo-web-browser',
      ['expo-image-picker', { photosPermission: 'Choose a document photo for your Document Locker.', cameraPermission: 'Take a photo of a document for your Document Locker.' }],
      './plugins/withReleaseSigning',
      './plugins/withLocalTestServer',
      './plugins/withMathJax',
    ],
    extra: {
      apiBase: 'https://mocktesthub.vercel.app',
      firebase: hasFirebase,
      // Google sign-in (same OAuth clients as the old app)
      googleWebClientId: '570110856860-a2h946nit7obiguglnjedffflto1oq95.apps.googleusercontent.com',
      googleAndroidClientId: '570110856860-vmpk8qihkb834ihj1grthuf3kumc65q6.apps.googleusercontent.com',
    },
  },
};
