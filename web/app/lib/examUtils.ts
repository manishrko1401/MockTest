import { ActiveSession, Question, Section } from '../useTestEngine';
import { TestCategory, MockTestItem } from '../AuthContext';

export const EXPLANATIONS: Record<string, { en: string; hi: string }> = {
  q_q1: {
    en: "Given, x + 1/x = 5.\n\nSquaring both sides:\n(x + 1/x)² = 5²\nx² + 2(x)(1/x) + 1/x² = 25\nx² + 2 + 1/x² = 25\nx² + 1/x² = 25 - 2 = 23.\n\nHence, the correct answer is 23.",
    hi: "दिया गया है, x + 1/x = 5.\n\nदोनों ओर वर्ग करने पर:\n(x + 1/x)² = 5²\nx² + 2(x)(1/x) + 1/x² = 25\nx² + 2 + 1/x² = 25\nx² + 1/x² = 25 - 2 = 23.\n\nइसलिए, सही उत्तर 23 है।"
  },
  q_q2: {
    en: "Let present ages of A and B be 4k and 5k respectively.\n\nAfter 5 years:\n(4k + 5) / (5k + 5) = 5/6\n6(4k + 5) = 5(5k + 5)\n24k + 30 = 25k + 25\nk = 5.\n\nA's present age = 4k = 4(5) = 20 years.\n\nHence, the correct answer is 20 years.",
    hi: "माना कि A और B की वर्तमान आयु क्रमशः 4k और 5k है।\n\n5 वर्ष बाद:\n(4k + 5) / (5k + 5) = 5/6\n6(4k + 5) = 5(5k + 5)\n24k + 30 = 25k + 25\nk = 5.\n\nA की वर्तमान आयु = 4k = 4(5) = 20 वर्ष।\n\nइसलिए, सही उत्तर 20 वर्ष है।"
  },
  q_r1: {
    en: "The pattern in the series is as follows:\n- 3 × 2 + 1 = 7\n- 7 × 2 + 1 = 15\n- 15 × 2 + 1 = 31\n- 31 × 2 + 1 = 63\n- 63 × 2 + 1 = 127\n\nHence, the next term is 127.",
    hi: "श्रृंखला में पैटर्न इस प्रकार है:\n- 3 × 2 + 1 = 7\n- 7 × 2 + 1 = 15\n- 15 × 2 + 1 = 31\n- 31 × 2 + 1 = 63\n- 63 × 2 + 1 = 127\n\nइसलिए, अगला पद 127 है।"
  },
  q_e1: {
    en: "OBSTINATE means stubborn and refusing to change one's opinion. The antonym is Flexible, which means ready and able to change so as to adapt to different circumstances.\n- Stubborn: synonym\n- Rigid: synonym\n- Dogmatic: synonym",
    hi: "OBSTINATE का अर्थ हठी या अड़ियल होता है। इसका विलोम शब्द Flexible (लचीला) है, जिसका अर्थ परिस्थितियों के अनुसार ढलने वाला होता है।\n- Stubborn (अड़ियल): पर्यायवाची\n- Rigid (कठोर): पर्यायवाची\n- Dogmatic (कट्टर): पर्यायवाची"
  },
  q_m1: {
    en: "Using the algebraic identity a² - b² = (a - b)(a + b):\n\nLet a = 0.43 and b = 0.17.\nExpression: (a² - b²) / (a - b) = (a - b)(a + b) / (a - b) = a + b\n\nValue = 0.43 + 0.17 = 0.60.\n\nHence, the correct answer is 0.60.",
    hi: "बीजगणितीय सूत्र a² - b² = (a - b)(a + b) का उपयोग करने पर:\n\nमाना a = 0.43 और b = 0.17.\nसमीकरण: (a² - b²) / (a - b) = (a - b)(a + b) / (a - b) = a + b\n\nमान = 0.43 + 0.17 = 0.60.\n\nइसलिए, सही उत्तर 0.60 है।"
  },
  q_g1: {
    en: "Wular Lake is the largest freshwater lake in India. It is located in Jammu and Kashmir. It was formed as a result of tectonic activity and is fed by the Jhelum River.",
    hi: "वुलर झील भारत में मीठे पानी की सबसे बड़ी झील है। यह जम्मू और कश्मीर में स्थित है। यह टेक्टोनिक गतिविधि के परिणामस्वरूप बनी थी और इसे झेलम नदी द्वारा पानी मिलता है।"
  },
  q_gen1: {
    en: "The SI unit of electric current is the Ampere (symbol: A). It is named after André-Marie Ampère, one of the main discoverers of electromagnetism.",
    hi: "विद्युत धारा की SI इकाई एम्पीयर (प्रतीक: A) है। इसका नाम विद्युत चुंबकत्व के मुख्य खोजकर्ताओं में से एक आंद्रे-मेरी एम्पीयर के नाम पर रखा गया है।"
  },
  q_gen2: {
    en: "Mars is known as the Red Planet due to the abundance of iron oxide (rust) on its surface, which gives it a reddish, rusty appearance.",
    hi: "मंगल को उसकी सतह पर आयरन ऑक्साइड (जंग) की प्रचुरता के कारण लाल ग्रह के रूप में जाना जाता है, जो इसे लाल रंग का रूप देता है।"
  }
};

