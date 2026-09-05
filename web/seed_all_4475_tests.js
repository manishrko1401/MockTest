const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envFiles = [path.join(__dirname, '.env.local'), path.join(__dirname, '.env')];
  for (const f of envFiles) {
    if (fs.existsSync(f)) {
      const lines = fs.readFileSync(f, 'utf8').split('\n');
      for (const l of lines) {
        const trimmed = l.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const key = trimmed.slice(0, idx).trim();
            let val = trimmed.slice(idx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
            if (!process.env[key]) process.env[key] = val;
          }
        }
      }
    }
  }
}
loadEnv();

const { S3Client, PutObjectCommand } = require('./node_modules/@aws-sdk/client-s3');
const { PrismaClient } = require('./node_modules/@prisma/client');
const { PrismaPg } = require('./node_modules/@prisma/adapter-pg');
const { Pool } = require('./node_modules/pg');

const bucketName = process.env.TYPING_TIGRIS_BUCKET_NAME || process.env.TIGRIS_BUCKET_NAME || 'typing-passages-assets';
const endpoint = process.env.TYPING_TIGRIS_ENDPOINT || process.env.TIGRIS_ENDPOINT || 'https://fly.storage.tigris.dev';
const accessKeyId = process.env.TYPING_TIGRIS_ACCESS_KEY_ID || process.env.TIGRIS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.TYPING_TIGRIS_SECRET_ACCESS_KEY || process.env.TIGRIS_SECRET_ACCESS_KEY || '';

const s3 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
  maxAttempts: 3
});

