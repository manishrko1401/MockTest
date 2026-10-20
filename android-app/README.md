# MockTest Hub (Android, v2)

The new, fully native student app. It replaces the old app on Google Play: same app id
`com.mocktesthub`, same signing key, version 2.0.0 (versionCode 100; the old app was 1).
It talks to the website's `/api/db`, so the website must be deployed with the matching
server changes for it to work.

Features: sign in / sign up / Google / forgot password, home, job notices and saved jobs, test
series with the exam screen (TCS-style palette, sections, resume, violation guard, screenshot
block), result analysis and solutions, bookmarks, CBAT, typing tests, Study Planner, Document
Locker (Google Drive), offline downloads (encrypted for the phone, results upload later),
referrals, Pass Pro, support chat, Hindi.

## Sign-in sessions

The app gets its own login session (`authToken`, sent as `Authorization: Bearer`), so signing in
on the phone never signs you out of the website. Only a "sign in again" answer from the server
signs the app out; network errors never do.

## Shared code with the website

Scoring, the exam engine, typing rules, CBAT and the planner logic are copied from `web/` into
`src/shared` by:

```
npm run sync-shared
```

Run it after changing those files on the website, then rebuild.

## Build (Windows)

```
cd android-app
npm install --legacy-peer-deps
npm run sync-shared
npx expo prebuild -p android --clean   # after changing app.config.js, icons, plugins or google-services.json
# android/local.properties:  sdk.dir=C\:/Users/<you>/AppData/Local/Android/Sdk
cd android
gradlew.bat assembleRelease bundleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a
```

- APK (install on a phone): `android/app/build/outputs/apk/release/app-release.apk`
- AAB (upload to Google Play): `android/app/build/outputs/bundle/release/app-release.aab`

Signing uses `keystore/my-release-key.keystore` and `keystore/keystore.properties` (not in git;
back them up). Without that key Google Play will not accept the update.

## Publishing on Google Play

1. Play Console → the existing MockTest Hub app → **Production → Create new release**.
2. Upload `app-release.aab`. Play checks that it is signed with the app's upload key
   (SHA-1 `1B:6C:6F:AC:50:7A:28:FF:EE:33:85:1B:75:47:99:A2:7C:B8:23:E7`).
3. Each later release needs a higher `versionCode` in `app.config.js`.

## Notifications (Firebase)

The app creates its notification channels and asks for permission. For push notifications
from the server, add Firebase:

1. In the Firebase project (the same one as the admin app is fine): **Add app → Android**,
   package `com.mocktesthub` → download `google-services.json` into this folder.
2. Rebuild (prebuild + gradle). The app then gets a push token on the phone.
3. Sending pushes to students (new notices, support replies) still needs a server endpoint,
   like `web/app/lib/adminPush.ts` does for staff.

## Testing without a phone

```
npx expo export -p web --output-dir <folder>
```

serves a browser preview of the app (offline downloads are phone-only). In the app, a long
press on the logo on the sign-in screen sets another server (e.g. `http://10.0.2.2:3000` for an
emulator talking to a local website).
