/**
 * seed_empty_categories.js - Seeds passages for the 7 categories with 0 tests.
 */

const path = require('path');
const fs   = require('fs');

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    const fp = path.join(__dirname, f);
    if (!fs.existsSync(fp)) continue;
    for (const line of fs.readFileSync(fp, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const idx = t.indexOf('=');
      if (idx < 1) continue;
      const key = t.slice(0, idx).trim();
      let val = t.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  }
}
loadEnv();

const { PrismaClient } = require('./node_modules/@prisma/client');
const { PrismaPg }    = require('./node_modules/@prisma/adapter-pg');
const { Pool }        = require('./node_modules/pg');

const connStr = (process.env.TYPING_DIRECT_URL || process.env.TYPING_DATABASE_URL || process.env.DATABASE_URL || '').trim();
const pool    = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false }, max: 5 });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter });

// English passage bank
const EN = [
  `The Supreme Court of India serves as the apex judicial body and the final court of appeal for civil, criminal, and constitutional matters. It exercises original jurisdiction in disputes between states and the Union, and possesses the authority to issue writs for enforcement of fundamental rights. The Court's landmark judgments have shaped the democratic framework of the nation by upholding constitutional values. Legal officers and court assistants must possess strong documentation skills and be able to type accurately at high speed to prepare orders, judgments, and cause lists efficiently.`,
  `Railway recruitment examinations are conducted by the Railway Recruitment Boards across India to fill various non-technical, technical, and ministerial cadre positions. The typing test is an integral component of the selection process for roles such as Junior Clerk cum Typist and Senior Commercial cum Ticket Clerk. Candidates must demonstrate proficiency in both English and Hindi typing under time-bound examination conditions. Consistent practice using official examination passages improves accuracy and builds muscle memory required to achieve qualifying speeds.`,
  `The Border Security Force is one of India's premier paramilitary organisations responsible for guarding the nation's international boundaries with Pakistan and Bangladesh. The force recruits Head Constable Ministers who perform administrative and clerical duties at unit headquarters. These personnel handle correspondence, maintain service records, prepare pay bills, and ensure documentation accuracy. A typing test is conducted to evaluate their keyboard proficiency and speed, requiring candidates to achieve a qualifying net speed of at least thirty-five words per minute.`,
  `Uttarakhand High Court is one of the newest High Courts established in India following the bifurcation of Uttar Pradesh in the year two thousand. The court exercises civil and criminal jurisdiction over the state of Uttarakhand and issues writs under Article two hundred and twenty-six of the Constitution. Recruitment of stenographers, clerks, and typists is conducted through competitive examinations. The typing component tests candidates on official legal passages to ensure accurate transcription of court proceedings and maintenance of official records.`,
  `Jharkhand High Court was established in the year two thousand with its principal seat at Ranchi. The court has jurisdiction over all civil and criminal matters arising within the state of Jharkhand and hears writ petitions under constitutional provisions. Recruitment of court staff including junior typists and personal assistants involves a written examination followed by a skill test. Candidates must demonstrate accurate typing of legal passages at the prescribed qualifying speed to be considered eligible for appointment.`,
  `Delhi Police recruits Assistant Wireless Operators and Teleprinter Operators through competitive examinations that include a keyboard skill test. Candidates must achieve a minimum of one thousand key depressions in a fifteen-minute session, which translates to four thousand key depressions per hour. Accurate keyboard operation is essential for transmitting official police communications, filing First Information Reports, and maintaining dispatch records. Regular typing practice on standard passages builds the speed and accuracy needed to qualify for this important public safety role.`,
  `Rajasthan Rajya Vidyut Utpadan Nigam Limited recruits Junior Assistants through direct competitive recruitment. The examination includes a written objective test followed by a computer proficiency and typing skill test. Candidates for the English typing component must achieve a net speed of thirty words per minute, while Hindi typing candidates require twenty-five words per minute. Selection is based on merit in the written examination with the typing test serving as a qualifying round. Regular practice on official Rajasthan government passages is the most effective preparation strategy.`,
  `The Sashastra Seema Bal is an Indo-Tibetan Border Police force that guards India's northern and north-eastern borders. It recruits Head Constable Ministers who provide administrative support at headquarters and field formations. These personnel handle official correspondence, filing, documentation, and computer data entry. The typing skill test forms a critical part of the selection process, evaluating candidates on their keyboard speed and accuracy. Achieving a qualifying net speed requires consistent practice using authentic examination passages over several weeks of dedicated preparation.`,
  `Government recruitment examinations in India are conducted by various central and state agencies to fill positions in the administrative machinery. Clerical and data-entry cadre positions require candidates to demonstrate typing proficiency as part of their skill assessment. Accuracy in transcription of official documents, legal texts, and government correspondence is essential for efficient public administration. Modern government offices rely on computer systems for record management, financial accounting, and digital communication. Candidates must develop both speed and accuracy to succeed.`,
  `Public sector undertakings and autonomous bodies under the central government regularly recruit skilled administrative staff including typists, stenographers, and data entry operators. These employees manage administrative correspondence, prepare official reports, maintain digital databases, and support senior officers in their daily work. Typing tests are designed to replicate actual work conditions, testing candidates on authentic passages of the kind they will encounter in their job roles. Building consistent practice habits and mastering keyboard technique is the most reliable path to achieving qualifying performance in government typing examinations.`,
  `The efficient functioning of the judiciary depends upon accurate and timely transcription of proceedings, orders, and judgments. Court assistants and junior clerks play a vital role in maintaining the paperwork and digital records that form the backbone of the legal system. They must type quickly and without errors under the pressure of tight deadlines. The qualifying standard for court typing tests typically requires candidates to achieve between thirty and forty words per minute with an error rate within the permissible limits set by the recruiting body.`,
  `Wireless and teleprinter operations in police and security forces require personnel who are adept at keyboard operation and data communication. The ability to transmit and receive messages accurately and at high speed is critical for effective law enforcement communication. Recruits undergo comprehensive training in keyboard skills and secure digital communication protocols. The initial typing proficiency test filters candidates who have the fundamental skills needed to learn advanced communication techniques during their service training period.`,
];

