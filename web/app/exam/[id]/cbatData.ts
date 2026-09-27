// Station Master CBAT (Psycho Test) Complete Mock Data Bank
// Covers all 5 RDSO Test Batteries for RRB NTPC Station Master

export interface CbatQuestion {
  id: string;
  orderIndex: number;
  section?: string;
  imageUrl?: string;
  refImageUrl?: string;
  promptText?: string;
  rawHtml?: string;
  // For Test 1 (Classification): 5 figure items
  figures?: { label: 'A' | 'B' | 'C' | 'D' | 'E'; svgType: string; rotation?: number }[];
  // For Test 2 (Add of Odd Numbers): Digit string and option sums
  digitString?: string;
  sumOptions?: { key: 'A' | 'B' | 'C' | 'D' | 'E'; val: number | string }[];
  // For Test 3 (Short Route): Equation prompt
  routePrompt?: string; // e.g. "H - G = ?"
  gridIndex?: number; // 0, 1, 2, 3
  // For Test 4 (Information Ordering): Process boxes and shapes
  initialShapeVal?: number; // 1 to 12
  processBoxValues?: { box: 'A' | 'B' | 'C' | 'D'; active: boolean; delta: number }[];
  correctShapeVal?: number;
  // For Test 5 (Personality): Bilingual text
  questionHindi?: string;
  questionEnglish?: string;
  optionsHindiEnglish?: { key: 'A' | 'B' | 'C'; textHi: string; textEn: string }[];
  // Standard options for radio
  normalOptions: string[];
  jumbledOptions: string[];
  correctAnswer: string;
}

export interface CbatBattery {
  id: string;
  name: string;
  hindiName: string;
  batteryKey: 'Classification Test' | 'Add of Odd Numbers Test' | 'Short Route Test' | 'Information Ordering Type -I' | 'Personality Test';
  totalQuestions: number;
  durationMinutes: number;
  durationSeconds: number;
  instructionsHindi: string[];
  instructionsEnglish: string[];
  isSplitView: boolean;
  splitPaneTitle?: string;
  chunks: CbatQuestion[][]; // Paginated parts (e.g. Q1-15, Q16-30 or Grid 1 to 4)
}

// Helper to generate jumbled array
const shuffle = (arr: string[]) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// ==========================================
// BATTERY 1: Intelligence Test (Classification) - 35 Questions
// ==========================================
const generateClassificationQuestions = (): CbatQuestion[] => {
  const qs: CbatQuestion[] = [];
  const patterns = [
    { oddIdx: 4, types: ['arrow_up', 'arrow_up', 'arrow_up', 'arrow_up', 'arrow_down'] },
    { oddIdx: 2, types: ['square', 'square', 'circle', 'square', 'square'] },
    { oddIdx: 0, types: ['triangle_inv', 'triangle', 'triangle', 'triangle', 'triangle'] },
    { oddIdx: 3, types: ['cross', 'cross', 'cross', 'plus', 'cross'] },
    { oddIdx: 1, types: ['diag_slash', 'diag_backslash', 'diag_slash', 'diag_slash', 'diag_slash'] },
    { oddIdx: 4, types: ['circle_dot', 'circle_dot', 'circle_dot', 'circle_dot', 'circle_empty'] },
    { oddIdx: 2, types: ['two_lines', 'two_lines', 'three_lines', 'two_lines', 'two_lines'] },
  ];

  const labels: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];

  for (let i = 1; i <= 35; i++) {
    const p = patterns[(i - 1) % patterns.length];
    const correctLetter = labels[p.oddIdx];
    const norm = ['A', 'B', 'C', 'D', 'E'];
    qs.push({
      id: `cbat_b1_q${i}`,
      orderIndex: i,
      figures: labels.map((lbl, idx) => ({
        label: lbl,
        svgType: p.types[idx],
        rotation: (idx * 45 + i * 15) % 360
      })),
      normalOptions: norm,
      jumbledOptions: shuffle(norm),
      correctAnswer: correctLetter
    });
  }
  return qs;
};

