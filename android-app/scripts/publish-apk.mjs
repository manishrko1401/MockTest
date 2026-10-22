// Puts the newly built Android app (APK) on the website's download page as the latest version.
//   cd android/ && gradlew.bat assembleRelease ...   (see README)
//   npm run publish:apk
// The APK (~45 MB) is kept in Tigris storage, not in the website's files: downloads cost no
// Vercel bandwidth and the git repo doesn't grow by 45 MB per release. The website's button
// (/api/download/android) always serves what web/public/downloads/android.json lists, so the
// next website deploy offers the new version.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const web = path.join(root, '..', 'web');
// The S3 library comes from the website's packages (the app itself doesn't need it)
const { S3Client, PutObjectCommand, HeadObjectCommand } = createRequire(path.join(web, 'package.json'))('@aws-sdk/client-s3');

// Storage keys from the website's .env (never printed)
const env = Object.fromEntries(fs.readFileSync(path.join(web, '.env'), 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(([, k, v]) => [k, v.replace(/^["']|["']$/g, '')]));
for (const k of ['TIGRIS_BUCKET_NAME', 'TIGRIS_ACCESS_KEY_ID', 'TIGRIS_SECRET_ACCESS_KEY']) {
  if (!env[k]) { console.error(`${k} is missing in web/.env`); process.exit(1); }
}

const gradle = fs.readFileSync(path.join(root, 'android', 'app', 'build.gradle'), 'utf8');
const version = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
const versionCode = Number(gradle.match(/versionCode\s+(\d+)/)?.[1]);
const apk = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
if (!version || !fs.existsSync(apk)) {
  console.error(`No release APK found:\n  ${apk}\nBuild it first (see README).`);
  process.exit(1);
}

const key = `apps/android/MockTestHub_${version}.apk`;
const body = fs.readFileSync(apk);
const s3 = new S3Client({
  region: 'auto',
  endpoint: env.TIGRIS_ENDPOINT || 'https://fly.storage.tigris.dev',
  credentials: { accessKeyId: env.TIGRIS_ACCESS_KEY_ID, secretAccessKey: env.TIGRIS_SECRET_ACCESS_KEY },
});
console.log(`Uploading ${(body.length / 1048576).toFixed(1)} MB as ${key} …`);
await s3.send(new PutObjectCommand({
  Bucket: env.TIGRIS_BUCKET_NAME, Key: key, Body: body,
  ContentType: 'application/vnd.android.package-archive',
  ContentDisposition: `attachment; filename="MockTestHub_${version}.apk"`,
  CacheControl: 'public, max-age=31536000, immutable',
}));
const head = await s3.send(new HeadObjectCommand({ Bucket: env.TIGRIS_BUCKET_NAME, Key: key }));
if (Number(head.ContentLength) !== body.length) { console.error('Upload size does not match.'); process.exit(1); }

const out = path.join(web, 'public', 'downloads');
fs.mkdirSync(out, { recursive: true });
const latest = { version, versionCode, releasedAt: new Date().toISOString().slice(0, 10), key, file: `MockTestHub_${version}.apk`, size: body.length, minAndroid: '7.0' };
fs.writeFileSync(path.join(out, 'android.json'), JSON.stringify(latest, null, 2) + '\n');
console.log(`Done: Android ${version} (${versionCode}). Deploy the website to offer it.`);
