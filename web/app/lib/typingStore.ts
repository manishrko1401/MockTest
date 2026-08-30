import fs from 'fs';
import path from 'path';
import {
  TypingCategory,
  TypingPassage,
  TypingTest,
  TypingAttempt,
  DetailedMistake,
  evaluateTyping
} from './typingTypes';

export * from './typingTypes';

const DATA_FILE = path.join(process.cwd(), 'typing_data.json');

const DEFAULT_DEMO_TEXT = `This is a demo typing test passage designed to check your keyboard responsiveness and warm up your fingers. Please ensure all letter keys, space bar, backspace, and punctuation marks like comma, period, and hyphens are functioning smoothly before you start the main examination.`;

const DEFAULT_CATEGORIES: TypingCategory[] = [
  {
    id: 'cat-ssc-cgl',
    name: 'SSC CGL (Tier-2 DEST)',
    nameHi: 'एसएससी सीजीएल (टियर-2 डेस्ट)',
    description: 'Data Entry Speed Test (DEST) for SSC CGL Posts. 2000 key depressions / 15 minutes (approx 27-30 WPM).',
    icon: 'Keyboard',
    orderIndex: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-ssc-chsl',
    name: 'SSC CHSL (DEO / LDC)',
    nameHi: 'एसएससी सीएचएसएल (डीईओ / एलडीसी)',
    description: 'Skill Test for Lower Division Clerk (LDC) & Data Entry Operator (DEO). Standard 35 WPM English / 30 WPM Hindi.',
    icon: 'Award',
    orderIndex: 2,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-rrb-ntpc',
    name: 'RRB NTPC Typing Skill Test',
    nameHi: 'आरआरबी एनटीपीसी टाइपिंग टेस्ट',
    description: 'Typing Skill Test for Senior Clerk cum Typist, Accounts Clerk. 30 WPM English / 25 WPM Hindi in 10 minutes.',
    icon: 'Train',
    orderIndex: 3,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-court-clerk',
    name: 'High Court & Judicial Clerk',
    nameHi: 'हाई कोर्ट एवं न्यायालय लिपिक',
    description: 'Typing test for District & High Court Junior Assistants, Clerks and Stenographers with legal terminology.',
    icon: 'Scale',
    orderIndex: 4,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-general-speed',
    name: 'General Speed & Accuracy Practice',
    nameHi: 'सामान्य गति एवं शुद्धता अभ्यास',
    description: 'Editorial passages, current affairs, and comprehensive typing exercises to build top speed.',
    icon: 'Zap',
    orderIndex: 5,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-hindi-typing',
    name: 'हिंदी टाइपिंग परीक्षा (Hindi Typing)',
    nameHi: 'हिंदी टाइपिंग परीक्षा',
    description: 'विशेष हिंदी टाइपिंग अभ्यास (मंगल फॉन्ट / इनस्क्रिप्ट / रेमिंगटन गेल कीबोर्ड लेआउट).',
    icon: 'Languages',
    orderIndex: 6,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEFAULT_PASSAGES: TypingPassage[] = [
  {
    id: 'pas-1',
    title: 'Digital Governance and Public Service Delivery in Modern India',
    titleHi: 'डिजिटल गवर्नेंस और लोक सेवा वितरण',
    text: `Digital technology has revolutionized public service delivery across India over the past decade. Through unified portals and mobile applications, citizens can now access essential government documents, certificates, and welfare schemes without waiting in long queues. The integration of direct benefit transfers with bank accounts has minimized leakages, ensuring that financial assistance reaches intended beneficiaries swiftly and securely. Moreover, automated systems reduce bureaucratic delays and promote transparency in public administration. As broadband connectivity expands to remote rural communities, digital literacy becomes a cornerstone for inclusive socio-economic progress and nationwide empowerment.`,
    categoryId: 'cat-ssc-cgl',
    language: 'en',
    difficulty: 'Medium',
    wordCount: 97,
    charCount: 686,
    keystrokesCount: 686,
    tags: ['Governance', 'Technology', 'SSC CGL'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pas-2',
    title: 'Renewable Energy Transition and Sustainable Development',
    titleHi: 'नवीकरणीय ऊर्जा परिवर्तन और सतत विकास',
    text: `The transition toward sustainable energy sources represents one of the most critical endeavors of the twenty-first century. Solar and wind power installations have grown exponentially, providing affordable and clean electricity to millions of households and industrial units. By reducing dependency on imported fossil fuels, nations can enhance energy security while simultaneously curbing greenhouse gas emissions. Research in battery storage and smart grid infrastructure further stabilizes energy distribution during peak consumption hours. Continued collaboration between public policymakers, engineering innovators, and private investors will accelerate the adoption of environmentally conscious technologies worldwide.`,
    categoryId: 'cat-ssc-chsl',
    language: 'en',
    difficulty: 'Medium',
    wordCount: 96,
    charCount: 718,
    keystrokesCount: 718,
    tags: ['Environment', 'Energy', 'CHSL'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pas-3',
    title: 'Constitutional Principles and the Rule of Law in Judicial Systems',
    titleHi: 'संवैधानिक सिद्धांत एवं विधि का शासन',
    text: `The Constitution of India establishes a democratic republic grounded in the fundamental tenets of justice, liberty, equality, and fraternity. The independent judiciary functions as the custodian of the Constitution, ensuring that executive actions and legislative enactments remain consistent with constitutional mandates. Through judicial review and writ jurisdiction, superior courts protect the fundamental rights of citizens against arbitrary state action. A robust and accessible legal system is indispensable for upholding public confidence and guaranteeing equal protection of the laws to all individuals regardless of their social or economic background.`,
    categoryId: 'cat-court-clerk',
    language: 'en',
    difficulty: 'Hard',
    wordCount: 98,
    charCount: 712,
    keystrokesCount: 712,
    tags: ['Law', 'Constitution', 'High Court'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pas-4',
    title: 'Indian Railways Infrastructure and Modernization Programs',
    titleHi: 'भारतीय रेल अवसंरचना एवं आधुनिकीकरण कार्यक्रम',
    text: `Indian Railways constitutes the lifeline of the country's transport network, facilitating the daily transit of millions of passengers and crucial freight cargo. Recent modernization initiatives focus on high-speed train sets, automated signaling networks, track electrification, and redevelopment of major railway stations with world-class passenger amenities. Dedicated freight corridors have substantially reduced transportation turnaround times for essential commodities, bolstering manufacturing competitiveness. Technological upgrades such as automatic train protection systems demonstrate a sustained commitment to passenger safety, operational efficiency, and sustainable economic growth.`,
    categoryId: 'cat-rrb-ntpc',
    language: 'en',
    difficulty: 'Medium',
    wordCount: 93,
    charCount: 711,
    keystrokesCount: 711,
    tags: ['Railways', 'Infrastructure', 'RRB NTPC'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pas-5',
    title: 'हिंदी गद्यांश: राष्ट्र निर्माण में शिक्षा और युवा शक्ति की भूमिका',
    titleHi: 'राष्ट्र निर्माण में शिक्षा और युवा शक्ति की भूमिका',
    text: `किसी भी राष्ट्र के सर्वांगीण विकास और समृद्धि में शिक्षा की भूमिका सर्वोपरि होती है। युवा शक्ति देश की अमूल्य पूंजी है जो नई सोच और ऊर्जा के साथ सकारात्मक परिवर्तन ला सकती है। गुणवत्तापूर्ण शिक्षा से विद्यार्थियों में तार्किक क्षमता, नैतिक मूल्य और राष्ट्र सेवा की भावना विकसित होती है। डिजिटल युग में ज्ञान और कौशल का समन्वय युवाओं को आत्मनिर्भर बनाकर देश को नई ऊंचाइयों पर ले जाने में सक्षम बनाता है।`,
    categoryId: 'cat-hindi-typing',
    language: 'hi',
    difficulty: 'Medium',
    wordCount: 74,
    charCount: 405,
    keystrokesCount: 405,
    tags: ['Hindi', 'Education', 'Mangal'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEFAULT_TESTS: TypingTest[] = [
  {
    id: 'test-ssc-cgl-1',
    title: 'SSC CGL DEST Mock Test 01 - Governance & Administration',
    titleHi: 'एसएससी सीजीएल डेस्ट मॉक टेस्ट 01',
    categoryId: 'cat-ssc-cgl',
    passageId: 'pas-1',
    passageText: DEFAULT_PASSAGES[0].text,
    demoPassageText: DEFAULT_DEMO_TEXT,
    demoDurationMinutes: 1,
    breakDurationMinutes: 1,
    mainDurationMinutes: 15,
    qualifyingWpm: 27,
    maxErrorPercentage: 5.0,
    backspaceRule: 'ALLOWED',
    highlightAllowed: false,
    language: 'en',
    difficulty: 'Medium',
    instructions: 'This test strictly simulates the SSC CGL Tier-2 DEST exam. You will have a 1-minute demo test to check your keyboard, followed by a 1-minute break, and finally the 15-minute main examination. Backspace is allowed.',
    orderIndex: 1,
    isActive: true,
    totalAttempts: 1420,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'test-ssc-chsl-1',
    title: 'SSC CHSL Typing Speed Test 01 - Energy & Environment',
    titleHi: 'एसएससी सीएचएसएल टाइपिंग टेस्ट 01',
    categoryId: 'cat-ssc-chsl',
    passageId: 'pas-2',
    passageText: DEFAULT_PASSAGES[1].text,
    demoPassageText: DEFAULT_DEMO_TEXT,
    demoDurationMinutes: 1,
    breakDurationMinutes: 1,
    mainDurationMinutes: 10,
    qualifyingWpm: 35,
    maxErrorPercentage: 7.0,
    backspaceRule: 'ALLOWED',
    highlightAllowed: false,
    language: 'en',
    difficulty: 'Medium',
    instructions: 'Standard SSC CHSL Typing test simulation. 35 WPM required with accuracy above 93%. Includes 1-minute demo, 1-minute break, and 10-minute main test.',
    orderIndex: 2,
    isActive: true,
    totalAttempts: 2150,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'test-rrb-ntpc-1',
    title: 'RRB NTPC Typing Skill Test 01 - Railways Modernization',
    titleHi: 'आरआरबी एनटीपीसी टाइपिंग टेस्ट 01',
    categoryId: 'cat-rrb-ntpc',
    passageId: 'pas-4',
    passageText: DEFAULT_PASSAGES[3].text,
    demoPassageText: DEFAULT_DEMO_TEXT,
    demoDurationMinutes: 1,
    breakDurationMinutes: 1,
    mainDurationMinutes: 10,
    qualifyingWpm: 30,
    maxErrorPercentage: 5.0,
    backspaceRule: 'ALLOWED',
    highlightAllowed: false,
    language: 'en',
    difficulty: 'Medium',
    instructions: 'RRB NTPC official style typing skill test. Target 30 WPM with under 5% mistake limit. Complete Demo, Break and 10-minute Main test.',
    orderIndex: 3,
    isActive: true,
    totalAttempts: 980,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'test-court-1',
    title: 'High Court Legal Typing Test 01 - Judicial Reforms',
    titleHi: 'हाई कोर्ट लीगल टाइपिंग टेस्ट 01',
    categoryId: 'cat-court-clerk',
    passageId: 'pas-3',
    passageText: DEFAULT_PASSAGES[2].text,
    demoPassageText: DEFAULT_DEMO_TEXT,
    demoDurationMinutes: 1,
    breakDurationMinutes: 1,
    mainDurationMinutes: 10,
    qualifyingWpm: 35,
    maxErrorPercentage: 5.0,
    backspaceRule: 'ALLOWED',
    highlightAllowed: false,
    language: 'en',
    difficulty: 'Hard',
    instructions: 'Legal document typing test designed for Court Clerk and Assistant examinations with legal terminology.',
    orderIndex: 4,
    isActive: true,
    totalAttempts: 640,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'test-quick-5min',
    title: 'Quick 5-Minute Speed Booster Test',
    titleHi: 'त्वरित 5-मिनट स्पीड बूस्टर टेस्ट',
    categoryId: 'cat-general-speed',
    passageId: 'pas-1',
    passageText: DEFAULT_PASSAGES[0].text,
    demoPassageText: DEFAULT_DEMO_TEXT,
    demoDurationMinutes: 0.5,
    breakDurationMinutes: 0.5,
    mainDurationMinutes: 5,
    qualifyingWpm: 40,
    maxErrorPercentage: 5.0,
    backspaceRule: 'ALLOWED',
    highlightAllowed: true,
    language: 'en',
    difficulty: 'Easy',
    instructions: 'Fast-paced 5-minute typing drill with live highlighting and speed gauge enabled.',
    orderIndex: 5,
    isActive: true,
    totalAttempts: 3420,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'test-hindi-1',
    title: 'हिंदी टाइपिंग टेस्ट 01 - मंगल फॉन्ट (Hindi Typing Test 01)',
    titleHi: 'हिंदी टाइपिंग टेस्ट 01',
    categoryId: 'cat-hindi-typing',
    passageId: 'pas-5',
    passageText: DEFAULT_PASSAGES[4].text,
    demoPassageText: 'यह हिंदी टाइपिंग के लिए डेमो गद्यांश है। कृपया अपने कीबोर्ड की सभी कुंजियों की जांच कर लें।',
    demoDurationMinutes: 1,
    breakDurationMinutes: 1,
    mainDurationMinutes: 10,
    qualifyingWpm: 30,
    maxErrorPercentage: 5.0,
    backspaceRule: 'ALLOWED',
    highlightAllowed: false,
    language: 'hi',
    difficulty: 'Medium',
    instructions: 'हिंदी टाइपिंग परीक्षा (मंगल फॉन्ट / इनस्क्रिप्ट लेआउट). 30 शब्द प्रति मिनट की गति आवश्यक है।',
    orderIndex: 6,
    isActive: true,
    totalAttempts: 810,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

interface TypingDatabase {
  categories: TypingCategory[];
  passages: TypingPassage[];
  tests: TypingTest[];
  attempts: TypingAttempt[];
}

function getDataFilePath(): string {
  const candidates = [
    path.join(process.cwd(), 'web', 'typing_data.json'),
    path.join(process.cwd(), 'typing_data.json')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  if (path.basename(process.cwd()) === 'web') {
    return path.join(process.cwd(), 'typing_data.json');
  }
  return path.join(process.cwd(), 'web', 'typing_data.json');
}

function loadData(): TypingDatabase {
  try {
    const filePath = getDataFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      return {
        categories: Array.isArray(data.categories) ? data.categories : DEFAULT_CATEGORIES,
        passages: Array.isArray(data.passages) ? data.passages : DEFAULT_PASSAGES,
        tests: Array.isArray(data.tests) ? data.tests : DEFAULT_TESTS,
        attempts: Array.isArray(data.attempts) ? data.attempts : []
      };
    }
  } catch (err) {
    console.error('Error loading typing data file:', err);
  }
  const initial: TypingDatabase = {
    categories: DEFAULT_CATEGORIES,
    passages: DEFAULT_PASSAGES,
    tests: DEFAULT_TESTS,
    attempts: []
  };
  saveData(initial);
  return initial;
}

function saveData(data: TypingDatabase): void {
  try {
    const filePath = getDataFilePath();
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, jsonStr, 'utf-8');

    // Sync to alternative location if both folders exist
    const webPath = path.join(process.cwd(), 'web', 'typing_data.json');
    const rootPath = path.join(process.cwd(), 'typing_data.json');
    if (filePath !== webPath && fs.existsSync(path.dirname(webPath))) {
      try { fs.writeFileSync(webPath, jsonStr, 'utf-8'); } catch {}
    }
    if (filePath !== rootPath && fs.existsSync(rootPath)) {
      try { fs.writeFileSync(rootPath, jsonStr, 'utf-8'); } catch {}
    }
  } catch (err) {
    console.error('Error saving typing data file:', err);
  }
}

// ---------------------- DATABASE ACCESSORS ----------------------

export function getTypingCategories(): TypingCategory[] {
  const db = loadData();
  return db.categories.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
}

export function saveTypingCategory(category: Partial<TypingCategory>): TypingCategory {
  const db = loadData();
  const id = category.id || `cat-${Date.now()}`;
  const existingIdx = db.categories.findIndex(c => c.id === id);

  const newCat: TypingCategory = {
    id,
    name: (category.name || 'New Typing Exam').trim(),
    nameHi: (category.nameHi || '').trim(),
    description: (category.description || '').trim(),
    icon: category.icon || 'Keyboard',
    logoUrl: category.logoUrl || '',
    orderIndex: category.orderIndex !== undefined ? Number(category.orderIndex) : (existingIdx >= 0 ? (db.categories[existingIdx].orderIndex || 1) : db.categories.length + 1),
    isActive: category.isActive !== undefined ? category.isActive : true,
    createdAt: existingIdx >= 0 ? db.categories[existingIdx].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    db.categories[existingIdx] = newCat;
  } else {
    db.categories.push(newCat);
  }

  saveData(db);
  return newCat;
}

export function deleteTypingCategory(id: string): boolean {
  const db = loadData();
  const initialLen = db.categories.length;
  db.categories = db.categories.filter(c => c.id !== id);
  if (db.categories.length !== initialLen) {
    // Also remove any tests linked to this deleted category
    db.tests = db.tests.filter(t => t.categoryId !== id);
    saveData(db);
    return true;
  }
  return false;
}

export function getTypingPassages(): TypingPassage[] {
  const db = loadData();
  return db.passages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function saveTypingPassage(passage: Partial<TypingPassage>): TypingPassage {
  const db = loadData();
  const id = passage.id || `pas-${Date.now()}`;
  const existingIdx = db.passages.findIndex(p => p.id === id);

  const text = (passage.text || '').trim();
  const words = text.length > 0 ? text.split(/\s+/).length : 0;
  const chars = text.length;

  const newPassage: TypingPassage = {
    id,
    title: (passage.title || 'Untitled Passage').trim(),
    titleHi: (passage.titleHi || '').trim(),
    text,
    categoryId: passage.categoryId || '',
    language: passage.language || 'en',
    difficulty: passage.difficulty || 'Medium',
    wordCount: words,
    charCount: chars,
    keystrokesCount: chars,
    tags: Array.isArray(passage.tags) ? passage.tags : [],
    createdAt: existingIdx >= 0 ? db.passages[existingIdx].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    db.passages[existingIdx] = newPassage;
  } else {
    db.passages.push(newPassage);
  }

  saveData(db);
  return newPassage;
}

export function deleteTypingPassage(id: string): boolean {
  const db = loadData();
  const initialLen = db.passages.length;
  db.passages = db.passages.filter(p => p.id !== id);
  if (db.passages.length !== initialLen) {
    saveData(db);
    return true;
  }
  return false;
}

export function getTypingTests(): TypingTest[] {
  const db = loadData();
  return db.tests.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
}

export function getTypingTestById(id: string): TypingTest | null {
  const db = loadData();
  return db.tests.find(t => t.id === id) || null;
}

export function saveTypingTest(test: Partial<TypingTest>): TypingTest {
  const db = loadData();
  const id = test.id || `test-${Date.now()}`;
  const existingIdx = db.tests.findIndex(t => t.id === id);

  let passageText = test.passageText || '';
  if (!passageText && test.passageId) {
    const linked = db.passages.find(p => p.id === test.passageId);
    if (linked) passageText = linked.text;
  }
  if (!passageText) {
    passageText = DEFAULT_PASSAGES[0].text;
  }

  const newTest: TypingTest = {
    id,
    title: (test.title || 'New Typing Test').trim(),
    titleHi: (test.titleHi || '').trim(),
    categoryId: test.categoryId || db.categories[0]?.id || 'cat-ssc-cgl',
    passageId: test.passageId || '',
    passageText,
    demoPassageText: test.demoPassageText || DEFAULT_DEMO_TEXT,
    demoDurationMinutes: test.demoDurationMinutes !== undefined ? Number(test.demoDurationMinutes) : 1,
    breakDurationMinutes: test.breakDurationMinutes !== undefined ? Number(test.breakDurationMinutes) : 1,
    mainDurationMinutes: test.mainDurationMinutes !== undefined ? Number(test.mainDurationMinutes) : 10,
    qualifyingWpm: test.qualifyingWpm !== undefined ? Number(test.qualifyingWpm) : 35,
    maxErrorPercentage: test.maxErrorPercentage !== undefined ? Number(test.maxErrorPercentage) : 5.0,
    backspaceRule: test.enableBackspace === false ? 'DISABLED' : (test.backspaceRule || 'ALLOWED'),
    enableBackspace: test.enableBackspace !== undefined ? test.enableBackspace : (test.backspaceRule !== 'DISABLED'),
    allowRetype: test.allowRetype !== undefined ? Boolean(test.allowRetype) : false,
    highlightAllowed: test.highlightAllowed !== undefined ? test.highlightAllowed : false,
    language: test.language || 'en',
    difficulty: test.difficulty || 'Medium',
    instructions: (test.instructions || 'Standard typing exam simulation. Complete Demo, Break, and Main test.').trim(),
    orderIndex: test.orderIndex !== undefined ? Number(test.orderIndex) : (existingIdx >= 0 ? (db.tests[existingIdx].orderIndex || 1) : db.tests.length + 1),
    isActive: test.isActive !== undefined ? test.isActive : true,
    totalAttempts: existingIdx >= 0 ? (db.tests[existingIdx].totalAttempts || 0) : 0,
    createdAt: existingIdx >= 0 ? db.tests[existingIdx].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    db.tests[existingIdx] = newTest;
  } else {
    db.tests.push(newTest);
  }

  saveData(db);
  return newTest;
}

export function deleteTypingTest(id: string): boolean {
  const db = loadData();
  const initialLen = db.tests.length;
  db.tests = db.tests.filter(t => t.id !== id);
  if (db.tests.length !== initialLen) {
    saveData(db);
    return true;
  }
  return false;
}

export function saveTypingAttempt(attempt: Partial<TypingAttempt>): TypingAttempt {
  const db = loadData();
  const id = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const newAttempt: TypingAttempt = {
    id,
    userId: attempt.userId || 'guest',
    userName: attempt.userName || 'Student',
    testId: attempt.testId || '',
    testTitle: attempt.testTitle || 'Typing Practice',
    categoryName: attempt.categoryName || '',
    grossWpm: attempt.grossWpm || 0,
    netWpm: attempt.netWpm || 0,
    accuracyPercentage: attempt.accuracyPercentage || 0,
    totalKeystrokes: attempt.totalKeystrokes || 0,
    correctKeystrokes: attempt.correctKeystrokes || 0,
    errorKeystrokes: attempt.errorKeystrokes || 0,
    fullMistakes: attempt.fullMistakes || 0,
    halfMistakes: attempt.halfMistakes || 0,
    totalMistakes: attempt.totalMistakes || 0,
    errorPercentage: attempt.errorPercentage || 0,
    backspaceCount: attempt.backspaceCount || 0,
    timeSpentSeconds: attempt.timeSpentSeconds || 0,
    allocatedTimeSeconds: attempt.allocatedTimeSeconds || 0,
    isQualified: !!attempt.isQualified,
    language: attempt.language || 'en',
    typedText: attempt.typedText || '',
    targetText: attempt.targetText || '',
    allowRetype: attempt.allowRetype,
    retypeCycles: attempt.retypeCycles,
    detailedMistakes: attempt.detailedMistakes || [],
    completedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  db.attempts.unshift(newAttempt);
  if (db.attempts.length > 500) {
    db.attempts = db.attempts.slice(0, 500); // keep recent 500
  }

  // increment test attempt counter
  const testIdx = db.tests.findIndex(t => t.id === newAttempt.testId);
  if (testIdx >= 0) {
    db.tests[testIdx].totalAttempts = (db.tests[testIdx].totalAttempts || 0) + 1;
  }

  saveData(db);
  return newAttempt;
}

export function getUserTypingAttempts(userId?: string, testId?: string): TypingAttempt[] {
  const db = loadData();
  let attempts = db.attempts;
  if (userId && userId !== 'guest') {
    attempts = attempts.filter(a => a.userId === userId);
  }
  if (testId) {
    attempts = attempts.filter(a => a.testId === testId);
  }
  return attempts.slice(0, 50);
}
