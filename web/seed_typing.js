/**
 * Seed script: populates typing_categories and typing_tests tables with
 * the default data that was previously hardcoded in typingStore.ts.
 * Run once after migrating to database storage.
 */
const { PrismaClient } = require('./node_modules/@prisma/client');
const { PrismaPg } = require('./node_modules/@prisma/adapter-pg');
const { Pool } = require('./node_modules/pg');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) envVars[line.slice(0, idx).trim()] = line.slice(idx + 1).replace(/"/g, '').trim();
});

const pool = new Pool({ connectionString: envVars.DIRECT_URL || envVars.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_DEMO_TEXT = `This is a demo typing test passage designed to check your keyboard responsiveness and warm up your fingers. Please ensure all letter keys, space bar, backspace, and punctuation marks like comma, period, and hyphens are functioning smoothly before you start the main examination.`;

const CATEGORIES = [
  { id: 'cat-ssc-cgl',      name: 'SSC CGL (Tier-2 DEST)',               nameHi: 'एसएससी सीजीएल (टियर-2 डेस्ट)',     description: 'Data Entry Speed Test (DEST) for SSC CGL Posts. 2000 key depressions / 15 minutes (approx 27-30 WPM).', icon: 'Keyboard', orderIndex: 1 },
  { id: 'cat-ssc-chsl',     name: 'SSC CHSL (DEO / LDC)',                nameHi: 'एसएससी सीएचएसएल (डीईओ / एलडीसी)',  description: 'Skill Test for Lower Division Clerk (LDC) & Data Entry Operator (DEO). Standard 35 WPM English / 30 WPM Hindi.', icon: 'Award', orderIndex: 2 },
  { id: 'cat-rrb-ntpc',     name: 'RRB NTPC Typing Skill Test',          nameHi: 'आरआरबी एनटीपीसी टाइपिंग टेस्ट',    description: 'Typing Skill Test for Senior Clerk cum Typist, Accounts Clerk. 30 WPM English / 25 WPM Hindi in 10 minutes.', icon: 'Layers', orderIndex: 3 },
  { id: 'cat-court-clerk',  name: 'High Court & Judicial Clerk',         nameHi: 'हाई कोर्ट एवं न्यायालय लिपिक',     description: 'Typing test for District & High Court Junior Assistants, Clerks and Stenographers with legal terminology.', icon: 'BookOpen', orderIndex: 4 },
  { id: 'cat-general-speed',name: 'General Speed & Accuracy Practice',   nameHi: 'सामान्य गति एवं शुद्धता अभ्यास',   description: 'Editorial passages, current affairs, and comprehensive typing exercises to build top speed.', icon: 'Zap', orderIndex: 5 },
  { id: 'cat-hindi-typing', name: 'हिंदी टाइपिंग परीक्षा (Hindi Typing)', nameHi: 'हिंदी टाइपिंग परीक्षा',           description: 'विशेष हिंदी टाइपिंग अभ्यास (मंगल फॉन्ट / इनस्क्रिप्ट / रेमिंगटन गेल कीबोर्ड लेआउट).', icon: 'Languages', orderIndex: 6 },
];

const PASSAGES = {
  'pas-1': `Digital technology has revolutionized public service delivery across India over the past decade. Through unified portals and mobile applications, citizens can now access essential government documents, certificates, and welfare schemes without waiting in long queues. The integration of direct benefit transfers with bank accounts has minimized leakages, ensuring that financial assistance reaches intended beneficiaries swiftly and securely. Moreover, automated systems reduce bureaucratic delays and promote transparency in public administration. As broadband connectivity expands to remote rural communities, digital literacy becomes a cornerstone for inclusive socio-economic progress and nationwide empowerment.`,
  'pas-2': `The transition toward sustainable energy sources represents one of the most critical endeavors of the twenty-first century. Solar and wind power installations have grown exponentially, providing affordable and clean electricity to millions of households and industrial units. By reducing dependency on imported fossil fuels, nations can enhance energy security while simultaneously curbing greenhouse gas emissions. Research in battery storage and smart grid infrastructure further stabilizes energy distribution during peak consumption hours. Continued collaboration between public policymakers, engineering innovators, and private investors will accelerate the adoption of environmentally conscious technologies worldwide.`,
  'pas-3': `The Constitution of India establishes a democratic republic grounded in the fundamental tenets of justice, liberty, equality, and fraternity. The independent judiciary functions as the custodian of the Constitution, ensuring that executive actions and legislative enactments remain consistent with constitutional mandates. Through judicial review and writ jurisdiction, superior courts protect the fundamental rights of citizens against arbitrary state action. A robust and accessible legal system is indispensable for upholding public confidence and guaranteeing equal protection of the laws to all individuals regardless of their social or economic background.`,
  'pas-4': `Indian Railways constitutes the lifeline of the country's transport network, facilitating the daily transit of millions of passengers and crucial freight cargo. Recent modernization initiatives focus on high-speed train sets, automated signaling networks, track electrification, and redevelopment of major railway stations with world-class passenger amenities. Dedicated freight corridors have substantially reduced transportation turnaround times for essential commodities, bolstering manufacturing competitiveness. Technological upgrades such as automatic train protection systems demonstrate a sustained commitment to passenger safety, operational efficiency, and sustainable economic growth.`,
  'pas-5': `किसी भी राष्ट्र के सर्वांगीण विकास और समृद्धि में शिक्षा की भूमिका सर्वोपरि होती है। युवा शक्ति देश की अमूल्य पूंजी है जो नई सोच और ऊर्जा के साथ सकारात्मक परिवर्तन ला सकती है। गुणवत्तापूर्ण शिक्षा से विद्यार्थियों में तार्किक क्षमता, नैतिक मूल्य और राष्ट्र सेवा की भावना विकसित होती है। डिजिटल युग में ज्ञान और कौशल का समन्वय युवाओं को आत्मनिर्भर बनाकर देश को नई ऊंचाइयों पर ले जाने में सक्षम बनाता है।`,
};

const TESTS = [
  { id: 'test-ssc-cgl-1',    title: 'SSC CGL DEST Mock Test 01 - Governance & Administration',  titleHi: 'एसएससी सीजीएल डेस्ट मॉक टेस्ट 01', categoryId: 'cat-ssc-cgl',       passageId: 'pas-1', passageText: PASSAGES['pas-1'], mainDurationMinutes: 15, qualifyingWpm: 27, orderIndex: 1, language: 'en', difficulty: 'Medium', instructions: 'This test strictly simulates the SSC CGL Tier-2 DEST exam. You will have a 1-minute demo test to check your keyboard, followed by a 1-minute break, and finally the 15-minute main examination. Backspace is allowed.' },
  { id: 'test-ssc-chsl-1',   title: 'SSC CHSL Typing Speed Test 01 - Energy & Environment',    titleHi: 'एसएससी सीएचएसएल टाइपिंग टेस्ट 01', categoryId: 'cat-ssc-chsl',      passageId: 'pas-2', passageText: PASSAGES['pas-2'], mainDurationMinutes: 10, qualifyingWpm: 35, maxErrorPercentage: 7, orderIndex: 2, language: 'en', difficulty: 'Medium', instructions: 'Standard SSC CHSL Typing test simulation. 35 WPM required with accuracy above 93%.' },
  { id: 'test-rrb-ntpc-1',   title: 'RRB NTPC Typing Skill Test 01 - Railways Modernization',  titleHi: 'आरआरबी एनटीपीसी टाइपिंग टेस्ट 01', categoryId: 'cat-rrb-ntpc',      passageId: 'pas-4', passageText: PASSAGES['pas-4'], mainDurationMinutes: 10, qualifyingWpm: 30, orderIndex: 3, language: 'en', difficulty: 'Medium', instructions: 'RRB NTPC official style typing skill test. Target 30 WPM with under 5% mistake limit.' },
  { id: 'test-court-1',      title: 'High Court Legal Typing Test 01 - Judicial Reforms',      titleHi: 'हाई कोर्ट लीगल टाइपिंग टेस्ट 01', categoryId: 'cat-court-clerk',    passageId: 'pas-3', passageText: PASSAGES['pas-3'], mainDurationMinutes: 10, qualifyingWpm: 35, orderIndex: 4, language: 'en', difficulty: 'Hard',   instructions: 'Legal document typing test designed for Court Clerk and Assistant examinations.' },
  { id: 'test-quick-5min',   title: 'Quick 5-Minute Speed Booster Test',                       titleHi: 'त्वरित 5-मिनट स्पीड बूस्टर टेस्ट',  categoryId: 'cat-general-speed',  passageId: 'pas-1', passageText: PASSAGES['pas-1'], mainDurationMinutes: 5,  qualifyingWpm: 40, orderIndex: 5, language: 'en', difficulty: 'Easy',   highlightAllowed: true, demoDurationMinutes: 0.5, breakDurationMinutes: 0.5, instructions: 'Fast-paced 5-minute typing drill with live highlighting and speed gauge enabled.' },
  { id: 'test-hindi-1',      title: 'हिंदी टाइपिंग टेस्ट 01 - मंगल फॉन्ट (Hindi Typing Test 01)', titleHi: 'हिंदी टाइपिंग टेस्ट 01',       categoryId: 'cat-hindi-typing',   passageId: 'pas-5', passageText: PASSAGES['pas-5'], mainDurationMinutes: 10, qualifyingWpm: 30, orderIndex: 6, language: 'hi', difficulty: 'Medium', demoPassageText: 'यह हिंदी टाइपिंग के लिए डेमो गद्यांश है। कृपया अपने कीबोर्ड की सभी कुंजियों की जांच कर लें।', instructions: 'हिंदी टाइपिंग परीक्षा (मंगल फॉन्ट / इनस्क्रिप्ट लेआउट). 30 शब्द प्रति मिनट की गति आवश्यक है।' },
];

async function seed() {
  console.log('🌱 Seeding typing categories and tests into the database...\n');

  // Seed categories
  for (const cat of CATEGORIES) {
    await prisma.typingCategory.upsert({
      where: { id: cat.id },
      update: { name: cat.name, nameHi: cat.nameHi, description: cat.description, icon: cat.icon, orderIndex: cat.orderIndex, isActive: true, logoUrl: '' },
      create: { ...cat, logoUrl: '', isActive: true }
    });
    console.log(`✅ Category: ${cat.name}`);
  }

  // Seed tests
  for (const test of TESTS) {
    await prisma.typingTest.upsert({
      where: { id: test.id },
      update: {
        title: test.title, titleHi: test.titleHi, categoryId: test.categoryId,
        passageId: test.passageId, passageText: test.passageText,
        demoPassageText: test.demoPassageText || DEFAULT_DEMO_TEXT,
        demoDurationMinutes: test.demoDurationMinutes || 1,
        breakDurationMinutes: test.breakDurationMinutes || 1,
        mainDurationMinutes: test.mainDurationMinutes,
        qualifyingWpm: test.qualifyingWpm,
        maxErrorPercentage: test.maxErrorPercentage || 5,
        backspaceRule: 'ALLOWED', enableBackspace: true, allowRetype: false,
        highlightAllowed: test.highlightAllowed || false,
        language: test.language, difficulty: test.difficulty,
        instructions: test.instructions, orderIndex: test.orderIndex, isActive: true
      },
      create: {
        id: test.id, title: test.title, titleHi: test.titleHi, categoryId: test.categoryId,
        passageId: test.passageId, passageText: test.passageText,
        demoPassageText: test.demoPassageText || DEFAULT_DEMO_TEXT,
        demoDurationMinutes: test.demoDurationMinutes || 1,
        breakDurationMinutes: test.breakDurationMinutes || 1,
        mainDurationMinutes: test.mainDurationMinutes,
        qualifyingWpm: test.qualifyingWpm,
        maxErrorPercentage: test.maxErrorPercentage || 5,
        backspaceRule: 'ALLOWED', enableBackspace: true, allowRetype: false,
        highlightAllowed: test.highlightAllowed || false,
        language: test.language, difficulty: test.difficulty,
        instructions: test.instructions, orderIndex: test.orderIndex, isActive: true
      }
    });
    console.log(`✅ Test: ${test.title}`);
  }

  console.log('\n🎉 Seeding complete! Typing data is now in the database.');
}

seed()
  .catch(e => { console.error('Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
