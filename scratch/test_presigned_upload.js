// Test presigned URL upload flow end-to-end
require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.TIGRIS_ENDPOINT || "https://fly.storage.tigris.dev",
  credentials: {
    accessKeyId: process.env.TIGRIS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.TIGRIS_SECRET_ACCESS_KEY || "",
  },
});

async function testPresignedUpload() {
  const bucketName = process.env.TIGRIS_BUCKET_NAME || "mocktest-assets";
  const fileName = "questions_test_presigned.json";
  
  console.log("1. Generating presigned URL...");
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    ContentType: 'application/json',
  });

  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });
  console.log("   Presigned URL:", presignedUrl.substring(0, 120) + "...");
  
  console.log("\n2. Testing direct upload with fetch...");
  const testData = JSON.stringify([{ id: 1, text: "Test question" }]);
  
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: testData,
  });

  console.log("   Response status:", response.status);
  console.log("   Response ok:", response.ok);
  
  if (response.ok) {
    const publicUrl = `${process.env.TIGRIS_ENDPOINT}/${bucketName}/${fileName}`;
    console.log("\n✅ Presigned URL upload SUCCESS!");
    console.log("   Public URL:", publicUrl);
  } else {
    const errBody = await response.text();
    console.log("   Response body:", errBody);
    console.log("\n❌ Presigned URL upload FAILED");
  }
}

testPresignedUpload().catch(err => console.error("Error:", err));
