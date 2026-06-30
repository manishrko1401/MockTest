import { ActiveSession, Question } from '../useTestEngine';
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

export const generateExamSession = (id: string, examCatalog?: TestCategory[], customQs?: any): ActiveSession => {
  let title = "Government Prep Mock Test Simulator";
  let duration = 3600; // 60 mins
  let catalogTest: MockTestItem | null = null;
  let hasSectionalTiming = false;
  let sectionalTimingsMins: number[] = [];

  if (examCatalog) {
    for (const cat of examCatalog) {
      for (const sub of cat.subCategories) {
        if (sub.subSubCategories) {
          for (const subSub of sub.subSubCategories) {
            const found = subSub.tests.find(t => t.id === id);
            if (found) {
              catalogTest = found;
              break;
            }
          }
        } else if (sub.tests) {
          const found = sub.tests.find(t => t.id === id);
          if (found) {
            catalogTest = found;
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

  let sections = [
    { id: "sec_gs", name: "General Studies", orderIndex: 0, positiveMark: 2, negativeMark: 0.5 },
    { id: "sec_quant", name: "Quantitative Aptitude", orderIndex: 1, positiveMark: 2, negativeMark: 0.5 }
  ];
  let questions: Question[] = [];

  // Check if we have custom uploaded questions
  let hasCustomQuestions = false;
  if (customQs && Array.isArray(customQs) && customQs.length > 0) {
    hasCustomQuestions = true;
    const positiveMark = id.includes('rrb') ? 1 : 2;
    const negativeMark = id.includes('rrb') ? 0.33 : 0.5;

    // Dynamically build sections based on unique question section fields
    const sectionNames: string[] = [];
    customQs.forEach((item: any) => {
      const sec = item.section || "General Studies";
      if (!sectionNames.includes(sec)) {
        sectionNames.push(sec);
      }
    });

    sections = sectionNames.map((name, idx) => ({
      id: `sec_custom_${idx}`,
      name,
      orderIndex: idx,
      positiveMark,
      negativeMark,
      durationSeconds: hasSectionalTiming && sectionalTimingsMins[idx] ? sectionalTimingsMins[idx] * 60 : undefined,
    }));

    const sectionCounters: Record<string, number> = {};
    sectionNames.forEach(name => {
      sectionCounters[name] = 0;
    });

    questions = customQs.map((item: any, idx: number) => {
      const secName = item.section || "General Studies";
      const secId = `sec_custom_${sectionNames.indexOf(secName)}`;
      const qOrder = sectionCounters[secName]++;

      return {
        id: item.id || `q_custom_${id}_${idx}`,
        sectionId: secId,
        questionType: "mcq",
        orderIndex: qOrder,
        correctOptionIndex: item.correctIndex ?? 0,
        content: {
          en: {
            questionText: item.textEn,
            options: item.optionsEn || [],
            imageUrl: item.imageUrlEn || item.imageUrl
          },
          hi: {
            questionText: item.textHi,
            options: item.optionsHi || [],
            imageUrl: item.imageUrlHi || item.imageUrl
          }
        },
        explanation: {
          en: item.explanationEn || "Detailed explanation under review.",
          hi: item.explanationHi || "विस्तृत विवरण समीक्षा के अधीन है।"
        }
      };
    });
  }

  if (!hasCustomQuestions) {
    if (id.includes('ssc')) {
      title = id.includes('cgl') 
        ? "SSC CGL 2026 Tier-I CBT Simulator" 
        : id.includes('chsl') 
        ? "SSC CHSL 2026 Preliminary Exam" 
        : "SSC MTS Full-Length Practice Test";
      duration = 3600;
      sections = [
        { id: "sec_quant", name: "Quantitative Aptitude", orderIndex: 0, positiveMark: 2, negativeMark: 0.5,
          durationSeconds: hasSectionalTiming && sectionalTimingsMins[0] ? sectionalTimingsMins[0] * 60 : undefined },
        { id: "sec_reasoning", name: "General Intelligence & Reasoning", orderIndex: 1, positiveMark: 2, negativeMark: 0.5,
          durationSeconds: hasSectionalTiming && sectionalTimingsMins[1] ? sectionalTimingsMins[1] * 60 : undefined },
        { id: "sec_english", name: "English Comprehension", orderIndex: 2, positiveMark: 2, negativeMark: 0.5,
          durationSeconds: hasSectionalTiming && sectionalTimingsMins[2] ? sectionalTimingsMins[2] * 60 : undefined },
      ];
      questions = [
        {
          id: "q_q1", sectionId: "sec_quant", questionType: "mcq", orderIndex: 0, correctOptionIndex: 1,
          content: {
            en: { questionText: "If x + 1/x = 5, then find the value of x² + 1/x².", options: ["23", "25", "27", "21"], mathLatex: "x + \\frac{1}{x} = 5" },
            hi: { questionText: "यदि x + 1/x = 5 है, तो x² + 1/x² का मान ज्ञात कीजिए।", options: ["23", "25", "27", "21"], mathLatex: "x + \\frac{1}{x} = 5" }
          }
        },
        {
          id: "q_q2", sectionId: "sec_quant", questionType: "mcq", orderIndex: 1, correctOptionIndex: 0,
          content: {
            en: { questionText: "The ratio of present ages of A and B is 4:5. After 5 years, the ratio becomes 5:6. What is A's present age?", options: ["20 years", "25 years", "30 years", "15 years"] },
            hi: { questionText: "A और B की वर्तमान आयु का अनुपात 4:5 है। 5 वर्ष बाद यह अनुपात 5:6 हो जाता है। A की वर्तमान आयु क्या है?", options: ["20 वर्ष", "25 वर्ष", "30 वर्ष", "15 वर्ष"] }
          }
        },
        {
          id: "q_r1", sectionId: "sec_reasoning", questionType: "mcq", orderIndex: 0, correctOptionIndex: 3,
          content: {
            en: { questionText: "Identify the pattern and choose the next term in the series: 3, 7, 15, 31, 63, ?", options: ["125", "126", "128", "127"] },
            hi: { questionText: "पैटर्न को पहचानें और श्रृंखला में अगला पद चुनें: 3, 7, 15, 31, 63, ?", options: ["125", "126", "128", "127"] }
          }
        },
        {
          id: "q_e1", sectionId: "sec_english", questionType: "mcq", orderIndex: 0, correctOptionIndex: 0,
          content: {
            en: { questionText: "Select the antonym for the word: OBSTINATE", options: ["Flexible", "Stubborn", "Rigid", "Dogmatic"] },
            hi: { questionText: "दिए गए शब्द का विलोम शब्द चुनें: OBSTINATE (हठी)", options: ["Flexible (लचीला)", "Stubborn (अड़ियल)", "Rigid (कठोर)", "Dogmatic (कट्टर)"] }
          }
        }
      ];
    } else if (id.includes('rrb') || id.includes('railway')) {
      title = "RRB NTPC CBT-1 Mock Assessment Paper";
      duration = 5400; // 90 minutes
      sections = [
        { id: "sec_math", name: "Mathematics", orderIndex: 0, positiveMark: 1, negativeMark: 0.33,
          durationSeconds: hasSectionalTiming && sectionalTimingsMins[0] ? sectionalTimingsMins[0] * 60 : undefined },
        { id: "sec_reasoning", name: "General Intelligence & Reasoning", orderIndex: 1, positiveMark: 1, negativeMark: 0.33,
          durationSeconds: hasSectionalTiming && sectionalTimingsMins[1] ? sectionalTimingsMins[1] * 60 : undefined },
        { id: "sec_general", name: "General Awareness", orderIndex: 2, positiveMark: 1, negativeMark: 0.33,
          durationSeconds: hasSectionalTiming && sectionalTimingsMins[2] ? sectionalTimingsMins[2] * 60 : undefined },
      ];
      questions = [
        {
          id: "q_m1", sectionId: "sec_math", questionType: "mcq", orderIndex: 0, correctOptionIndex: 1,
          content: {
            en: { questionText: "Find the value of (0.43 * 0.43 - 0.17 * 0.17) / (0.43 - 0.17).", options: ["0.26", "0.60", "0.50", "0.43"] },
            hi: { questionText: "मान ज्ञात करें: (0.43 * 0.43 - 0.17 * 0.17) / (0.43 - 0.17)", options: ["0.26", "0.60", "0.50", "0.43"] }
          }
        },
        {
          id: "q_g1", sectionId: "sec_general", questionType: "mcq", orderIndex: 0, correctOptionIndex: 2,
          content: {
            en: { questionText: "Which is the largest fresh water lake in India?", options: ["Chilika Lake", "Dal Lake", "Wular Lake", "Vembanad Lake"] },
            hi: { questionText: "भारत में मीठे पानी की सबसे बड़ी झील कौन सी है?", options: ["चिल्का झील", "डल झील", "वुलर झील", "वेम्बनाड झील"] }
          }
        }
      ];
    } else {
      title = "Mock Test Assessment Series - General Mock Test";
      duration = 3600;
      sections = [
        { id: "sec_paper1", name: "Aptitude & General Studies", orderIndex: 0, positiveMark: 2, negativeMark: 0.5,
          durationSeconds: hasSectionalTiming && sectionalTimingsMins[0] ? sectionalTimingsMins[0] * 60 : undefined },
      ];
      questions = [
        {
          id: "q_gen1", sectionId: "sec_paper1", questionType: "mcq", orderIndex: 0, correctOptionIndex: 1,
          content: {
            en: { questionText: "What is the unit of electric current?", options: ["Volt", "Ampere", "Ohm", "Watt"] },
            hi: { questionText: "विद्युत धारा की इकाई क्या है?", options: ["वोल्ट", "एम्पीयर", "ओम", "वाट"] }
          }
        },
        {
          id: "q_gen2", sectionId: "sec_paper1", questionType: "mcq", orderIndex: 1, correctOptionIndex: 1,
          content: {
            en: { questionText: "Which planet is known as the Red Planet?", options: ["Earth", "Mars", "Jupiter", "Saturn"] },
            hi: { questionText: "किस ग्रह को लाल ग्रह के नाम से जाना जाता है?", options: ["पृथ्वी", "मंगल", "बृहस्पति", "शनि"] }
          }
        }
      ];
    }
  }

  return {
    sessionId: `session_${id}_${Date.now().toString().substring(8)}`,
    testId: id,
    testTitle: title,
    totalDurationSeconds: duration,
    sections,
    questions,
    hasSectionalTiming,
  };
};
