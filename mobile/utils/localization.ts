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