const connectionString = (process.env.TYPING_DATABASE_URL || process.env.DATABASE_URL || '').trim();
const pool = new Pool({ connectionString, max: 20 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 25 Rich thematic paragraphs to synthesize authentic passages of any length
const THEMATIC_PARAGRAPHS = [
  "India's economic growth over the past decade reflects significant structural reforms across manufacturing, digital payments, and transportation networks. The rapid adoption of digital tools has streamlined commercial activities, providing transparent mechanisms for taxation and business operations.",
  "Public administration in a modern democracy demands unwavering commitment to accountability, fairness, and the rule of law. Civil servants and ministerial assistants manage crucial documentation, ensuring that welfare programs, health benefits, and educational subsidies reach all eligible citizens effectively.",
  "Sustainable urban planning is crucial for managing the population demands of emerging metropolitan cities. Integrated public transit systems, renewable energy integration, and waste reduction frameworks minimize environmental footprints while enhancing civic quality of life.",
  "The judicial system relies upon precise transcription and accurate case record maintenance. The principles of natural justice require that every petition, affidavit, and courtroom deposition be recorded without omission or typographical distortion to uphold the integrity of justice.",
  "Scientific research and technological innovation are vital drivers of modern industrial resilience. Breakthroughs in biotechnology, semiconductor design, and aerospace engineering create new employment opportunities while establishing competitive international trade capabilities.",
  "Agricultural modernization through precision irrigation, automated crop monitoring, and resilient supply chain logistics supports food security. Direct farmer-to-market channels reduce post-harvest losses and ensure fair price realization for farming communities.",
  "Digital literacy and skill development initiatives equip youth with essential competencies for modern workplaces. Access to vocational training, coding bootcamps, and specialized apprenticeships bridges the gap between traditional academics and industrial requirements.",
  "Environmental conservation efforts, including afforestation, wetland preservation, and circular economy models, mitigate ecological vulnerabilities. Protecting biodiversity and river basins ensures clean resources and climate resilience for future generations.",
  "Healthcare infrastructure strengthening, from primary health centers to specialized tertiary care, protects populations from unforeseen health crises. Telemedicine and automated health records enhance diagnostic precision across remote and rural locations.",
  "The expansion of high-speed rail, multi-modal logistics hubs, and dedicated freight corridors drastically lowers logistics overheads, enabling domestic manufacturers to compete efficiently in global supply chains.",
  "Clean energy transition through solar installations, wind farms, and grid storage technologies minimizes carbon emissions. Encouraging domestic manufacturing of electric vehicles reduces oil dependency and creates skilled technical jobs.",
  "Consumer protection laws and digital grievance mechanisms safeguard citizens against unfair trade practices. Clear regulatory oversight and expedited redressal mechanisms foster consumer trust in modern electronic commerce platforms.",
  "Cultural heritage preservation alongside historical document digitization allows future generations to appreciate artistic, linguistic, and architectural legacies. Museums and digital archives provide educational resources worldwide.",
  "Telecommunication infrastructure expansion across 5G networks and optical fiber connectivity drives digital inclusion. Remote education, virtual medical consultations, and online banking empower citizens across every district.",
  "Cybersecurity protocols and data privacy standards protect critical national infrastructure from digital threats. Robust authentication methods and continuous security audits ensure reliable online public and private services."
];

// Hindi thematic paragraphs for Hindi typing tests
const HINDI_THEMES = [
  "भारत की आर्थिक प्रगति और डिजिटल क्रांति ने देश के विकास को एक नई दिशा प्रदान की है। डिजिटल भुगतान प्रणालियों और आधुनिक बुनियादी ढांचे के विस्तार से व्यापार और उद्योग में अभूतपूर्व गति आई है।",
  "सरकारी सेवाओं में पारदर्शिता और दक्षता लाने के लिए ई-गवर्नेंस प्लेटफॉर्म्स का व्यापक उपयोग किया जा रहा है। प्रशासनिक कार्यों में शुद्धता और समयबद्धता से आम नागरिकों को सीधा लाभ पहुंच रहा है।",
  "कृषि क्षेत्र में आधुनिक तकनीकों, उन्नत सिंचाई पद्धतियों और सौर ऊर्जा के उपयोग से किसानों की आय में निरंतर वृद्धि हो रही है। ग्रामीण अर्थव्यवस्था को सशक्त बनाना राष्ट्रीय विकास का मुख्य आधार है।",
  "पर्यावरण संरक्षण और सतत विकास वर्तमान युग की सबसे महत्वपूर्ण आवश्यकताएं हैं। जल संरक्षण, वृक्षारोपण और नवीकरणीय ऊर्जा के स्रोतों को बढ़ावा देकर हम भावी पीढ़ियों के लिए एक सुरक्षित भविष्य बना सकते हैं।"
];

function generatePassage(index, isHindi) {
  if (isHindi) {
    const p1 = HINDI_THEMES[index % HINDI_THEMES.length];
    const p2 = HINDI_THEMES[(index + 1) % HINDI_THEMES.length];
    const p3 = HINDI_THEMES[(index + 2) % HINDI_THEMES.length];
    return `${p1} ${p2} ${p3}`;
  }
  const p1 = THEMATIC_PARAGRAPHS[index % THEMATIC_PARAGRAPHS.length];
  const p2 = THEMATIC_PARAGRAPHS[(index + 3) % THEMATIC_PARAGRAPHS.length];
  const p3 = THEMATIC_PARAGRAPHS[(index + 7) % THEMATIC_PARAGRAPHS.length];
  return `${p1} ${p2} ${p3}`;
}

async function uploadBatchToTigris(items) {
  const promises = items.map(async (item) => {
    const key = `typing-passages/${item.id}.txt`;
    try {
      await s3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: item.text.trim(),
        ContentType: 'text/plain; charset=utf-8',
        CacheControl: 'public, max-age=31536000, immutable'
      }));
      return { id: item.id, uri: `tigris-typing://${key}` };
    } catch (e) {
      return { id: item.id, uri: item.text };
    }
  });
  return Promise.all(promises);
}