// ==========================================
// BATTERY 2: Selective Attention (Add of Odd Numbers) - 30 Questions (2 Parts of 15)
// ==========================================
const generateAddOddQuestions = (): CbatQuestion[] => {
  const qs: CbatQuestion[] = [];
  // Sample RDSO digit series
  const seriesList = [
    "4 5 2 3 2 6 4 3 2 1 4 2 1 4 4 2 5 2 1 4 5 3 4 6 4 2 1 3 2 4 2 5 2 3 4 5 2",
    "7 2 1 4 1 2 3 2 4 2 2 2 2 3 4 6 1 6 2 1 3 4 2 1 3 2 3 2 1 2 4 2 5 1 3 2 5 2",
    "1 4 2 2 8 1 4 5 3 2 8 4 3 7 8 6 2 7 6 5 2 4 3 8 8 3 6 1 6 2 6 5 8 2 5 4",
    "5 1 2 1 4 3 4 1 2 3 2 1 2 3 4 2 3 6 1 2 8 1 2 1 6 1 2 1 3 2 3 2 1 2 6 1 2",
    "6 5 7 3 5 4 3 8 2 3 7 2 6 2 5 1 8 5 1 5 6 2 5 3 8 4 4 1 7 8 2 6 5 4 5 2 5 4 2 5",
    "3 8 2 1 4 7 2 9 3 4 2 1 5 6 2 3 8 1 4 7 5 2 3 9 1 4 6 2 8 3 5 1 7 2 4 3",
    "9 2 4 1 3 8 2 5 7 1 4 3 6 2 8 5 1 3 4 7 2 9 3 5 1 6 2 4 8 3 7 1 5 2 9 4",
    "2 5 7 1 4 3 8 6 2 9 5 1 3 4 7 2 8 6 1 3 5 9 2 4 7 1 8 3 5 2 6 4 9 1 3 7",
    "8 3 5 1 7 2 4 9 6 3 1 5 8 2 7 4 3 9 1 5 6 2 8 4 7 3 1 9 5 2 6 4 8 3 7 1",
    "1 6 2 4 8 3 7 5 9 1 3 6 2 8 4 7 5 3 9 1 6 2 8 4 7 3 5 9 1 6 2 8 4 7 3 5",
    "4 7 2 9 5 1 3 8 6 2 4 7 9 1 5 3 8 6 2 4 7 1 9 5 3 8 6 2 4 7 1 9 5 3 8 6",
    "5 8 3 1 7 2 9 4 6 1 5 8 3 7 2 9 4 6 1 5 8 2 7 3 9 4 6 1 5 8 2 7 3 9 4 6",
    "6 9 4 2 8 1 5 3 7 2 6 9 4 8 1 5 3 7 2 6 9 1 5 4 8 3 7 2 6 9 1 5 4 8 3 7",
    "7 1 5 3 9 2 6 4 8 3 7 1 5 9 2 6 4 8 3 7 1 2 6 5 9 4 8 3 7 1 2 6 5 9 4 8",
    "3 6 9 1 5 2 8 4 7 1 3 6 9 5 2 8 4 7 1 3 6 2 8 9 5 4 7 1 3 6 2 8 9 5 4 7"
  ];

  for (let i = 1; i <= 30; i++) {
    const rawStr = seriesList[(i - 1) % seriesList.length];
    const digits = rawStr.split(' ').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    // calculate true sum of odd numbers
    const oddSum = digits.filter(d => d % 2 !== 0).reduce((acc, v) => acc + v, 0);

    const offsets = [-3, -1, 0, 2, 4];
    const sumOptions = [
      { key: 'A' as const, val: oddSum + offsets[0] },
      { key: 'B' as const, val: oddSum + offsets[1] },
      { key: 'C' as const, val: oddSum }, // Correct answer is C for deterministic testing
      { key: 'D' as const, val: oddSum + offsets[3] },
      { key: 'E' as const, val: oddSum + offsets[4] },
    ];

    const norm = ['A', 'B', 'C', 'D', 'E'];
    qs.push({
      id: `cbat_b2_q${i}`,
      orderIndex: i,
      digitString: rawStr,
      sumOptions,
      normalOptions: norm,
      jumbledOptions: shuffle(norm),
      correctAnswer: 'C'
    });
  }
  return qs;
};