export const generateExamSession = (id: string, examCatalog?: TestCategory[], customQs?: any, lang1?: string, lang2?: string): ActiveSession => {
  let title = "Government Prep Mock Test Simulator";
  let duration = 3600; // 60 mins
  let catalogTest: MockTestItem | null = null;
  let hasSectionalTiming = false;
  let sectionalTimingsMins: number[] = [];
  let foundCategoryName = '';
  let foundSubcategoryName = '';

  if (examCatalog) {
    for (const cat of examCatalog) {
      for (const sub of cat.subCategories) {
        if (sub.subSubCategories) {
          for (const subSub of sub.subSubCategories) {
            const found = subSub.tests.find(t => t.id === id);
            if (found) {
              catalogTest = found;
              foundCategoryName = cat.name;
              foundSubcategoryName = sub.name || subSub.name;
              break;
            }
          }
        } else if (sub.tests) {
          const found = sub.tests.find(t => t.id === id);
          if (found) {
            catalogTest = found;
            foundCategoryName = cat.name;
            foundSubcategoryName = sub.name;
            break;
          }
        }
        if (catalogTest) break;
      }
      if (catalogTest) break;
    }
  }

  if (catalogTest) {
    title = catalogTest.title;
    duration = catalogTest.durationMinutes * 60;
    hasSectionalTiming = catalogTest.hasSectionalTiming ?? false;
    sectionalTimingsMins = (catalogTest.sectionalTimings as number[] | undefined) ?? [];
  }

  let sections: Section[] = [
    { id: "sec_gs", name: "General Studies", orderIndex: 0, positiveMark: 2, negativeMark: 0.5 },
    { id: "sec_quant", name: "Quantitative Aptitude", orderIndex: 1, positiveMark: 2, negativeMark: 0.5 }
  ];
  let questions: Question[] = [];

  // Check if we have custom uploaded questions
  let hasCustomQuestions = false;
  const rawCustomQs = Array.isArray(customQs) ? customQs : (customQs?.questions || null);

  if (customQs && !Array.isArray(customQs)) {
    if (customQs.durationMinutes) {
      duration = Number(customQs.durationMinutes) * 60;
    }
    if (customQs.hasSectionalTiming !== undefined && customQs.hasSectionalTiming !== null) {
      hasSectionalTiming = Boolean(customQs.hasSectionalTiming);
    }
    if (customQs.sectionalTimings) {
      if (Array.isArray(customQs.sectionalTimings)) {
        sectionalTimingsMins = customQs.sectionalTimings;
      } else if (typeof customQs.sectionalTimings === 'string' && customQs.sectionalTimings.trim()) {
        sectionalTimingsMins = customQs.sectionalTimings.split(',').map((s: string) => Number(s.trim())).filter((n: number) => !isNaN(n) && n > 0);
      }
    }
  }

  if (rawCustomQs && Array.isArray(rawCustomQs) && rawCustomQs.length > 0) {
    hasCustomQuestions = true;
    const positiveMark = customQs?.positiveMarks !== undefined && customQs?.positiveMarks !== null
      ? Number(customQs.positiveMarks)
      : (catalogTest?.positiveMarks !== undefined ? Number(catalogTest.positiveMarks) : (id.includes('rrb') ? 1 : 2));
    const negativeMark = customQs?.negativeMarks !== undefined && customQs?.negativeMarks !== null
      ? Number(customQs.negativeMarks)
      : (catalogTest?.negativeMarks !== undefined ? Number(catalogTest.negativeMarks) : (id.includes('rrb') ? 0.33 : 0.5));

    const isCtet = id.includes('ctet');
    if (isCtet) {
      const selectedL1 = lang1 || 'English';
      const selectedL2 = lang2 || 'Hindi';

      const targetSecConfigs = [
        { id: 'sec_cdp', name: 'Child Development and Pedagogy', matchSection: 'Child Development and Pedagogy' },
        { id: 'sec_subject', name: 'Social Studies', matchSection: 'Social Studies' },
        { id: 'sec_lang1', name: `Language - I (${selectedL1})`, matchSection: `${selectedL1} - I` },
        { id: 'sec_lang2', name: `Language - II (${selectedL2})`, matchSection: `${selectedL2} - II` },
      ];

      sections = targetSecConfigs.map((cfg, idx) => ({
        id: cfg.id,
        name: cfg.name,
        orderIndex: idx,
        positiveMark: 1,
        negativeMark: 0,
      }));

      const filteredQuestions: Question[] = [];

      targetSecConfigs.forEach((cfg) => {
        const matchingRawQs = rawCustomQs.filter((item: any) => {
          const secStr = String(item.section || item.subject || '').trim();
          return secStr.toLowerCase() === cfg.matchSection.toLowerCase();
        });

        matchingRawQs.forEach((item: any, qIdx: number) => {
          filteredQuestions.push({
            id: item.id || `q_ctet_${cfg.id}_${qIdx}`,
            sectionId: cfg.id,
            questionType: 'mcq',
            orderIndex: qIdx,
            correctOptionIndex: item.correctIndex ?? 0,
            content: {
              en: {
                questionText: item.textEn || item.questionText || '',
                options: item.optionsEn || item.options || [],
                imageUrl: item.imageUrlEn || item.imageUrl,
                comprehension: item.comprehensionEn || item.comprehension
              },
              hi: {
                questionText: item.textHi || item.questionText || item.textEn || '',
                options: item.optionsHi || item.options || item.optionsEn || [],
                imageUrl: item.imageUrlHi || item.imageUrl,
                comprehension: item.comprehensionHi || item.comprehension
              }
            },
            explanation: {
              en: item.explanationEn || item.explanation || "Detailed explanation provided.",
              hi: item.explanationHi || item.explanation || "विस्तृत व्याख्या प्रदान की गई है।"
            }
          });
        });
      });

      if (filteredQuestions.length > 0) {
        questions = filteredQuestions;
      }
    } else {
      // Dynamically build sections based on unique question section fields
      const sectionNames: string[] = [];
      rawCustomQs.forEach((item: any) => {
        const sec = item.section || "General Studies";
        if (!sectionNames.includes(sec)) {
          sectionNames.push(sec);
        }
      });

      // Check if customQs or catalogTest has custom section rules
      const customSectionsMap: Record<string, { positiveMark: number; negativeMark: number }> = {};
      const metaSections = (customQs && typeof customQs === 'object' && 'sections' in customQs) ? customQs.sections : ((catalogTest as any)?.sections || []);
      if (Array.isArray(metaSections)) {
        metaSections.forEach((s: any) => {
          if (s && s.name) {
            customSectionsMap[s.name.trim().toLowerCase()] = {
              positiveMark: s.positiveMarks !== undefined ? Number(s.positiveMarks) : (s.positiveMark !== undefined ? Number(s.positiveMark) : positiveMark),
              negativeMark: s.negativeMarks !== undefined ? Number(s.negativeMarks) : (s.negativeMark !== undefined ? Number(s.negativeMark) : negativeMark),
            };
          }
        });
      }

      sections = sectionNames.map((name, idx) => {
        const secLower = name.trim().toLowerCase();
        const secRule = customSectionsMap[secLower];
        const secPosMark = secRule?.positiveMark !== undefined ? secRule.positiveMark : positiveMark;
        const secNegMark = secRule?.negativeMark !== undefined ? secRule.negativeMark : negativeMark;

        return {
          id: `sec_custom_${idx}`,
          name,
          orderIndex: idx,
          positiveMark: secPosMark,
          negativeMark: secNegMark,
          durationSeconds: hasSectionalTiming && sectionalTimingsMins[idx] ? sectionalTimingsMins[idx] * 60 : undefined,
        };
      });

      const sectionCounters: Record<string, number> = {};
      sectionNames.forEach(name => {
        sectionCounters[name] = 0;
      });

      questions = rawCustomQs.map((item: any, idx: number) => {
        const secName = item.section || "General Studies";
        const secId = `sec_custom_${sectionNames.indexOf(secName)}`;
        const qOrder = sectionCounters[secName]++;

        const secLower = secName.trim().toLowerCase();
        const secRule = customSectionsMap[secLower];
        const defaultPosForSection = secRule?.positiveMark !== undefined ? secRule.positiveMark : positiveMark;
        const defaultNegForSection = secRule?.negativeMark !== undefined ? secRule.negativeMark : negativeMark;

        const qPosMark = item.positiveMarks !== undefined && item.positiveMarks !== null && item.positiveMarks !== '' 
          ? Number(item.positiveMarks) 
          : (item.positiveMark !== undefined && item.positiveMark !== null && item.positiveMark !== '' ? Number(item.positiveMark) : defaultPosForSection);

        const qNegMark = item.negativeMarks !== undefined && item.negativeMarks !== null && item.negativeMarks !== '' 
          ? Number(item.negativeMarks) 
          : (item.negativeMark !== undefined && item.negativeMark !== null && item.negativeMark !== '' ? Number(item.negativeMark) : defaultNegForSection);

        return {
          id: item.id || `q_custom_${id}_${idx}`,
          sectionId: secId,
          questionType: "mcq",
          orderIndex: qOrder,
          correctOptionIndex: item.correctIndex ?? 0,
          positiveMark: qPosMark,
          negativeMark: qNegMark,
          content: {
            en: {
              questionText: item.textEn || item.questionText || item.text || '',
              options: item.optionsEn || item.options || [],
              imageUrl: item.imageUrlEn || item.imageUrl,
              comprehension: item.comprehensionEn || item.comprehension
            },
            hi: {
              questionText: item.textHi || item.questionText || item.textHi || item.textEn || item.text || '',
              options: item.optionsHi || item.options || item.optionsEn || item.options || [],
              imageUrl: item.imageUrlHi || item.imageUrl,
              comprehension: item.comprehensionHi || item.comprehension
            }
          },
          explanation: {
            en: item.explanationEn || "Detailed explanation under review.",
            hi: item.explanationHi || "विस्तृत विवरण समीक्षा के अधीन है।"
          }
        };
      });
    }
  }

  if (!hasCustomQuestions) {
    if (catalogTest) {
      title = catalogTest.title || title;
      duration = catalogTest.durationMinutes ? catalogTest.durationMinutes * 60 : duration;
    }
    questions = [];
  }

  return {
    sessionId: `session_${id}_${Date.now().toString().substring(8)}`,
    testId: id,
    testTitle: title,
    testCategory: foundCategoryName,
    testSubcategory: foundSubcategoryName,
    totalDurationSeconds: duration,
    sections,
    questions,
    hasSectionalTiming,
  };
};

