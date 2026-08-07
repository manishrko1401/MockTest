// Script to configure CORS on Tigris S3 bucket for direct browser uploads
const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.TIGRIS_ENDPOINT || "https://fly.storage.tigris.dev",
  credentials: {
    accessKeyId: process.env.TIGRIS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.TIGRIS_SECRET_ACCESS_KEY || "",
  },
});

async function configureCors() {
  const bucketName = process.env.TIGRIS_BUCKET_NAME || "mocktest-assets";
  
  const corsConfig = {
    Bucket: bucketName,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
          AllowedOrigins: [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://mock-test-hub.vercel.app",
            "https://*.vercel.app",
            "https://mocktesthub.in",
            "https://www.mocktesthub.in",
            "*"
          ],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  };

  try {
    await s3Client.send(new PutBucketCorsCommand(corsConfig));
    console.log(`✅ CORS configured successfully on bucket: ${bucketName}`);
    console.log('Allowed origins:', corsConfig.CORSConfiguration.CORSRules[0].AllowedOrigins);
    console.log('Allowed methods:', corsConfig.CORSConfiguration.CORSRules[0].AllowedMethods);
  } catch (err) {
    console.error('❌ Failed to configure CORS:', err.message || err);
  }
}

configureCors();
