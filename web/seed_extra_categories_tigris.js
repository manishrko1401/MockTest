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
  credentials: { accessKeyId, secretAccessKey }
});

const connectionString = (process.env.TYPING_DATABASE_URL || process.env.DATABASE_URL || '').trim();
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function uploadPassage(testId, text) {
  const key = `typing-passages/${testId}.txt`;
  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: text.trim(),
    ContentType: 'text/plain; charset=utf-8',
    CacheControl: 'public, max-age=31536000, immutable'
  }));
  return `tigris-typing://${key}`;
}

const EXTRA_PASSAGES = [
  // Supreme Court JCA
  {
    catId: 'supreme-court-junior-court-assistant-jca-typing',
    title: 'Supreme Court JCA Official Legal Typing Passage 1',
    text: `The Supreme Court of India is the supreme judicial authority of the Republic of India and the highest court of India under the Constitution. It is the most senior constitutional court, and has the power of judicial review. The Chief Justice of India is the head and chief judge of the Supreme Court, which consists of a maximum of 34 judges and has extensive powers in the form of original, appellate and advisory jurisdictions. As the court of record, its decisions are binding on all other courts within the territory of India. The proceedings of the court are conducted in English, and accuracy in transcription is of paramount importance for the administration of justice. In legal typing, precision in spelling case citations, statutory acts, and courtroom arguments ensures clarity in judicial records.`,
    duration: 10,
    wpm: 35,
    error: 3.0
  },
  {
    catId: 'supreme-court-junior-court-assistant-jca-typing',
    title: 'Supreme Court JCA Official Legal Typing Passage 2',
    text: `Judicial review is a process under which executive or legislative actions are subject to review by the judiciary. A court with authority for judicial review may invalidate laws, acts and governmental actions that are incompatible with a higher authority, such as the terms of a written constitution. In the Indian legal framework, Article 32 and Article 226 empower the Supreme Court and High Courts respectively to issue prerogative writs for the enforcement of fundamental rights. The registry staff, including Junior Court Assistants, perform vital duties in recording orders, entering judgments, and maintaining constitutional documentation with absolute speed and zero typographical negligence.`,
    duration: 10,
    wpm: 35,
    error: 3.0
  },
  // SSC CGL Previous Year
  {
    catId: 'ssc-cgl-previous-year-typing',
    title: 'SSC CGL Tier-2 DEST Previous Year Shift 1',
    text: `India's digital economy has experienced unprecedented growth over the last decade, driven by widespread internet penetration, affordable smartphones, and government initiatives such as Digital India. Digital payments through the Unified Payments Interface (UPI) have revolutionized commerce across urban and rural landscapes alike. The expansion of e-governance platforms has made public service delivery more transparent, accessible, and efficient for millions of citizens. As digital infrastructure continues to expand, emphasis is being placed on cybersecurity, data protection protocols, and artificial intelligence integration to foster sustainable innovation across multiple sectors of the economy.`,
    duration: 15,
    wpm: 27,
    error: 5.0
  },
  // UPSSSC JA Hindi Typing
  {
    catId: 'upsssc-ja-hindi-typing',
    title: 'UPSSSC कनिष्ठ सहायक हिंदी टाइपिंग परीक्षा पैसेज 1 (मंगत/कुर्तीदेव)',
    text: `भारत एक विशाल और विविधतापूर्ण देश है जहाँ विभिन्न संस्कृतियों, भाषाओं और परंपराओं का सुंदर संगम देखने को मिलता है। हमारे देश की आर्थिक प्रगति में कृषि और उद्योग दोनों का महत्वपूर्ण योगदान है। ग्रामीण क्षेत्रों में आधुनिक तकनीक और डिजिटल सेवाओं के विस्तार से किसानों और छोटे व्यापारियों को नए अवसर प्राप्त हो रहे हैं। शिक्षा और स्वास्थ्य सेवाओं में सुधार से समाज के प्रत्येक वर्ग का समग्र विकास संभव हो रहा है। पर्यावरण संरक्षण और सतत विकास आज के समय की प्रमुख आवश्यकता बन चुके हैं।`,
    duration: 5,
    wpm: 25,
    error: 5.0,
    lang: 'hi'
  },
  // Delhi Police AWO / TPO
  {
    catId: 'delhi-police-awo-tpo-typing',
    title: 'Delhi Police AWO/TPO Official Typing Test 1',
    text: `Effective communication and wireless operations are essential components of modern law enforcement. The Delhi Police utilizes advanced telecommunication networks to coordinate emergency response, manage public safety, and maintain rapid inter-departmental transmission. Assistant Wireless Operators and Tele-Printer Operators play a critical role in accurately transcribing messages, maintaining wireless logs, and ensuring that critical distress calls and administrative dispatches are recorded without delay or error.`,
    duration: 15,
    wpm: 30,
    error: 5.0
  },
  // Rajasthan RVUNL
  {
    catId: 'rajasthan-rvunl-junior-assistant-typing',
    title: 'Rajasthan RVUNL Junior Assistant Speed Test 1',
    text: `Rajasthan Rajya Vidyut Utpadan Nigam Limited is the electricity generation company of the Government of Rajasthan. Established to operate and maintain power stations across the state, RVUNL has been instrumental in meeting the expanding energy requirements of industries and households. Administrative efficiency in generating stations requires proficient data entry, automated billing management, and strict adherence to documentation standards.`,
    duration: 10,
    wpm: 30,
    error: 5.0
  },
  // CSIR EXAM New Rules
  {
    catId: 'csir-exam-new-rules(formula)',
    title: 'CSIR JSA New Rules Benchmark Typing Test 1',
    text: `The Council of Scientific and Industrial Research (CSIR) is an autonomous body and the largest research and development organization in India. With an extensive network of laboratories and field stations, CSIR undertakes cutting-edge scientific research in aerospace, chemical sciences, genomics, and industrial manufacturing. Junior Secretariat Assistants provide indispensable administrative assistance, managing official records and correspondence with high typographical precision.`,
    duration: 10,
    wpm: 35,
    error: 5.0
  },
  // CBSE Superintendent
  {
    catId: 'cbse-superintendent-typing',
    title: 'CBSE Superintendent Official Typing Test 1',
    text: `The Central Board of Secondary Education is a national level board of education in India for public and private schools, controlled and managed by the Government of India. The board conducts annual examinations for higher secondary and secondary students and oversees curriculum development, pedagogical innovations, and educational governance across affiliated institutions nationwide.`,
    duration: 10,
    wpm: 35,
    error: 5.0
  },
  // CCRAS LDC UDC
  {
    catId: 'ccras-ldc-udc-typing',
    title: 'CCRAS LDC/UDC Official Speed Test 1',
    text: `The Central Council for Research in Ayurvedic Sciences is an apex body in India for the formulation, coordination, development and promotion of research on scientific lines in Ayurveda. Clerical personnel support research administration by documenting clinical trials, maintaining pharmacopoeial data, and managing council communications.`,
    duration: 10,
    wpm: 35,
    error: 5.0
  },
  // SSB HCM
  {
    catId: 'ssb-hcm-typing',
    title: 'SSB Head Constable Ministerial Typing Test 1',
    text: `Sashastra Seema Bal is a border guarding force of India deployed along the borders with Nepal and Bhutan. As one of the Central Armed Police Forces under the Ministry of Home Affairs, SSB maintains border security, prevents transnational crimes, and supports civil administration. Ministerial staff manage personnel documentation and operational reports.`,
    duration: 10,
    wpm: 35,
    error: 5.0
  },
  // Uttarakhand HC
  {
    catId: 'uttrakhand-high-court-typing',
    title: 'Uttarakhand High Court Legal Transcription Test 1',
    text: `The High Court of Uttarakhand is the high court of the state of Uttarakhand in India. Situated at Nainital, the court exercises jurisdiction over the judicial administration of the state. Precise typing of judgments, deposition transcripts, and court registries ensures the smooth execution of justice and reliable public records.`,
    duration: 10,
    wpm: 35,
    error: 5.0
  },
  // Jharkhand HC
  {
    catId: 'jharkhand-high-court-typing',
    title: 'Jharkhand High Court Official Speed Test 1',
    text: `The High Court of Jharkhand is one of the premier High Courts in Eastern India, located in Ranchi. The court administers justice across civil, criminal, and constitutional matters. Proficiency in legal transcription and keyboard speed is essential for maintaining prompt cause lists and accurate orders.`,
    duration: 10,
    wpm: 35,
    error: 5.0
  }
];