// ==========================================
// BATTERY 3: Spatial Scanning (Short Route Test) - 40 Questions (4 Grids of 10)
// ==========================================
const generateShortRouteQuestions = (): CbatQuestion[] => {
  const qs: CbatQuestion[] = [];
  const routePrompts = [
    // Grid 1 (Q1-10)
    "H - G = ?", "L - Y = ?", "V - P = ?", "C - Q = ?", "L - O = ?",
    "B - Y = ?", "Z - I = ?", "B - K = ?", "A - N = ?", "X - D = ?",
    // Grid 2 (Q11-20)
    "E - M = ?", "W - J = ?", "F - Z = ?", "G - K = ?", "D - V = ?",
    "Y - C = ?", "I - B = ?", "O - H = ?", "P - A = ?", "K - X = ?",
    // Grid 3 (Q21-30)
    "A - M = ?", "B - L = ?", "C - K = ?", "D - J = ?", "E - I = ?",
    "F - H = ?", "G - Z = ?", "H - Y = ?", "Z - X = ?", "Y - W = ?",
    // Grid 4 (Q31-40)
    "V - M = ?", "W - L = ?", "X - K = ?", "Y - J = ?", "Z - I = ?",
    "A - H = ?", "B - G = ?", "C - F = ?", "D - E = ?", "M - V = ?"
  ];

  const norm10 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

  for (let i = 1; i <= 40; i++) {
    const gridIdx = Math.floor((i - 1) / 10);
    const correctVal = String(((i * 3 + 2) % 10) + 1);

    qs.push({
      id: `cbat_b3_q${i}`,
      orderIndex: i,
      gridIndex: gridIdx,
      routePrompt: routePrompts[i - 1],
      normalOptions: norm10,
      jumbledOptions: shuffle(norm10),
      correctAnswer: correctVal
    });
  }
  return qs;
};

// ==========================================
// BATTERY 4: Information Ordering Test (Type-II) - 25 Questions (13 + 12)
// ==========================================
const generateInfoOrderingQuestions = (): CbatQuestion[] => {
  const qs: CbatQuestion[] = [];
  const norm12 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  for (let i = 1; i <= 25; i++) {
    const initialShape = ((i * 2 + 1) % 12) + 1; // Figure 1 to 12
    const boxA = { box: 'A' as const, active: i % 2 !== 0, delta: +1 };
    const boxB = { box: 'B' as const, active: i % 3 !== 0, delta: -2 };
    const boxC = { box: 'C' as const, active: i % 4 !== 0, delta: +3 };
    const boxD = { box: 'D' as const, active: true, delta: -1 };

    let currentVal = initialShape;
    if (boxA.active) currentVal = ((currentVal - 1 + boxA.delta + 12) % 12) + 1;
    if (boxB.active) currentVal = ((currentVal - 1 + boxB.delta + 12) % 12) + 1;
    if (boxC.active) currentVal = ((currentVal - 1 + boxC.delta + 12) % 12) + 1;
    if (boxD.active) currentVal = ((currentVal - 1 + boxD.delta + 12) % 12) + 1;

    qs.push({
      id: `cbat_b4_q${i}`,
      orderIndex: i,
      initialShapeVal: initialShape,
      processBoxValues: [boxA, boxB, boxC, boxD],
      correctShapeVal: currentVal,
      normalOptions: norm12,
      jumbledOptions: shuffle(norm12),
      correctAnswer: String(currentVal)
    });
  }
  return qs;
};