export const HINDI_NAME_MAP: Record<string, string> = {
  // Category Names
  "SSC Exams": "एसएससी परीक्षा",
  "Banking & Insurance Exams": "बैंकिंग और बीमा परीक्षा",
  "Banking Exams": "बैंकिंग परीक्षा",
  "Railway Exams": "रेलवे परीक्षा",
  "Teaching Exams": "शिक्षण परीक्षा",
  "UGC NET & SET Exams": "यूजीसी नेट और राज्य परीक्षा",
  "UGC NET Exams": "यूजीसी नेट परीक्षा",
  "Practice Series": "अभ्यास सीरीज़",
  "Engineering Recruitment Exams": "इंजीनियरिंग भर्ती परीक्षा",
  "Civil Services Exams": "सिविल सेवा परीक्षा",
  "UPSC Exams": "यूपीएससी परीक्षा",
  "Defense Exams": "रक्षा परीक्षा",
  "Police Exams": "पुलिस परीक्षा",
  "SSC": "एसएससी",
  "Banking": "बैंकिंग",
  "Railways": "रेलवे",
  "Teaching": "शिक्षण",

  // Subcategories / Exam Names
  "SSC CGL": "एसएससी सीजीएल",
  "SSC CHSL": "एसएससी सीएचएसएल",
  "SSC GD Constable": "एसएससी जीडी कांस्टेबल",
  "SSC GD": "एसएससी जीडी",
  "SSC MTS": "एसएससी एमटीएस",
  "SSC CPO": "एसएससी सीपीओ",
  "SSC Stenographer": "एसएससी स्टेनो",
  "SSC Steno": "एसएससी स्टेनो",
  "SSC Selection Post": "एसएससी सिलेक्शन पोस्ट",
  "SSC JE": "एसएससी जेई",
  "SSC JE Civil": "एसएससी जेई सिविल",
  "SSC JE Electrical": "एसएससी जेई इलेक्ट्रिकल",
  "SSC JE Mechanical": "एसएससी जेई मैकेनिकल",
  "RRB NTPC": "आरआरबी एनटीपीसी",
  "RRB Group D": "आरआरबी ग्रुप डी",
  "RRB ALP": "आरआरबी एएलपी",
  "RRB ALP & Technician": "आरआरबी एएलपी व तकनीशियन",
  "RRB JE": "आरआरबी जेई",
  "RRB Technician": "आरआरबी तकनीशियन",
  "IBPS PO": "आईबीपीएस पीओ",
  "IBPS Clerk": "आईबीपीएस क्लर्क",
  "SBI PO": "एसबीआई पीओ",
  "SBI Clerk": "एसबीआई क्लर्क",
  "IBPS RRB PO": "आईबीपीएस आरआरबी पीओ",
  "IBPS RRB Clerk": "आईबीपीएस आरआरबी क्लर्क",
  "RBI Assistant": "आरबीआई असिस्टेंट",
  "RBI Grade B": "आरबीआई ग्रेड बी",
  "LIC AAO": "एलआईसी एएओ",
  "LIC ADO": "एलआईसी एडीओ",
  "CTET": "सीटीईटी",
  "CTET Paper 1": "सीटीईटी पेपर 1",
  "CTET Paper 2": "सीटीईटी पेपर 2",
  "UPTET": "यूपीटीईटी",
  "REET": "रीट",
  "SUPER TET": "सुपर टेट",
  "UGC NET Paper 1": "यूजीसी नेट पेपर 1",
  "UGC NET Computer Science": "यूजीसी नेट कंप्यूटर साइंस",
  "UGC NET Commerce": "यूजीसी नेट कॉमर्स",
  "CSIR NET": "सीएसआईआर नेट",

  // Sub-subcategory / Group Names
  "Full Test": "फुल मॉक टेस्ट सीरीज़",
  "Full Length Test": "फुल लेंथ टेस्ट सीरीज़",
  "Full Mock Tests": "फुल मॉक टेस्ट",
  "Full Test Series": "फुल टेस्ट सीरीज़",
  "Chapter Test": "अध्याय-वार टेस्ट सीरीज़",
  "Chapter Wise Test": "चैप्टर वाइज़ टेस्ट",
  "Chapter Tests": "अध्याय-वार टेस्ट",
  "Sectional Test": "अनुभाग-वार (सेक्शनल) टेस्ट सीरीज़",
  "Sectional Tests": "सेक्शनल टेस्ट",
  "Previous Year Papers": "विगत वर्षों के प्रश्न पत्र (PYP)",
  "Previous Year Paper": "विगत वर्ष के प्रश्न पत्र",
  "PYP Series": "PYP सीरीज़",
  "PYP": "PYP (पुराने पेपर)",
  "Subject Test": "विषय-वार टेस्ट",
  "Subject Tests": "विषय-वार टेस्ट सीरीज़",
  "Current Affairs Test": "सामयिकी (करंट अफेयर्स) टेस्ट",
  "Current Affairs": "करंट अफेयर्स",
  "Live Test": "लाइव टेस्ट",
  "Mini Test": "मिनी टेस्ट",
  "Speed Test": "स्पीड टेस्ट",
};

