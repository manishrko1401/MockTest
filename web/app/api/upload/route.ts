import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { requireStaff } from "../../lib/serverAuth";

// S3 Client configuration for Tigris
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.TIGRIS_ENDPOINT || "https://fly.storage.tigris.dev",
  credentials: {
    accessKeyId: process.env.TIGRIS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.TIGRIS_SECRET_ACCESS_KEY || "",
  },
});

// Uploads come from the admin panel only
export async function POST(req: NextRequest) {
  const denied = await requireStaff(req, ['TEST_CREATOR', 'SUPPORT_TEAM', 'NOTICES_MANAGER']);
  if (denied) return denied;
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bucketName = process.env.TIGRIS_BUCKET_NAME;
    if (!bucketName) {
      return NextResponse.json(
        { error: "Tigris storage is not configured. TIGRIS_BUCKET_NAME is missing." },
        { status: 500 }
      );
    }

    // Read the file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a unique filename to prevent overwrites
    const fileExtension = file.name.split(".").pop() || "bin";
    const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;

    // Upload to Tigris
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueFileName,
        Body: buffer,
        ContentType: file.type,
      })
    );

    // Construct public URL
    const fileUrl = `${process.env.TIGRIS_ENDPOINT || "https://fly.storage.tigris.dev"}/${bucketName}/${uniqueFileName}`;

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}