// ==========================================
// BATTERY 5: Personality Test - 35 Questions (18 + 17)
// ==========================================
const generatePersonalityQuestions = (): CbatQuestion[] => {
  const prompts = [
    { hi: "मैं गलती हो जाने के बाद निराश हो जाता हूं-", en: "I get frustrated after making a mistake-" },
    { hi: "मैं शादी में दहेज नहीं लूंगा क्योंकि-", en: "I will not take dowry in marriage because-" },
    { hi: "जब कोई नियम तोड़ता है, तो मुझे गुस्सा आता है-", en: "When someone breaks rules, I get angry-" },
    { hi: "दबाव की स्थिति में मैं शांत रहकर निर्णय लेता हूं-", en: "In high pressure situations, I stay calm and decide-" },
    { hi: "मुझे नए लोगों से मिलने और बात करने में खुशी होती है-", en: "I enjoy meeting and interacting with new people-" },
    { hi: "यदि ट्रेन में आपात स्थिति हो, तो मैं तुरंत सहायता करूंगा-", en: "In an emergency on a train, I will render immediate help-" },
    { hi: "दूसरों की मदद करने में मुझे आंतरिक संतुष्टि मिलती है-", en: "Helping others gives me internal peace and satisfaction-" },
    { hi: "कठिन काम मिलने पर मैं उसे चुनौती के रूप में स्वीकार करता हूं-", en: "When assigned tough work, I accept it as a challenge-" },
    { hi: "मैं समय की पाबंदी का कड़ाई से पालन करता हूं-", en: "I adhere strictly to punctuality and discipline-" },
    { hi: "अधिकारियों द्वारा दिए गए निर्देशों का मैं तुरंत पालन करता हूं-", en: "I immediately comply with directives given by superiors-" },
    { hi: "काम के दौरान मेरा ध्यान आसानी से नहीं भटकता-", en: "During duty, my attention does not get distracted easily-" },
    { hi: "मैं किसी भी प्रकार के भ्रष्टाचार का कड़ा विरोध करता हूं-", en: "I strongly oppose any form of corruption or bribery-" },
    { hi: "सहकर्मियों के साथ मिलकर काम करना मुझे पसंद है-", en: "I enjoy team coordination and working with peers-" },
    { hi: "मुश्किल परिस्थितियों में भी मैं सकारात्मक सोच रखता हूं-", en: "Even in adverse situations, I maintain an optimistic mindset-" },
    { hi: "रेलवे सुरक्षा नियमों को हमेशा सर्वोच्च प्राथमिकता मिलनी चाहिए-", en: "Railway safety protocols must always have top priority-" },
    { hi: "मैं अपनी गलतियों को तुरंत स्वीकार कर सुधार करता हूं-", en: "I immediately acknowledge my errors and take corrective steps-" },
    { hi: "अपरिचित स्थानों पर भी मैं आत्मविश्वास महसूस करता हूं-", en: "Even in unfamiliar places, I feel confident and oriented-" },
    { hi: "मुझे दूसरों की आलोचना से ठेस नहीं पहुंचती बल्कि सीखने को मिलता है-", en: "Constructive criticism helps me learn rather than feel hurt-" },
  ];

  const norm3 = ['A', 'B', 'C'];
  const qs: CbatQuestion[] = [];

  for (let i = 1; i <= 35; i++) {
    const p = prompts[(i - 1) % prompts.length];
    qs.push({
      id: `cbat_b5_q${i}`,
      orderIndex: i,
      questionHindi: p.hi,
      questionEnglish: p.en,
      optionsHindiEnglish: [
        { key: 'A', textHi: 'हमेशा', textEn: 'Always' },
        { key: 'B', textHi: 'कभी - कभी', textEn: 'Sometimes' },
        { key: 'C', textHi: 'कभी - नहीं', textEn: 'Never' }
      ],
      normalOptions: norm3,
      jumbledOptions: shuffle(norm3),
      correctAnswer: 'A'
    });
  }
  return qs;
};