// Hindi passage bank
const HI = [
  `भारत सरकार के अंतर्गत विभिन्न सरकारी विभागों में लिपिकीय पदों के लिए हिन्दी टाइपिंग की परीक्षा आयोजित की जाती है। उत्तर प्रदेश अधीनस्थ सेवा चयन आयोग ने कनिष्ठ सहायक एवं अन्य पदों पर भर्ती के लिए हिन्दी टाइपिंग को अनिवार्य किया है। अभ्यर्थियों को मंगल यूनिकोड फॉन्ट में हिन्दी टाइपिंग करनी होती है। इस परीक्षा में गद्यांश को निर्धारित समय में सटीकता एवं उचित गति से टाइप करना होता है। नियमित अभ्यास तथा कीबोर्ड की उचित जानकारी से ही सफलता प्राप्त होती है।`,
  `उत्तर प्रदेश में विभिन्न सरकारी कार्यालयों में कनिष्ठ सहायकों की नियुक्ति अधीनस्थ सेवा चयन आयोग के माध्यम से की जाती है। इस पद के लिए अभ्यर्थियों को लिखित परीक्षा के अतिरिक्त हिन्दी टाइपिंग परीक्षा में भी उत्तीर्ण होना आवश्यक है। अभ्यर्थी को पच्चीस शब्द प्रति मिनट की न्यूनतम गति प्राप्त करनी होती है। त्रुटियों की संख्या निर्धारित सीमा से अधिक होने पर अभ्यर्थी अनर्हित हो जाता है। अतः अभ्यास एवं सटीकता दोनों पर समान ध्यान देना आवश्यक है।`,
  `सरकारी कार्यालयों में हिन्दी टाइपिंग का महत्व निरंतर बढ़ता जा रहा है। राजभाषा अधिनियम के अनुसार केन्द्रीय सरकार के कार्यालयों में हिन्दी में पत्राचार एवं दस्तावेज़ीकरण को प्रोत्साहन दिया जाता है। कुशल हिन्दी टाइपिस्ट सरकारी प्रशासन को सुचारु रूप से चलाने में सहायक होते हैं। मंगल फॉन्ट एवं इनस्क्रिप्ट कीबोर्ड लेआउट का उचित ज्ञान टाइपिंग परीक्षाओं में उत्कृष्ट प्रदर्शन के लिए आवश्यक है। अभ्यर्थियों को परीक्षा से पूर्व पर्याप्त अभ्यास करना चाहिए।`,
  `भारतीय न्यायपालिका में हिन्दी में दस्तावेज़ीकरण की महत्वपूर्ण भूमिका है। उच्च न्यायालयों एवं जिला न्यायालयों में टाइपिस्टों एवं आशुलिपिकों की भर्ती के लिए हिन्दी टाइपिंग परीक्षा आयोजित की जाती है। अभ्यर्थियों से अपेक्षा की जाती है कि वे न्यायिक अभिलेखों, आदेशों एवं निर्णयों को निर्धारित समय-सीमा के भीतर सटीकता से टाइप कर सकें। प्रतिदिन अभ्यास से गति एवं शुद्धता में उत्तरोत्तर वृद्धि होती है।`,
  `कम्प्यूटर आधारित कार्यालय प्रणाली ने सरकारी सेवाओं की गुणवत्ता एवं दक्षता में अभूतपूर्व सुधार लाया है। ई-गवर्नेंस के अंतर्गत नागरिक विभिन्न सरकारी सेवाओं का लाभ ऑनलाइन माध्यम से प्राप्त कर सकते हैं। डेटा प्रविष्टि, आवेदन प्रसंस्करण एवं डिजिटल पत्राचार के लिए कुशल हिन्दी टाइपिस्टों की मांग निरंतर बढ़ रही है। सरकारी भर्ती परीक्षाओं में हिन्दी टाइपिंग कौशल का मूल्यांकन अनिवार्य हो गया है। नियमित प्रामाणिक गद्यांशों का अभ्यास परीक्षा में बेहतर प्रदर्शन सुनिश्चित करता है।`,
  `ग्रामीण विकास एवं पंचायती राज विभाग में ग्राम पंचायत स्तर पर कम्प्यूटर ऑपरेटरों एवं डेटा एन्ट्री ऑपरेटरों की आवश्यकता होती है। इन पदों पर नियुक्ति के लिए हिन्दी एवं अंग्रेज़ी दोनों में टाइपिंग का ज्ञान आवश्यक है। सरकारी योजनाओं की सूचनाएं, लाभार्थी डेटाबेस, एवं वित्तीय अभिलेख कम्प्यूटर पर तैयार किए जाते हैं। अतः टाइपिंग कौशल ग्रामीण प्रशासन के लिए भी अत्यन्त महत्वपूर्ण हो गया है। इस क्षेत्र में रोज़गार के अवसरों को भुनाने के लिए टाइपिंग की तैयारी आवश्यक है।`,
  `केन्द्रीय विद्यालय संगठन, नवोदय विद्यालय समिति एवं एकलव्य मॉडल आवासीय विद्यालयों में कनिष्ठ सचिवालय सहायकों की नियुक्ति के लिए टाइपिंग परीक्षा आयोजित की जाती है। अभ्यर्थियों को हिन्दी अथवा अंग्रेज़ी में निर्धारित गति एवं शुद्धता प्राप्त करनी होती है। विद्यालय प्रशासन में दैनिक पत्राचार, प्रवेश प्रक्रिया, परीक्षा परिणाम एवं वार्षिक प्रतिवेदन तैयार करने हेतु कुशल टाइपिस्टों की आवश्यकता होती है। नियमित टाइपिंग अभ्यास से न केवल गति में वृद्धि होती है, अपितु शुद्धता में भी सुधार आता है।`,
  `भारत में सार्वजनिक क्षेत्र के उपक्रम एवं स्वायत्त निकाय प्रशासनिक पदों पर भर्ती हेतु नियमित परीक्षाएं आयोजित करते हैं। इन परीक्षाओं में हिन्दी टाइपिंग कौशल का आकलन किया जाता है। अभ्यर्थियों को सरकारी दस्तावेज़, पत्र-व्यवहार एवं आधिकारिक रिपोर्ट हिन्दी में सटीकता से तैयार करने में सक्षम होना चाहिए। मंगल फॉन्ट में यूनिकोड आधारित टाइपिंग का प्रयोग अधिकांश परीक्षाओं में किया जाता है। अभ्यर्थियों को परीक्षा प्रारूप की पूर्ण जानकारी रखनी चाहिए।`,
];

