// The Android app (APK) offered on this website. public/downloads/android.json is written by
// android-app/scripts/publish-apk.mjs ("npm run publish:apk"), which also uploads the APK to
// Tigris storage; nothing here needs editing for a new release.
import latest from '../../public/downloads/android.json';

export const ANDROID_APP = latest as {
  version: string;
  versionCode: number;
  releasedAt: string;
  /** Tigris object key */
  key: string;
  file: string;
  size: number;
  minAndroid: string;
};

/** Always the newest APK (the link can be shared; it never goes out of date). */
export const androidDownloadUrl = '/api/download/android';

export const apkSizeMb = () => (ANDROID_APP.size / 1048576).toFixed(0);
