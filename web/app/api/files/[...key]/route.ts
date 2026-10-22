import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// Serves files the admin panel uploaded (/api/upload). The storage bucket is private, so its
// own links answer 403; this reads the file with the server's key. Only the uploads/ folder.

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.TIGRIS_ENDPOINT || 'https://fly.storage.tigris.dev',
  credentials: {
    accessKeyId: process.env.TIGRIS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.TIGRIS_SECRET_ACCESS_KEY || '',
  },
});

const SAFE_TYPES = /^(image\/(png|jpe?g|gif|webp|avif)|application\/pdf)$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const path = (key || []).join('/');
  if (!/^uploads\/[A-Za-z0-9._-]+$/.test(path)) return new Response('Not found', { status: 404 });
  const bucket = process.env.TIGRIS_BUCKET_NAME;
  if (!bucket) return new Response('Not configured', { status: 500 });

  try {
    const obj = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: path }));
    const type = obj.ContentType && SAFE_TYPES.test(obj.ContentType) ? obj.ContentType : 'application/octet-stream';
    return new Response(obj.Body?.transformToWebStream() as ReadableStream, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        // anything that is not a plain image or PDF downloads instead of opening as a page
        ...(type === 'application/octet-stream' ? { 'Content-Disposition': 'attachment' } : {}),
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
