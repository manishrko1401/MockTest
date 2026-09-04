import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Dedicated Typing Tigris Storage Configuration
// Can use a completely different Tigris account by setting TYPING_TIGRIS_* in .env
const bucketName = process.env.TYPING_TIGRIS_BUCKET_NAME || process.env.TIGRIS_BUCKET_NAME || 'mocktest-assets';
const endpoint = process.env.TYPING_TIGRIS_ENDPOINT || process.env.TIGRIS_ENDPOINT || 'https://fly.storage.tigris.dev';
const accessKeyId = process.env.TYPING_TIGRIS_ACCESS_KEY_ID || process.env.TIGRIS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.TYPING_TIGRIS_SECRET_ACCESS_KEY || process.env.TIGRIS_SECRET_ACCESS_KEY || '';

// Singleton S3 client for Typing Tigris storage
let s3ClientInstance: S3Client | null = null;

function getS3Client(): S3Client | null {
  if (!accessKeyId || !secretAccessKey) {
    return null;
  }
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return s3ClientInstance;
}

export function isTigrisTypingConfigured(): boolean {
  return Boolean(accessKeyId && secretAccessKey);
}

// In-memory LRU cache for fetched passages to guarantee sub-millisecond load times
const passageMemoryCache = new Map<string, { text: string; cachedAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

/**
 * Upload typing passage text to dedicated Tigris Object Storage.
 * Stores under key: typing-passages/${testId}.txt
 * Returns a compact URI: tigris-typing://typing-passages/${testId}.txt
 */
export async function uploadTypingPassageToTigris(testId: string, passageText: string): Promise<string> {
  if (!passageText || !passageText.trim()) return '';

  const s3 = getS3Client();
  if (!s3) {
    // If Tigris credentials not configured yet, return raw passage text to be stored in DB
    return passageText;
  }

  const cleanKey = `typing-passages/${testId}.txt`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: cleanKey,
        Body: passageText.trim(),
        ContentType: 'text/plain; charset=utf-8',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    const refUri = `tigris-typing://${cleanKey}`;
    // Seed local cache immediately
    passageMemoryCache.set(refUri, { text: passageText.trim(), cachedAt: Date.now() });
    passageMemoryCache.set(cleanKey, { text: passageText.trim(), cachedAt: Date.now() });

    return refUri;
  } catch (err: any) {
    console.error(`Failed to upload typing passage [${testId}] to Tigris:`, err.message);
    // Graceful fallback to raw text if S3 upload fails
    return passageText;
  }
}

/**
 * Retrieve typing passage text from dedicated Tigris Object Storage.
 * Accepts reference URI (tigris-typing://..., tigris://...) or direct S3 Key or HTTP URL.
 */
export async function fetchTypingPassageFromTigris(referenceUriOrKey: string): Promise<string | null> {
  if (!referenceUriOrKey) return null;

  // If it does NOT start with a tigris indicator or URL, it is already the raw passage text!
  if (
    !referenceUriOrKey.startsWith('tigris-typing://') &&
    !referenceUriOrKey.startsWith('tigris://') &&
    !referenceUriOrKey.startsWith('http://') &&
    !referenceUriOrKey.startsWith('https://')
  ) {
    return referenceUriOrKey;
  }

  // Check in-memory cache first
  const cached = passageMemoryCache.get(referenceUriOrKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.text;
  }

  // If it is a full HTTPS URL, fetch directly
  if (referenceUriOrKey.startsWith('http://') || referenceUriOrKey.startsWith('https://')) {
    try {
      const res = await fetch(referenceUriOrKey, { next: { revalidate: 3600 } });
      if (res.ok) {
        const text = await res.text();
        passageMemoryCache.set(referenceUriOrKey, { text, cachedAt: Date.now() });
        return text;
      }
    } catch (e: any) {
      console.error(`Failed to fetch passage from URL ${referenceUriOrKey}:`, e.message);
    }
  }

  // Resolve S3 key
  let key = referenceUriOrKey;
  if (key.startsWith('tigris-typing://')) {
    key = key.replace('tigris-typing://', '');
  } else if (key.startsWith('tigris://')) {
    key = key.replace('tigris://', '');
  } else if (key.includes('fly.storage.tigris.dev/')) {
    const parts = key.split('fly.storage.tigris.dev/');
    key = parts[1].replace(`${bucketName}/`, '');
  }

  const s3 = getS3Client();
  if (!s3) {
    // If credentials missing and it was a URL, we already attempted fetch above.
    return null;
  }

  try {
    const getObj = await s3.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );

    if (!getObj.Body) return null;
    const text = await getObj.Body.transformToString();

    // Cache the result
    passageMemoryCache.set(referenceUriOrKey, { text, cachedAt: Date.now() });
    passageMemoryCache.set(key, { text, cachedAt: Date.now() });

    return text;
  } catch (err: any) {
    console.error(`Failed to fetch typing passage from Tigris for key "${key}":`, err.message);
    return null;
  }
}

/**
 * Delete typing passage from dedicated Tigris Object Storage.
 */
export async function deleteTypingPassageFromTigris(referenceUriOrKey: string): Promise<boolean> {
  if (!referenceUriOrKey) return true;
  if (!referenceUriOrKey.startsWith('tigris-typing://') && !referenceUriOrKey.startsWith('tigris://')) {
    return true;
  }

  let key = referenceUriOrKey.replace('tigris-typing://', '').replace('tigris://', '');
  const s3 = getS3Client();
  if (!s3) return false;

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );
    passageMemoryCache.delete(referenceUriOrKey);
    passageMemoryCache.delete(key);
    return true;
  } catch (e: any) {
    console.error(`Failed to delete passage from Tigris key "${key}":`, e.message);
    return false;
  }
}
