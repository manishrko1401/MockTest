import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ANDROID_APP } from '../../../lib/androidApp';

// Sends the newest Android APK. The file lives in private Tigris storage (too big for the
// website's own files), so this hands out a short-lived download link to it. Never cached, so a
// new release is served as soon as the website is deployed.
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.TIGRIS_ENDPOINT || 'https://fly.storage.tigris.dev',
  credentials: {
    accessKeyId: process.env.TIGRIS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.TIGRIS_SECRET_ACCESS_KEY || '',
  },
});

export async function GET(request: Request) {
  try {
    const url = await getSignedUrl(s3, new GetObjectCommand({
      Bucket: process.env.TIGRIS_BUCKET_NAME,
      Key: ANDROID_APP.key,
      ResponseContentType: 'application/vnd.android.package-archive',
      ResponseContentDisposition: `attachment; filename="${ANDROID_APP.file}"`,
    }), { expiresIn: 600 });
    const res = NextResponse.redirect(url, 302);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (e) {
    console.error('android download', e);
    return NextResponse.redirect(new URL('/download?platform=android&error=1', request.url), 302);
  }
}
