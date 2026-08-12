import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const bucketName = process.env.TIGRIS_BUCKET_NAME || 'mocktest-assets';
const endpoint = process.env.TIGRIS_ENDPOINT || 'https://fly.storage.tigris.dev';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: endpoint,
  credentials: {
    accessKeyId: process.env.TIGRIS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.TIGRIS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Upload notice inner HTML content to Tigris Object Storage.
 * Stores under key: notices/html/${noticeId}.html
 * Returns a tiny reference URL.
 */
export async function uploadNoticeHtmlToTigris(noticeId: string, htmlContent: string): Promise<string> {
  if (!htmlContent) return '';

  const cleanKey = `notices/html/${noticeId}.html`;

  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: cleanKey,
      Body: htmlContent,
      ContentType: 'text/html; charset=utf-8',
    }));

    return `tigris://${cleanKey}`;
  } catch (err: any) {
    console.error(`Failed to upload notice HTML [${noticeId}] to Tigris:`, err.message);
    throw err;
  }
}

/**
 * Retrieve notice inner HTML content from Tigris Object Storage.
 * Accepts either a reference URI (tigris://notices/html/id.html) or direct S3 Key.
 */
export async function fetchNoticeHtmlFromTigris(referenceUriOrKey: string): Promise<string | null> {
  if (!referenceUriOrKey) return null;

  let key = referenceUriOrKey;
  if (key.startsWith('tigris://')) {
    key = key.replace('tigris://', '');
  } else if (key.includes('fly.storage.tigris.dev/')) {
    const parts = key.split('fly.storage.tigris.dev/');
    key = parts[1].replace(`${bucketName}/`, '');
  }

  try {
    const getObj = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }));

    if (!getObj.Body) return null;
    return await getObj.Body.transformToString();
  } catch (err: any) {
    console.error(`Failed to fetch notice HTML from Tigris for key "${key}":`, err.message);
    return null;
  }
}