// ==========================================
// EXPORT ALL 5 BATTERIES WITH INSTRUCTIONS
// ==========================================
export const ALL_CBAT_BATTERIES: CbatBattery[] = [
  {
    id: 'battery_1_intelligence',
    name: 'Test-1 Intelligence Test',
    hindiName: 'बुद्धि परीक्षण (Classification Test)',
    batteryKey: 'Classification Test',
    totalQuestions: 35,
    durationMinutes: 10,
    durationSeconds: 600,
    instructionsHindi: [
      "यह एक बुद्धि परीक्षण (वर्गीकरण परीक्षण) है।",
      "प्रत्येक प्रश्न में पाँच आकृतियाँ (A, B, C, D, E) हैं, जिनमें से चार आकृतियाँ आपस में किसी न किसी प्रकार समान हैं, जबकि एक आकृति भिन्न है।",
      "आपको यह पहचानना है कि पाँचों आकृतियों में से कौन सी आकृति भिन्न (Odd-one-out) है और उसके विकल्प को चुनना है।"
    ],
    instructionsEnglish: [
      "This is an Intelligence Test (Classification Test).",
      "Each question presents five geometric figures (A, B, C, D, E). Four of the figures share a common property or pattern, while one is distinct.",
      "Identify the figure that is different from the others and mark your answer corresponding to that letter."
    ],
    isSplitView: false,
    chunks: [generateClassificationQuestions()]
  },
  {
    id: 'battery_2_selective_attention',
    name: 'Test-2 Selective Attention Test',
    hindiName: 'चयनात्मक ध्यान परीक्षण (Add of Odd Numbers Test)',
    batteryKey: 'Add of Odd Numbers Test',
    totalQuestions: 30,
    durationMinutes: 8,
    durationSeconds: 480,
    instructionsHindi: [
      "यह परीक्षण आपकी चयनात्मक सतर्कता और एकाग्रता को मापने के लिए है।",
      "प्रत्येक प्रश्न में अंकों की एक लंबी श्रृंखला दी गई है। आपको सम संख्याओं (Even numbers: 2, 4, 6, 8) को छोड़ते हुए केवल विषम संख्याओं (Odd numbers: 1, 3, 5, 7, 9) का योग (Sum) करना है।",
      "सही योग के विकल्प (A, B, C, D, E) का चयन करें। यह पेपर 2 भागों में विभाजित है।"
    ],
    instructionsEnglish: [
      "This test evaluates your selective attention, speed, and numerical alertness.",
      "Each question presents a sequence of single-digit numbers. Disregard all even digits (2, 4, 6, 8) and calculate the total sum of only the odd digits (1, 3, 5, 7, 9).",
      "Select the option (A, B, C, D, E) matching your calculated total. The paper is split into 2 parts of 15 questions each."
    ],
    isSplitView: false,
    chunks: [
      generateAddOddQuestions().slice(0, 15),
      generateAddOddQuestions().slice(15, 30)
    ]
  },
  {
    id: 'battery_3_spatial_scanning',
    name: 'Test-3 Spatial Scanning Test',
    hindiName: 'स्थानिक स्कैनिंग परीक्षण (Short Route Test)',
    batteryKey: 'Short Route Test',
    totalQuestions: 40,
    durationMinutes: 6,
    durationSeconds: 360,
    instructionsHindi: [
      "यह परीक्षण दो स्थानों के मध्य सबसे छोटा मार्ग (Shortest Route) खोजने की क्षमता मापता है।",
      "स्क्रीन के बाएं भाग में एक ग्रिड नक्शा दिया गया है जिसमें काली लाइनें सड़कें हैं और वृत्त (Circles) अवरोध (Obstacles) दर्शाते हैं जिनसे होकर नहीं जाया जा सकता।",
      "दाएं भाग में दो अक्षरों के बीच का मार्ग पूछा गया है (जैसे H - G = ?)। आपको उन दोनों के बीच के सबसे छोटे रास्ते पर स्थित स्टेशन बॉक्स (1 से 10) का नंबर चुनना है।"
    ],
    instructionsEnglish: [
      "This test measures your spatial visualization and ability to identify the shortest viable route between two points.",
      "The left pane displays a grid street map where dark lines are paths and white circles represent blockages/barriers that cannot be traversed.",
      "The right pane poses route problems (e.g. H - G = ?). Determine the shortest path between the two perimeter letters and select the checkpoint box number (1 to 10) situated along that path."
    ],
    isSplitView: true,
    splitPaneTitle: "Grid Street Map",
    chunks: [
      generateShortRouteQuestions().slice(0, 10), // Grid 1
      generateShortRouteQuestions().slice(10, 20), // Grid 2
      generateShortRouteQuestions().slice(20, 30), // Grid 3
      generateShortRouteQuestions().slice(30, 40)  // Grid 4
    ]
  },
  {
    id: 'battery_4_information_ordering',
    name: 'Test-4 Information Ordering Test',
    hindiName: 'सूचना क्रम परीक्षण (Information Ordering Type -II)',
    batteryKey: 'Information Ordering Type -I',
    totalQuestions: 25,
    durationMinutes: 6,
    durationSeconds: 360,
    instructionsHindi: [
      "यह परीक्षण सूचनाओं को नियमानुसार क्रमबद्ध और रूपांतरित करने की क्षमता का परीक्षण करता है।",
      "बाएं भाग में तालिका-1 (प्रोसेस बॉक्स A, B, C, D के स्तर अनुसार मान परिवर्तन) और तालिका-2 (12 आकृतियाँ और उनके संबंधित मान) दी गई हैं।",
      "दाएं भाग में प्रत्येक प्रश्न में एक प्रारंभिक आकृति दी गई है जो प्रोसेस बॉक्स शृंखला से गुजरती है। क्रॉस (X) वाले बॉक्स निष्क्रिय हैं जबकि शेष सक्रिय हैं। अंतिम परिणामी आकृति का मान (1 से 12) चुनें।"
    ],
    instructionsEnglish: [
      "This test assesses rule-based analytical processing and cognitive sequencing.",
      "The left pane shows Table-1 (Process Box level modifiers for columns A, B, C, D) and Table-2 (12 standardized geometric figures with IDs 1 to 12).",
      "Each problem feeds an initial shape through a 4-box sequential transformer. Boxes marked with 'X' are bypassed. Calculate the final net value and choose the corresponding shape code (1 to 12)."
    ],
    isSplitView: true,
    splitPaneTitle: "Reference Tables (तालिका-1 एवं तालिका-2)",
    chunks: [
      generateInfoOrderingQuestions().slice(0, 13),
      generateInfoOrderingQuestions().slice(13, 25)
    ]
  },
  {
    id: 'battery_5_personality',
    name: 'Test-5 Personality Test',
    hindiName: 'व्यक्तित्व परीक्षण (Personality Test)',
    batteryKey: 'Personality Test',
    totalQuestions: 35,
    durationMinutes: 12,
    durationSeconds: 720,
    instructionsHindi: [
      "यह व्यक्तित्व एवं दृष्टिकोण परीक्षण है। इसमें कोई प्रश्न 'सही' या 'गलत' नहीं होता, यह आपके स्वभाव, निर्णय क्षमता एवं मानसिक दृढ़ता का आकलन करता है।",
      "प्रत्येक कथन को ध्यान से पढ़ें और अपने स्वाभाविक विचार के अनुसार 'हमेशा (A)', 'कभी-कभी (B)', अथवा 'कभी-नहीं (C)' में से एक विकल्प चुनें।",
      "सभी 35 प्रश्नों के उत्तर देना अनिवार्य है।"
    ],
    instructionsEnglish: [
      "This personality and situational judgment test evaluates your temperament, emotional stability, decision-making, and integrity.",
      "Read each statement carefully and mark the option best describing your behavioral inclination: Always (A), Sometimes (B), or Never (C).",
      "It is compulsory to attempt all questions to obtain valid T-score evaluation."
    ],
    isSplitView: false,
    chunks: [
      generatePersonalityQuestions().slice(0, 18),
      generatePersonalityQuestions().slice(18, 35)
    ]
  }
];