// Category configuration
const EMPTY_CATEGORIES = [
  { id: 'upsssc-ja-hindi-typing',                          lang: 'hi', dur: 10, wpm: 25, err: 5,  prefix: 'UPSSSC-JA-HI', label: 'UPSSSC JA Hindi',      passages: HI },
  { id: 'supreme-court-junior-court-assistant-jca-typing', lang: 'en', dur: 10, wpm: 35, err: 3,  prefix: 'SC-JCA',        label: 'Supreme Court JCA',    passages: EN },
  { id: 'uttrakhand-high-court-typing',                    lang: 'en', dur: 10, wpm: 30, err: 5,  prefix: 'UHC',           label: 'Uttarakhand HC',       passages: EN },
  { id: 'jharkhand-high-court-typing',                     lang: 'en', dur: 10, wpm: 30, err: 5,  prefix: 'JHC',           label: 'Jharkhand HC',         passages: EN },
  { id: 'delhi-police-awo-tpo-typing',                     lang: 'en', dur: 15, wpm: 30, err: 15, prefix: 'DP-AWO',        label: 'Delhi Police AWO/TPO', passages: EN },
  { id: 'rajasthan-rvunl-junior-assistant-typing',         lang: 'en', dur: 10, wpm: 30, err: 5,  prefix: 'RVUNL-JA',     label: 'RVUNL JA',            passages: EN },
  { id: 'ssb-hcm-typing',                                  lang: 'en', dur: 10, wpm: 35, err: 5,  prefix: 'SSB-HCM',      label: 'SSB HCM',             passages: EN },
];