export const getLocalizedName = (
  target: any,
  language: string = 'en'
): string => {
  if (!target) return '';

  // 1. If target is an object with explicit Hindi fields
  if (typeof target === 'object' && target !== null) {
    if (language === 'hi') {
      const explicitHi = target.nameHi || target.titleHi || target.name_hi || target.title_hi;
      if (explicitHi && typeof explicitHi === 'string' && explicitHi.trim()) {
        return explicitHi.trim();
      }
    }
    const rawName = target.name || target.title || target.nameEn || target.titleEn || '';
    return getLocalizedName(rawName, language);
  }

  // 2. Target is a string
  const str = String(target).trim();
  if (!str) return '';
  if (language !== 'hi') return str;

  // Direct map match
  if (HINDI_NAME_MAP[str]) {
    return HINDI_NAME_MAP[str];
  }

  // Case-insensitive direct map lookup
  const lowerKey = str.toLowerCase();
  for (const [key, val] of Object.entries(HINDI_NAME_MAP)) {
    if (key.toLowerCase() === lowerKey) {
      return val;
    }
  }

  // String replacement patterns for Test Titles and dynamic titles
  let translated = str;

  // Domain & Category terms
  translated = translated.replace(/\bSSC Exams\b/gi, "एसएससी परीक्षा");
  translated = translated.replace(/\bRailway Exams\b/gi, "रेलवे परीक्षा");
  translated = translated.replace(/\bBanking & Insurance Exams\b/gi, "बैंकिंग और बीमा परीक्षा");
  translated = translated.replace(/\bBanking Exams\b/gi, "बैंकिंग परीक्षा");
  translated = translated.replace(/\bTeaching Exams\b/gi, "शिक्षण परीक्षा");
  translated = translated.replace(/\bUGC NET & SET Exams\b/gi, "यूजीसी नेट परीक्षा");
  translated = translated.replace(/\bPractice Series\b/gi, "अभ्यास सीरीज़");

  // Specific Exam Names
  translated = translated.replace(/\bSSC CGL\b/gi, "एसएससी सीजीएल");
  translated = translated.replace(/\bSSC CHSL\b/gi, "एसएससी सीएचएसएल");
  translated = translated.replace(/\bSSC GD Constable\b/gi, "एसएससी जीडी कांस्टेबल");
  translated = translated.replace(/\bSSC GD\b/gi, "एसएससी जीडी");
  translated = translated.replace(/\bSSC MTS\b/gi, "एसएससी एमटीएस");
  translated = translated.replace(/\bSSC CPO\b/gi, "एसएससी सीपीओ");
  translated = translated.replace(/\bSSC Stenographer\b/gi, "एसएससी स्टेनो");
  translated = translated.replace(/\bSSC Steno\b/gi, "एसएससी स्टेनो");
  translated = translated.replace(/\bSSC Selection Post\b/gi, "एसएससी सिलेक्शन पोस्ट");
  translated = translated.replace(/\bSSC JE Civil\b/gi, "एसएससी जेई सिविल");
  translated = translated.replace(/\bSSC JE Electrical\b/gi, "एसएससी जेई इलेक्ट्रिकल");
  translated = translated.replace(/\bSSC JE Mechanical\b/gi, "एसएससी जेई मैकेनिकल");
  translated = translated.replace(/\bSSC JE\b/gi, "एसएससी जेई");

  translated = translated.replace(/\bRRB NTPC\b/gi, "आरआरबी एनटीपीसी");
  translated = translated.replace(/\bRRB Group D\b/gi, "आरआरबी ग्रुप डी");
  translated = translated.replace(/\bRRB ALP & Technician\b/gi, "आरआरबी एएलपी व तकनीशियन");
  translated = translated.replace(/\bRRB ALP\b/gi, "आरआरबी एएलपी");
  translated = translated.replace(/\bRRB JE\b/gi, "आरआरबी जेई");

  translated = translated.replace(/\bIBPS PO\b/gi, "आईबीपीएस पीओ");
  translated = translated.replace(/\bIBPS Clerk\b/gi, "आईबीपीएस क्लर्क");
  translated = translated.replace(/\bSBI PO\b/gi, "एसबीआई पीओ");
  translated = translated.replace(/\bSBI Clerk\b/gi, "एसबीआई क्लर्क");
  translated = translated.replace(/\bIBPS RRB PO\b/gi, "आईबीपीएस आरआरबी पीओ");
  translated = translated.replace(/\bIBPS RRB Clerk\b/gi, "आईबीपीएस आरआरबी क्लर्क");
  translated = translated.replace(/\bRBI Assistant\b/gi, "आरबीआई असिस्टेंट");
  translated = translated.replace(/\bRBI Grade B\b/gi, "आरबीआई ग्रेड बी");

  translated = translated.replace(/\bCTET Paper 1\b/gi, "सीटीईटी पेपर 1");
  translated = translated.replace(/\bCTET Paper 2\b/gi, "सीटीईटी पेपर 2");
  translated = translated.replace(/\bCTET\b/gi, "सीटीईटी");
  translated = translated.replace(/\bUPTET\b/gi, "यूपीटीईटी");
  translated = translated.replace(/\bREET\b/gi, "रीट");
  translated = translated.replace(/\bSUPER TET\b/gi, "सुपर टेट");
  translated = translated.replace(/\bUGC NET Paper 1\b/gi, "यूजीसी नेट पेपर 1");
  translated = translated.replace(/\bUGC NET\b/gi, "यूजीसी नेट");

  // Test Types & Keywords
  translated = translated.replace(/\bFull-Length Test\b/gi, "फुल लेंथ टेस्ट");
  translated = translated.replace(/\bFull Length Test\b/gi, "फुल लेंथ टेस्ट");
  translated = translated.replace(/\bFull Test\b/gi, "फुल टेस्ट");
  translated = translated.replace(/\bFull Mock\b/gi, "फुल मॉक");
  translated = translated.replace(/\bMock Test\b/gi, "मॉक टेस्ट");
  translated = translated.replace(/\bMock\b/gi, "मॉक");
  translated = translated.replace(/\bChapter Test\b/gi, "चैप्टर टेस्ट");
  translated = translated.replace(/\bSectional Test\b/gi, "सेक्शनल टेस्ट");
  translated = translated.replace(/\bPrevious Year Paper\b/gi, "विगत वर्ष पेपर");
  translated = translated.replace(/\bPrevious Year Papers\b/gi, "विगत वर्षों के प्रश्न पत्र");
  translated = translated.replace(/\bPrevious Year\b/gi, "विगत वर्ष");
  translated = translated.replace(/\bLive Test\b/gi, "लाइव टेस्ट");
  translated = translated.replace(/\bMini Test\b/gi, "मिनी टेस्ट");
  translated = translated.replace(/\bSpeed Test\b/gi, "स्पीड टेस्ट");
  translated = translated.replace(/\bSubject Test\b/gi, "विषय टेस्ट");
  translated = translated.replace(/\bPractice Test\b/gi, "अभ्यास टेस्ट");
  translated = translated.replace(/\bTest Series\b/gi, "टेस्ट सीरीज़");
  translated = translated.replace(/\bExams\b/gi, "परीक्षाएँ");
  translated = translated.replace(/\bExam\b/gi, "परीक्षा");

  // Sub-terms
  translated = translated.replace(/\bPaper-1\b/gi, "पेपर 1");
  translated = translated.replace(/\bPaper 1\b/gi, "पेपर 1");
  translated = translated.replace(/\bPaper-2\b/gi, "पेपर 2");
  translated = translated.replace(/\bPaper 2\b/gi, "पेपर 2");
  translated = translated.replace(/\bPaper-II\b/gi, "पेपर 2");
  translated = translated.replace(/\bPaper-I\b/gi, "पेपर 1");
  translated = translated.replace(/\bTier-1\b/gi, "टियर 1");
  translated = translated.replace(/\bTier 1\b/gi, "टियर 1");
  translated = translated.replace(/\bTier-2\b/gi, "टियर 2");
  translated = translated.replace(/\bTier 2\b/gi, "टियर 2");
  translated = translated.replace(/\bPrelims\b/gi, "प्रारंभिक (Prelims)");
  translated = translated.replace(/\bMains\b/gi, "मुख्य (Mains)");
  translated = translated.replace(/\bShift-1\b/gi, "शिफ्ट 1");
  translated = translated.replace(/\bShift 1\b/gi, "शिफ्ट 1");
  translated = translated.replace(/\bShift-2\b/gi, "शिफ्ट 2");
  translated = translated.replace(/\bShift 2\b/gi, "शिफ्ट 2");
  translated = translated.replace(/\bShift-3\b/gi, "शिफ्ट 3");
  translated = translated.replace(/\bShift 3\b/gi, "शिफ्ट 3");
  translated = translated.replace(/\bSet-(\d+)\b/gi, "सेट $1");
  translated = translated.replace(/\bSet (\d+)\b/gi, "सेट $1");
  translated = translated.replace(/\bTest-(\d+)\b/gi, "टेस्ट $1");
  translated = translated.replace(/\bTest (\d+)\b/gi, "टेस्ट $1");

  return translated;
};