export function matchCbatBatteryKey(name: string): CbatBattery['batteryKey'] | null {
  const lower = (name || '').toLowerCase();
  if (lower.includes('classif') || lower.includes('intelligence') || lower.includes('वर्गीकरण') || lower.includes('बुद्धि')) {
    return 'Classification Test';
  }
  if (lower.includes('odd') || lower.includes('attention') || lower.includes('विषम') || lower.includes('ध्यान')) {
    return 'Add of Odd Numbers Test';
  }
  if (lower.includes('route') || lower.includes('spatial') || lower.includes('मार्ग') || lower.includes('स्थानिक') || lower.includes('नक्शा')) {
    return 'Short Route Test';
  }
  if (lower.includes('order') || lower.includes('information') || lower.includes('सूचना') || lower.includes('क्रम')) {
    return 'Information Ordering Type -I';
  }
  if (lower.includes('personality') || lower.includes('व्यक्तित्व')) {
    return 'Personality Test';
  }
  return null;
}

function extractAllImages(html: string): { src: string; alt: string }[] {
  const imgs: { src: string; alt: string }[] = [];
  const imgRegex = /<img\s+[^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const tag = match[0];
    const srcMatch = tag.match(/src=["']([^"']+)["']/i);
    const altMatch = tag.match(/alt=["']([^"']*)["']/i);
    if (srcMatch && srcMatch[1]) {
      imgs.push({
        src: srcMatch[1],
        alt: altMatch ? altMatch[1] : ''
      });
    }
  }
  return imgs;
}

