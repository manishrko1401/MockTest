import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { requireStaff } from "../../lib/serverAuth";
import crypto from "crypto";

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

    // Images and PDFs only (an uploaded HTML or SVG file could run code on the site)
    const ALLOWED: Record<string, string> = {
      "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "image/avif": "avif", "application/pdf": "pdf",
    };
    const fileExtension = ALLOWED[file.type];
    if (!fileExtension) {
      return NextResponse.json({ error: "Only PNG, JPG, GIF, WEBP, AVIF images or PDF files can be uploaded." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "The file is larger than 10 MB." }, { status: 400 });
    }

    // Read the file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a unique filename to prevent overwrites
    const uniqueFileName = `uploads/${Date.now()}_${crypto.randomBytes(6).toString("hex")}.${fileExtension}`;

    // Upload to Tigris
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueFileName,
        Body: buffer,
        ContentType: file.type,
      })
    );

    // The bucket is private: the file is served through /api/files (see that route)
    const fileUrl = `${new URL(req.url).origin}/api/files/${uniqueFileName}`;

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}
