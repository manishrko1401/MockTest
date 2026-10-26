// The splash shown the moment the app opens: the MockTest Hub trophy on brand blue, instead of
// Expo's placeholder. Android 7–11 draw splash_screen.xml as the window background; Android 12+
// use the system splash (same blue, same trophy). The app's own loading screen (BrandLoading
// in App.tsx) looks the same, so the hand-over is seamless.
//   node plugins/withBrandSplash.js   applies it to the existing android/ folder
const fs = require('fs');
const path = require('path');

const BLUE = '#1e4e79';

const SPLASH_XML = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:drawable="@color/splashscreen_background" />
  <item android:width="132dp" android:height="132dp" android:gravity="center">
    <bitmap android:src="@drawable/splash_trophy" android:gravity="fill" />
  </item>
</layer-list>
`;
// Android 12+ icon: 288dp canvas, content must sit inside the middle 192dp circle
const ICON_V31_XML = `<?xml version="1.0" encoding="utf-8"?>
<inset xmlns:android="http://schemas.android.com/apk/res/android" android:drawable="@drawable/splash_trophy" android:inset="27%" />
`;
const STYLES_V31_XML = `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <style name="Theme.App.SplashScreen" parent="AppTheme">
    <item name="android:windowBackground">@drawable/splash_screen</item>
    <item name="android:windowSplashScreenBackground">@color/splashscreen_background</item>
    <item name="android:windowSplashScreenAnimatedIcon">@drawable/splash_icon_v31</item>
  </style>
</resources>
`;

/** Writes the drawables and the Android 12 style into android/app/src/main/res. */
function writeFiles(projectRoot, resDir) {
  const drawable = path.join(resDir, 'drawable');
  const nodpi = path.join(resDir, 'drawable-nodpi');
  const v31 = path.join(resDir, 'values-v31');
  for (const d of [drawable, nodpi, v31]) fs.mkdirSync(d, { recursive: true });
  fs.copyFileSync(path.join(projectRoot, 'assets', 'splash-icon.png'), path.join(nodpi, 'splash_trophy.png'));
  fs.writeFileSync(path.join(drawable, 'splash_screen.xml'), SPLASH_XML);
  fs.writeFileSync(path.join(drawable, 'splash_icon_v31.xml'), ICON_V31_XML);
  fs.writeFileSync(path.join(v31, 'styles.xml'), STYLES_V31_XML);
  // Expo's placeholder picture (still referenced by the template's ic_launcher_background.xml)
  // becomes the trophy too
  fs.copyFileSync(path.join(projectRoot, 'assets', 'splash-icon.png'), path.join(nodpi, 'splashscreen_logo.png'));
  for (const dir of fs.readdirSync(resDir)) {
    const f = path.join(resDir, dir, 'splashscreen_logo.png');
    if (dir.startsWith('drawable') && dir !== 'drawable-nodpi' && fs.existsSync(f)) fs.unlinkSync(f);
  }
}

/** colors.xml / styles.xml as text (used when applying to an existing android/ folder). */
function patchValues(resDir) {
  const colors = path.join(resDir, 'values', 'colors.xml');
  let c = fs.readFileSync(colors, 'utf8');
  c = /name="splashscreen_background"/.test(c)
    ? c.replace(/(<color name="splashscreen_background">)[^<]*(<\/color>)/, `$1${BLUE}$2`)
    : c.replace('</resources>', `  <color name="splashscreen_background">${BLUE}</color>\n</resources>`);
  fs.writeFileSync(colors, c);
  const styles = path.join(resDir, 'values', 'styles.xml');
  let s = fs.readFileSync(styles, 'utf8');
  s = s.replace(/(<style name="Theme\.App\.SplashScreen"[^>]*>[\s\S]*?<item name="android:windowBackground">)[^<]*(<\/item>)/, '$1@drawable/splash_screen$2');
  if (!/<style name="AppTheme"[^>]*>[\s\S]*?android:windowBackground[\s\S]*?<\/style>/.test(s.split('Theme.App.SplashScreen')[0])) {
    s = s.replace(/(<style name="AppTheme"[^>]*>)/, '$1\n    <item name="android:windowBackground">@color/splashscreen_background</item>');
  }
  fs.writeFileSync(styles, s);
}

module.exports = function withBrandSplash(config) {
  const { withDangerousMod, withAndroidColors, withAndroidStyles, AndroidConfig } = require('expo/config-plugins');
  config = withAndroidColors(config, (cfg) => {
    cfg.modResults = AndroidConfig.Colors.assignColorValue(cfg.modResults, { name: 'splashscreen_background', value: BLUE });
    return cfg;
  });
  config = withAndroidStyles(config, (cfg) => {
    // Splash theme: blue + trophy. App theme: blue until the app sets the theme's own colour
    // (expo-system-ui), so there is no white flash between the splash and the first screen.
    for (const [name, value] of [['Theme.App.SplashScreen', '@drawable/splash_screen'], ['AppTheme', '@color/splashscreen_background']]) {
      const style = cfg.modResults.resources.style?.find(st => st.$.name === name);
      if (!style) continue;
      style.item = (style.item || []).filter(i => i.$.name !== 'android:windowBackground');
      style.item.push({ $: { name: 'android:windowBackground' }, _: value });
    }
    return cfg;
  });
  return withDangerousMod(config, ['android', async (cfg) => {
    writeFiles(cfg.modRequest.projectRoot, path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res'));
    return cfg;
  }]);
};

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const res = path.join(root, 'android', 'app', 'src', 'main', 'res');
  writeFiles(root, res);
  patchValues(res);
  console.log('Brand splash applied to android/');
}