export function buildCbatBatteriesFromCustomQuestions(
  rawQuestions: any[], 
  sectionalTimings?: any[],
  testTitle?: string,
  testDurationMinutes?: number
): CbatBattery[] {
  if (!rawQuestions || !Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    return ALL_CBAT_BATTERIES;
  }

  const grouped: Record<CbatBattery['batteryKey'], any[]> = {
    'Classification Test': [],
    'Add of Odd Numbers Test': [],
    'Short Route Test': [],
    'Information Ordering Type -I': [],
    'Personality Test': []
  };

  // Check if test title infers a specific sectional battery
  const fallbackKey = matchCbatBatteryKey(testTitle || '');

  rawQuestions.forEach((q, idx) => {
    let key = matchCbatBatteryKey(q.section || '');
    if (!key && fallbackKey) {
      key = fallbackKey;
    }
    if (key && grouped[key]) {
      grouped[key].push({ ...q, originalIndex: idx });
    }
  });

  // If none matched, but we have a fallback key, assign all questions to fallbackKey
  let totalMatched = Object.values(grouped).reduce((sum, list) => sum + list.length, 0);
  if (totalMatched === 0 && fallbackKey) {
    grouped[fallbackKey] = rawQuestions.map((q, idx) => ({ ...q, originalIndex: idx }));
    totalMatched = rawQuestions.length;
  }

  if (totalMatched === 0) {
    return ALL_CBAT_BATTERIES;
  }

  const baseBatteries = ALL_CBAT_BATTERIES;

  // If only a subset of batteries have questions (e.g. Sectional Test), ONLY return those active batteries!
  const hasMatchedBatteries = baseBatteries.filter(b => (grouped[b.batteryKey] || []).length > 0);
  const targetBatteries = hasMatchedBatteries.length > 0 ? hasMatchedBatteries : baseBatteries;

  return targetBatteries.map((base, bIdx) => {
    const rawList = grouped[base.batteryKey] || [];
    if (rawList.length === 0) {
      return base;
    }

    // Determine duration minutes
    let durationMinutes = base.durationMinutes;
    if (targetBatteries.length === 1 && testDurationMinutes && testDurationMinutes > 0) {
      durationMinutes = testDurationMinutes;
    } else if (sectionalTimings && Array.isArray(sectionalTimings) && sectionalTimings[bIdx]) {
      durationMinutes = Number(sectionalTimings[bIdx]) || base.durationMinutes;
    }

    const parsedQuestions: CbatQuestion[] = rawList.map((rq, qIndex) => {
      const qNum = qIndex + 1;
      const htmlText = rq.textEn || rq.textHi || '';

      const allImages = extractAllImages(htmlText);
      const refImgObj = allImages.find(img => /reference|grid|table|नक्शा|तालिका/i.test(img.alt));
      const quesImgObj = allImages.find(img => /question|problem|प्रश्न/i.test(img.alt));

      let refImageUrl = refImgObj?.src;
      let imageUrl = quesImgObj?.src;

      if (base.batteryKey === 'Short Route Test') {
        if (!refImageUrl && allImages.length > 0) {
          refImageUrl = allImages[0].src;
        }
      } else if (base.batteryKey === 'Information Ordering Type -I') {
        if (!refImageUrl && allImages.length > 0) {
          refImageUrl = allImages[0].src;
        }
        if (!imageUrl && allImages.length > 1) {
          imageUrl = allImages[1].src;
        } else if (!imageUrl && allImages.length === 1 && !refImgObj) {
          imageUrl = allImages[0].src;
        }
      } else if (base.batteryKey === 'Classification Test') {
        if (!imageUrl && allImages.length > 0) {
          imageUrl = allImages[0].src;
        }
      } else {
        if (!imageUrl && allImages.length > 0) {
          imageUrl = allImages[0].src;
        }
      }

      // Clean prompt text (strip img tags and html markup)
      let promptText = htmlText
        .replace(/<img[^>]*>/gi, '')
        .replace(/<\/p>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      const optionsEn: string[] = Array.isArray(rq.optionsEn) ? rq.optionsEn : [];
      const optionsHi: string[] = Array.isArray(rq.optionsHi) ? rq.optionsHi : [];

      let normalOptions: string[] = [];
      let sumOptions: { key: 'A' | 'B' | 'C' | 'D' | 'E'; val: string }[] | undefined;
      let optionsHindiEnglish: { key: 'A' | 'B' | 'C'; textHi: string; textEn: string }[] | undefined;
      const letterKeys: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];

      if (base.batteryKey === 'Classification Test') {
        normalOptions = ['A', 'B', 'C', 'D', 'E'];
      } else if (base.batteryKey === 'Add of Odd Numbers Test') {
        normalOptions = ['A', 'B', 'C', 'D', 'E'];
        sumOptions = optionsEn.slice(0, 5).map((val, idx) => ({
          key: letterKeys[idx] || 'A',
          val: String(val)
        }));
      } else if (base.batteryKey === 'Short Route Test') {
        normalOptions = optionsEn.length > 0 ? optionsEn.map(String) : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
      } else if (base.batteryKey === 'Information Ordering Type -I') {
        normalOptions = optionsEn.length > 0 ? optionsEn.map(String) : ['1', '2', '3', '4', '5'];
      } else if (base.batteryKey === 'Personality Test') {
        normalOptions = ['A', 'B', 'C'];
        optionsHindiEnglish = [
          { key: 'A', textHi: optionsHi[0] || 'हमेशा', textEn: optionsEn[0] || 'Always' },
          { key: 'B', textHi: optionsHi[1] || 'कभी - कभी', textEn: optionsEn[1] || 'Sometimes' },
          { key: 'C', textHi: optionsHi[2] || 'कभी - नहीं', textEn: optionsEn[2] || 'Never' },
        ];
      } else {
        normalOptions = optionsEn.length > 0 ? optionsEn.map(String) : ['A', 'B', 'C', 'D'];
      }

      // Determine correct answer
      let correctAnswer = 'A';
      const cIdx = typeof rq.correctIndex === 'number' ? rq.correctIndex : 0;
      if (base.batteryKey === 'Short Route Test' || base.batteryKey === 'Information Ordering Type -I') {
        correctAnswer = normalOptions[cIdx] || String(cIdx + 1);
      } else {
        correctAnswer = letterKeys[cIdx] || 'A';
      }

      return {
        id: rq.id || `cbat_${base.id}_q${qNum}`,
        orderIndex: qNum,
        section: rq.section || base.batteryKey,
        rawHtml: htmlText,
        imageUrl,
        refImageUrl,
        promptText: promptText || undefined,
        digitString: base.batteryKey === 'Add of Odd Numbers Test' ? promptText : undefined,
        sumOptions,
        routePrompt: base.batteryKey === 'Short Route Test' ? promptText : undefined,
        questionHindi: rq.textHi || undefined,
        questionEnglish: rq.textEn || undefined,
        optionsHindiEnglish,
        normalOptions,
        jumbledOptions: shuffle(normalOptions),
        correctAnswer
      };
    });

    // Chunking logic based on battery standards
    let chunks: CbatQuestion[][] = [];
    if (base.batteryKey === 'Classification Test') {
      chunks = [parsedQuestions];
    } else if (base.batteryKey === 'Add of Odd Numbers Test') {
      const mid = Math.ceil(parsedQuestions.length / 2);
      chunks = [parsedQuestions.slice(0, mid), parsedQuestions.slice(mid)].filter(c => c.length > 0);
    } else if (base.batteryKey === 'Short Route Test') {
      const chunkSize = Math.ceil(parsedQuestions.length / 4);
      chunks = [
        parsedQuestions.slice(0, chunkSize),
        parsedQuestions.slice(chunkSize, chunkSize * 2),
        parsedQuestions.slice(chunkSize * 2, chunkSize * 3),
        parsedQuestions.slice(chunkSize * 3)
      ].filter(c => c.length > 0);
    } else if (base.batteryKey === 'Information Ordering Type -I') {
      const mid = Math.ceil(parsedQuestions.length / 2);
      chunks = [parsedQuestions.slice(0, mid), parsedQuestions.slice(mid)].filter(c => c.length > 0);
    } else if (base.batteryKey === 'Personality Test') {
      if (parsedQuestions.length > 20) {
        const mid = Math.ceil(parsedQuestions.length / 2);
        chunks = [parsedQuestions.slice(0, mid), parsedQuestions.slice(mid)].filter(c => c.length > 0);
      } else {
        chunks = [parsedQuestions];
      }
    } else {
      chunks = [parsedQuestions];
    }

    return {
      ...base,
      totalQuestions: parsedQuestions.length,
      durationMinutes,
      durationSeconds: durationMinutes * 60,
      chunks
    };
  });
}

