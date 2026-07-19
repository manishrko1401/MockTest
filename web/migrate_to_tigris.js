const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// 1. Manually parse .env variables
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8').replace(/\r/g, '');
  for (const line of envConfig.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value;
    }
  }
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌ Error: DATABASE_URL not found in .env");
  process.exit(1);
}

// 2. Validate environment
const bucketName = process.env.TIGRIS_BUCKET_NAME;
const endpoint = process.env.TIGRIS_ENDPOINT || 'https://fly.storage.tigris.dev';
const accessKeyId = process.env.TIGRIS_ACCESS_KEY_ID;
const secretAccessKey = process.env.TIGRIS_SECRET_ACCESS_KEY;

if (!bucketName || !accessKeyId || !secretAccessKey) {
  console.error("❌ Error: Missing Tigris configuration in .env");
  process.exit(1);
}

console.log(`ℹ️ Configured S3 Endpoint: ${endpoint}`);
console.log(`ℹ️ Target Bucket: ${bucketName}`);

// 3. Initialize Clients
const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const s3Client = new S3Client({
  region: "auto",
  endpoint: endpoint,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
});

// Helper: parse Base64 and upload to S3
async function uploadBase64(base64Str, prefix) {
  try {
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }
    const contentType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Guess file extension
    let ext = 'bin';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
    else if (contentType.includes('gif')) ext = 'gif';
    else if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('pdf')) ext = 'pdf';

    const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: contentType,
      })
    );

    const s3Url = `${endpoint}/${bucketName}/${fileName}`;
    return s3Url;
  } catch (err) {
    console.error(`❌ Upload error:`, err);
    return null;
  }
}

// Helper: upload JSON array to S3
async function uploadJSON(jsonArray, prefix) {
  try {
    const fileName = `${prefix}.json`;
    const buffer = Buffer.from(JSON.stringify(jsonArray));

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: "application/json",
      })
    );

    const s3Url = `${endpoint}/${bucketName}/${fileName}`;
    return s3Url;
  } catch (err) {
    console.error(`❌ JSON Upload error:`, err);
    return null;
  }
}

async function runMigration() {
  try {
    console.log("🚀 Starting Database Media Migration to Tigris...");

    // ==========================================
    // 1. Migrate Notices image URLs
    // ==========================================
    console.log("🔍 Scanning notices table...");
    const notices = await prisma.notice.findMany({
      where: {
        imageUrl: {
          startsWith: 'data:image/',
        },
      },
    });

    console.log(`💡 Found ${notices.length} notices with Base64 images.`);
    for (const notice of notices) {
      console.log(`⏳ Migrating notice ID: ${notice.id} - "${notice.title.substring(0, 30)}..."`);
      const s3Url = await uploadBase64(notice.imageUrl, `notice_${notice.id}`);
      if (s3Url) {
        await prisma.notice.update({
          where: { id: notice.id },
          data: { imageUrl: s3Url },
        });
        console.log(`✅ Success! Migrated to S3 URL: ${s3Url}`);
      } else {
        console.log(`❌ Failed to migrate notice ID: ${notice.id}`);
      }
    }

    // ==========================================
    // 2. Migrate User profile photos
    // ==========================================
    console.log("🔍 Scanning users table...");
    const users = await prisma.user.findMany({
      where: {
        profilePhoto: {
          startsWith: 'data:image/',
        },
      },
    });

    console.log(`💡 Found ${users.length} users with Base64 profile photos.`);
    for (const user of users) {
      console.log(`⏳ Migrating user ID: ${user.id} - ${user.fullName}`);
      const s3Url = await uploadBase64(user.profilePhoto, `user_${user.id}`);
      if (s3Url) {
        await prisma.user.update({
          where: { id: user.id },
          data: { profilePhoto: s3Url },
        });
        console.log(`✅ Success! Migrated to S3 URL: ${s3Url}`);
      } else {
        console.log(`❌ Failed to migrate user ID: ${user.id}`);
      }
    }

    // ==========================================
    // 3. Migrate Category logos
    // ==========================================
    console.log("🔍 Scanning categories table...");
    const categories = await prisma.category.findMany({
      where: {
        logoUrl: {
          startsWith: 'data:image/',
        },
      },
    });

    console.log(`💡 Found ${categories.length} categories with Base64 logos.`);
    for (const cat of categories) {
      console.log(`⏳ Migrating category ID: ${cat.id} - ${cat.name}`);
      const s3Url = await uploadBase64(cat.logoUrl, `cat_${cat.id}`);
      if (s3Url) {
        await prisma.category.update({
          where: { id: cat.id },
          data: { logoUrl: s3Url },
        });
        console.log(`✅ Success! Migrated to S3 URL: ${s3Url}`);
      } else {
        console.log(`❌ Failed to migrate category ID: ${cat.id}`);
      }
    }

    // ==========================================
    // 4. Migrate MockTest custom questions JSON
    // ==========================================
    console.log("🔍 Scanning mocktests table for custom questions...");
    const mockTests = await prisma.mockTest.findMany();

    let migratedTestsCount = 0;
    for (const test of mockTests) {
      const questions = test.customQuestions;
      
      if (questions && Array.isArray(questions)) {
        console.log(`⏳ Migrating questions JSON for mocktest ID: ${test.id} - "${test.title}" (${questions.length} questions)`);
        const s3Url = await uploadJSON(questions, `questions_${test.id}`);
        if (s3Url) {
          await prisma.mockTest.update({
            where: { id: test.id },
            data: {
              customQuestions: { url: s3Url },
              questionsCount: questions.length,
            },
          });
          console.log(`✅ Success! Migrated to S3 URL: ${s3Url}`);
          migratedTestsCount++;
        } else {
          console.log(`❌ Failed to migrate mocktest ID: ${test.id}`);
        }
      }
    }
    console.log(`💡 Finished mock tests migration. Total JSON tests offloaded to S3: ${migratedTestsCount}`);

    console.log("🎉 Migration process completed successfully!");
  } catch (err) {
    console.error("❌ Migration critical error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
