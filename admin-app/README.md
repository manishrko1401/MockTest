# Mock Test Hub Admin (Android)

Staff app for Mock Test Hub: instant alerts and a live inbox for support chats, reported
questions, contact inquiries, suggestions and feedback; a dashboard; users; notices; and quick
content tools. It talks to the website (`/api/admin-app`, plus `/api/db` for notices and test
edits), so the website must be deployed for it to work.

- App id: `com.mocktesthub.adminhub` (installs next to the old `mobile-admin` app)
- Sign-in: any staff account (Admin, Support team, Test creator, Notices manager). Each role
  only sees what it may use. The app has its own login session, so it never signs you out of the
  website or the student app.

## Instant alerts (Firebase)

While the app is open, new messages pop up within ~4 seconds. For alerts when the app is
closed or the phone is locked, Firebase Cloud Messaging (free) is needed:

1. Go to https://console.firebase.google.com → **Add project** (e.g. "Mock Test Hub"). Google
   Analytics is not needed.
2. In the project: **Add app → Android**, package name `com.mocktesthub.adminhub` → Register →
   **Download google-services.json**. Put it in this folder (`admin-app/google-services.json`).
3. **Project settings → Service accounts → Generate new private key**. This downloads a JSON
   key file. Keep it secret.
4. In Vercel (website project) → Settings → Environment Variables, add `FCM_SERVICE_ACCOUNT`
   with the whole content of that JSON file (or the file base64-encoded). Redeploy.
5. Rebuild the app (below) and install it. In the app: **More → Settings & alerts → Send test
   alert**.

## Build the APK (Windows)

```
cd admin-app
npm install --legacy-peer-deps
npx expo prebuild -p android          # after changing app.config.js, icons or adding google-services.json
cd android
gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a
```

The APK is `android/app/build/outputs/apk/release/app-release.apk`.

**Signing key:** `keystore/` holds the app's signing key and its passwords. Back it up
somewhere private. Every update must be signed with the same key, or phones refuse to install
it over the old version. It is not in git.

## Icons

`python assets/make_icons.py` rebuilds the icons from `desktop/app-icon.png`.