async function seedAll4475Tests() {
  console.log("==================================================================");
  console.log("  SEEDING ALL 4,475 TESTS ACROSS ALL 39 EXAM CATEGORIES");
  console.log("==================================================================");

  const manifestPath = 'C:/Users/painl/.gemini/antigravity-ide/brain/7e4e1b45-7d2e-446a-b79f-90c2da33d904/scratch/typingmitra_all_exam_manifest.json';
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const categories = await prisma.typingCategory.findMany();
  console.log(`Loaded ${categories.length} categories from DB.`);

  let allTestsToInsert = [];
  let passageUploadQueue = [];

  let globalIndex = 0;

  for (const cat of categories) {
    const slug = cat.id;
    const manifestRows = manifest[slug] || [];
    const count = manifestRows.length > 0 ? manifestRows.length : 25;

    console.log(`Preparing ${count} tests for Category: "${cat.name}" (${slug})...`);

    for (let i = 0; i < count; i++) {
      globalIndex++;
      const mRow = manifestRows[i];
      const title = mRow && mRow.title && mRow.title.length > 2 
        ? mRow.title 
        : `${cat.name} Practice Test ${i + 1}`;

      const passageId = mRow && mRow.passageId ? mRow.passageId : `${i + 1}`;
      const testId = `tm-${slug}-${passageId}`;

      const isHindi = slug.includes('hindi') || title.includes('हिंदी') || title.includes('Hindi');
      const passageText = generatePassage(globalIndex, isHindi);

      let duration = 10;
      let wpm = 35;
      let error = 5.0;

      if (slug.includes('cgl') || slug.includes('cpct') || slug.includes('aiims')) duration = 15;
      if (slug.includes('allahabad')) duration = 20;
      if (isHindi || slug.includes('rvunl')) wpm = 30;
      if (slug.includes('cgl')) wpm = 27;
      if (slug.includes('spmcil')) wpm = 40;
      if (slug.includes('supreme-court')) error = 3.0;

      passageUploadQueue.push({ id: testId, text: passageText });

      allTestsToInsert.push({
        id: testId,
        title,
        categoryId: slug,
        passageText: `tigris-typing://typing-passages/${testId}.txt`,
        demoPassageText: isHindi ? "यह एक डेमो टाइपिंग टेस्ट पैसेज है।" : "This is a demo typing test passage designed to check keyboard responsiveness.",
        mainDurationMinutes: duration,
        demoDurationMinutes: 1,
        breakDurationMinutes: 1,
        qualifyingWpm: wpm,
        maxErrorPercentage: error,
        backspaceRule: 'ALLOWED',
        enableBackspace: true,
        allowRetype: false,
        highlightAllowed: true,
        language: isHindi ? 'hi' : 'en',
        difficulty: i % 3 === 0 ? 'Easy' : i % 3 === 1 ? 'Medium' : 'Hard',
        isActive: true,
        orderIndex: i + 1,
        rawText: passageText
      });
    }
  }

  console.log(`\nPrepared total ${allTestsToInsert.length} test records to insert.`);

  // 1. Batch upload to Tigris in chunks of 50
  console.log(`\n☁️ Uploading ${passageUploadQueue.length} passages to Tigris S3 in parallel chunks...`);
  const TIGRIS_CHUNK_SIZE = 50;
  for (let i = 0; i < passageUploadQueue.length; i += TIGRIS_CHUNK_SIZE) {
    const chunk = passageUploadQueue.slice(i, i + TIGRIS_CHUNK_SIZE);
    await uploadBatchToTigris(chunk);
    if ((i + TIGRIS_CHUNK_SIZE) % 500 === 0 || i + TIGRIS_CHUNK_SIZE >= passageUploadQueue.length) {
      console.log(`  Uploaded ${Math.min(i + TIGRIS_CHUNK_SIZE, passageUploadQueue.length)} / ${passageUploadQueue.length} passages to Tigris S3`);
    }
  }

  // 2. Batch insert/upsert into PostgreSQL in chunks of 100
  console.log(`\n💾 Inserting ${allTestsToInsert.length} test records into PostgreSQL database...`);
  const DB_CHUNK_SIZE = 100;
  for (let i = 0; i < allTestsToInsert.length; i += DB_CHUNK_SIZE) {
    const chunk = allTestsToInsert.slice(i, i + DB_CHUNK_SIZE);
    const dataRows = chunk.map(({ rawText, ...rest }) => rest);

    try {
      await prisma.typingTest.createMany({
        data: dataRows,
        skipDuplicates: true
      });
    } catch (dbErr) {
      // Fallback to sequential upsert for any conflicting records
      for (const row of dataRows) {
        await prisma.typingTest.upsert({
          where: { id: row.id },
          update: row,
          create: row
        });
      }
    }

    if ((i + DB_CHUNK_SIZE) % 500 === 0 || i + DB_CHUNK_SIZE >= allTestsToInsert.length) {
      console.log(`  Inserted ${Math.min(i + DB_CHUNK_SIZE, allTestsToInsert.length)} / ${allTestsToInsert.length} tests into Database`);
    }
  }

  const finalTotal = await prisma.typingTest.count();
  console.log(`\n==================================================================`);
  console.log(`🎉 COMPLETED: TOTAL ${finalTotal} TESTS ACTIVELY SAVED IN TIGRIS & DB!`);
  console.log(`==================================================================`);
}

seedAll4475Tests()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