async function seedExtras() {
  console.log("Seeding remaining categories with Tigris S3 passages...");
  for (let i = 0; i < EXTRA_PASSAGES.length; i++) {
    const item = EXTRA_PASSAGES[i];
    const testId = `extra-${item.catId}-${i + 1}`;

    const tigrisUri = await uploadPassage(testId, item.text);
    console.log(`Uploaded ${testId} -> ${tigrisUri}`);

    await prisma.typingTest.upsert({
      where: { id: testId },
      update: {
        title: item.title,
        categoryId: item.catId,
        passageText: tigrisUri,
        demoPassageText: item.lang === 'hi' 
          ? "यह एक डेमो टाइपिंग पैसेज है।" 
          : "This is a demo typing test passage designed to check your keyboard keys.",
        mainDurationMinutes: item.duration,
        demoDurationMinutes: 1,
        breakDurationMinutes: 1,
        qualifyingWpm: item.wpm,
        maxErrorPercentage: item.error,
        backspaceRule: 'ALLOWED',
        enableBackspace: true,
        allowRetype: false,
        highlightAllowed: true,
        language: item.lang || 'en',
        difficulty: 'Medium',
        isActive: true
      },
      create: {
        id: testId,
        title: item.title,
        categoryId: item.catId,
        passageText: tigrisUri,
        demoPassageText: item.lang === 'hi' 
          ? "यह एक डेमो टाइपिंग पैसेज है।" 
          : "This is a demo typing test passage designed to check your keyboard keys.",
        mainDurationMinutes: item.duration,
        demoDurationMinutes: 1,
        breakDurationMinutes: 1,
        qualifyingWpm: item.wpm,
        maxErrorPercentage: item.error,
        backspaceRule: 'ALLOWED',
        enableBackspace: true,
        allowRetype: false,
        highlightAllowed: true,
        language: item.lang || 'en',
        difficulty: 'Medium',
        isActive: true,
        orderIndex: i + 100
      }
    });
  }
  console.log("Finished seeding extra categories to Tigris S3 & DB!");
}

seedExtras()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