async function main() {
  for (const cat of EMPTY_CATEGORIES) {
    const existing = await prisma.typingTest.count({ where: { categoryId: cat.id } });
    if (existing > 0) {
      console.log(`SKIP  ${cat.label}: already has ${existing} tests`);
      continue;
    }
    console.log(`\nSEEDING  ${cat.label} (${cat.id})...`);
    let seeded = 0;
    for (let p = 0; p < cat.passages.length; p++) {
      for (let v = 1; v <= 5; v++) {
        const idx    = seeded + 1;
        const testId = `tm-${cat.id}-${idx}`;
        const title  = `${cat.label} Passage ${idx}`;
        await prisma.typingTest.upsert({
          where: { id: testId },
          update: {},
          create: {
            id: testId,
            title,
            categoryId: cat.id,
            passageText: cat.passages[p],
            language: cat.lang,
            mainDurationMinutes: cat.dur,
            demoDurationMinutes: 3,
            breakDurationMinutes: 3,
            qualifyingWpm: cat.wpm,
            maxErrorPercentage: cat.err,
            backspaceRule: 'ALLOWED',
            allowRetype: true,
            highlightAllowed: true,
            isActive: true,
            orderIndex: idx
          }
        });
        seeded++;
      }
    }
    console.log(`  OK  Inserted ${seeded} tests for ${cat.label}`);
  }
  console.log('\nDone!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
