const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '.env');
const envVars = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const idx = line.indexOf('=');
    if (idx > 0) envVars[line.slice(0, idx).trim()] = line.slice(idx + 1).replace(/"/g, '').trim();
  });
}

const { Pool } = require('pg');
const targetConnStr = envVars.TYPING_DIRECT_URL || envVars.TYPING_DATABASE_URL || envVars.DIRECT_URL || envVars.DATABASE_URL;

const pool = new Pool({
  connectionString: targetConnStr,
  ssl: { rejectUnauthorized: false },
  max: 5
});

const scrapedData = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_typing_categories_scraped.json'), 'utf8'));

const ENGLISH_PASSAGES = {
  easy: [
    `Digital literacy has emerged as an essential skill for all citizens in the contemporary era. Modern governance relies extensively on electronic systems for public service delivery and citizen engagement. When government offices adopt computer automation, administrative workflows become faster, more transparent, and remarkably efficient. Citizens can now submit applications, download verified certificates, and track government welfare schemes directly from home. This revolutionary transformation saves valuable working hours and eliminates cumbersome paperwork. Continuous skill development ensures that employees can comfortably handle computerized documentation, database entry, and official communication with high speed and accuracy.`,
    `A balanced diet and regular physical exercise are foundational pillars of a healthy lifestyle. Engaging in daily physical activity strengthens cardiovascular function, enhances mental focus, and boosts overall productivity. Nutrition experts consistently recommend incorporating fresh fruits, green vegetables, whole grains, and adequate protein into daily meals. Proper hydration and adequate sleep also play a pivotal role in maintaining high energy levels throughout the workday. Developing disciplined lifestyle habits from an early age prevents chronic health conditions and improves quality of life.`,
    `Public library networks and community learning resource centers provide free access to valuable information and educational materials. In the modern knowledge economy, books, online repositories, and digital archives empower curious learners to explore scientific innovations and historical developments. Libraries also serve as quiet spaces where students and competitive exam aspirants can study effectively without distractions. Investing in community educational infrastructure strengthens democratic values and fosters lifelong intellectual growth.`,
    `Clean water and effective sanitation infrastructure are vital for safeguarding public health in rural and urban communities. Municipal authorities must implement rigorous quality testing protocols to ensure drinking water meets safety standards. Adequate wastewater treatment prevents environmental contamination and preserves fragile aquatic ecosystems. Community awareness programs regarding personal hygiene and water conservation significantly reduce the incidence of waterborne diseases.`,
    `Renewable energy solutions such as solar panels and wind turbines are rapidly reshaping global energy production. By harnessing natural power sources, countries can reduce reliance on imported fossil fuels and decrease harmful greenhouse gas emissions. Advancements in energy storage batteries ensure uninterrupted electricity supply even during periods of low sunlight or wind. Sustainable energy development creates employment opportunities in engineering, manufacturing, and green infrastructure maintenance.`
  ],
  medium: [
    `The Constitution of India establishes a democratic republic grounded in the fundamental tenets of justice, liberty, equality, and fraternity. The independent judiciary functions as the custodian of the Constitution, ensuring that executive actions and legislative enactments remain consistent with constitutional mandates. Through judicial review and writ jurisdiction, superior courts protect the fundamental rights of citizens against arbitrary state action. A robust and accessible legal system is indispensable for upholding public confidence and guaranteeing equal protection of the laws to all individuals regardless of their social or economic background. Proper legal documentation, precise transcription of court proceedings, and systematic record maintenance are essential components of judicial administration.`,
    `Indian Railways constitutes the lifeline of the country's transport network, facilitating the daily transit of millions of passengers and crucial freight cargo. Recent modernization initiatives focus on high-speed train sets, automated signaling networks, track electrification, and redevelopment of major railway stations with world-class passenger amenities. Dedicated freight corridors have substantially reduced transportation turnaround times for essential commodities, bolstering manufacturing competitiveness. Technological upgrades such as automatic train protection systems demonstrate a sustained commitment to passenger safety, operational efficiency, and sustainable economic growth.`,
    `Sustainable urban development demands a comprehensive integration of smart transportation, energy-efficient architecture, and eco-friendly municipal solid waste management. Rapid metropolitan expansion presents intricate challenges, including traffic congestion, air pollution, and heightened strain on municipal water resources. Implementing automated traffic regulation, dedicated rapid transit corridors, and decentralized renewable energy microgrids can significantly mitigate environmental degradation while elevating the standard of living for urban residents. Furthermore, transparent administrative frameworks facilitate active civic participation in municipal governance.`,
    `The banking and financial services sector has experienced a profound digital transformation through the introduction of real-time payment networks, biometric identity verification, and automated risk assessment algorithms. Instantaneous electronic fund transfers have democratized financial access for remote rural populations and small enterprise owners who previously lacked formal banking credentials. Regulatory authorities continuously implement stringent cybersecurity protocols to protect consumer data against fraudulent activities and unauthorized financial transactions. Collaborative partnerships between traditional banking institutions and financial technology firms continue to foster economic resilience across emerging global markets.`,
    `Scientific research and technological innovation are fundamental drivers of socio-economic progress and industrial competitiveness. National laboratories and academic research institutions collaborate closely with manufacturing industries to develop indigenous materials, advanced robotics, and clean energy storage solutions. Government initiatives supporting research and development incubators enable young scientists and engineers to convert breakthrough laboratory concepts into viable commercial products. Fostering a vibrant culture of scientific inquiry and intellectual property protection accelerates national technological self-reliance.`
  ],
  hard: [
    `Administrative jurisprudence encompasses the procedural doctrines, substantive statutory standards, and constitutional limitations governing the exercise of regulatory powers by executive tribunals and statutory agencies. In contemporary administrative practice, quasi-judicial authorities are bound by the principles of natural justice, requiring unbiased decision-making and reasonable opportunity for hearing. When administrative discretion is exercised arbitrarily or in contravention of established procedural guidelines, judicial review under Article 226 or Article 32 of the Constitution provides indispensable redress. Maintaining meticulous stenographic transcripts, detailed minute-keeping, and standardized archival protocols prevents misinterpretation of administrative directives and guarantees evidentiary authenticity during appellate proceedings.`,
    `Macroeconomic equilibrium requires a delicate synchronization of monetary interventions, fiscal consolidation, and international trade policies amidst volatile global commodity cycles. Central banking institutions adjust statutory reserve ratios and benchmark lending rates to calibrate domestic inflation expectations without stifling productive capital investments. Simultaneously, treasury departments must allocate capital expenditures toward productive public infrastructure while maintaining fiscal deficit parameters within statutory fiscal responsibility targets. Structural economic reforms aimed at enhancing supply chain efficiencies and regulatory compliance ease bolster long-term sovereign creditworthiness.`,
    `Environmental impact assessment regulations require industrial manufacturing enterprises to conduct rigorous baseline ecological evaluations prior to project commissioning. Quantitative methodologies measure airborne particulate emissions, ambient acoustic thresholds, and groundwater contamination risks against statutory environmental quality standards. Corporate compliance frameworks necessitate the installation of continuous emission monitoring systems and effluent treatment facilities to minimize ecological footprints. Regulatory non-compliance can result in stringent penalties, immediate suspension of environmental clearances, and substantial civil liability under the polluter pays doctrine.`,
    `Cybersecurity architectures in mission-critical infrastructure depend upon multi-layered defense-in-depth methodologies, zero-trust network authentication, and quantum-resistant cryptographic algorithms. Sovereign governmental entities face sophisticated state-sponsored cyber intrusions targeting telecommunications matrices, power grid distribution networks, and financial transaction clearinghouses. Establishing continuous vulnerability scanning protocols, automated intrusion detection heuristics, and comprehensive incident recovery playbooks mitigates operational disruption during zero-day exploit events. International legal harmonisation is imperative for effective extradition and judicial prosecution of transnational cybercrime syndicates.`
  ]
};

const HINDI_PASSAGES = {
  easy: [
    `डिजिटल साक्षरता आज के युग में प्रत्येक नागरिक के लिए अत्यंत आवश्यक कौशल बन चुकी है। सरकारी कार्यालयों में कम्प्यूटर के उपयोग से कार्यप्रणाली तीव्र, पारदर्शी और अत्यधिक सुगम हो गई है। नागरिक अब घर बैठे विभिन्न प्रमाण-पत्र, सरकारी योजनाएं और आवश्यक जानकारी प्राप्त कर सकते हैं। कम्प्यूटर पर सही गति और शुद्धता से टाइपिंग करने का अभ्यास विद्यार्थियों और कर्मचारियों को कार्यस्थल पर अधिक कुशल बनाता है। नियमित अभ्यास से उंगलियों का तालमेल सुधरता है और कार्य की उत्पादकता में निरंतर वृद्धि होती है।`,
    `स्वस्थ शरीर और संतुलित आहार मनुष्य के जीवन की सबसे बड़ी पूंजी हैं। प्रतिदिन नियमित रूप से व्यायाम और योग करने से शारीरिक ऊर्जा तथा मानसिक एकाग्रता बढ़ती है। हरी सब्जियां, ताजे फल और पर्याप्त मात्रा में जल का सेवन शरीर को निरोगी बनाए रखता है। समय पर सोना और तनावमुक्त रहना दीर्घायु और प्रसन्नता का मूल मंत्र है। युवा पीढ़ी को जंक फूड से बचकर पौष्टिक आहार अपनाने का संकल्प लेना चाहिए।`,
    `पुस्तकालय ज्ञान और विद्या के पावन मंदिर होते हैं जहां विभिन्न विषयों की अमूल्य पुस्तकें उपलब्ध रहती हैं। प्रतियोगी परीक्षाओं की तैयारी करने वाले विद्यार्थियों के लिए पुस्तकालय का शांत वातावरण अत्यंत लाभदायक सिद्ध होता है। अध्ययन की नियमित आदत से मनुष्य की विचारशीलता और भाषा पर पकड़ सुदृढ़ होती है। ज्ञान का निरंतर संचय ही जीवन में सफलता का मार्ग प्रशस्त करता है।`
  ],
  medium: [
    `भारतीय संविधान विश्व का सबसे विस्तृत और संप्रभु लोकतांत्रिक दस्तावेज है जो न्याय, स्वतंत्रता, समानता और बंधुत्व के शाश्वत मूल्यों पर आधारित है। स्वतंत्र न्यायपालिका नागरिकों के मौलिक अधिकारों की रक्षा के लिए सदैव सजग प्रहरी की भूमिका निभाती है। प्रशासनिक व्यवस्था में पारदर्शिता और जनहितकारी नीतियों का समयबद्ध क्रियान्वयन सुशासन की प्रथम शर्त है। जब प्रशासनिक अधिकारी और कर्मचारी निष्पक्षता एवं कर्तव्यनिष्ठा से जनसेवा करते हैं, तब राष्ट्र का समग्र विकास सुनिश्चित होता है।`,
    `भारतीय रेल देश की जीवन रेखा है जो प्रतिदिन करोड़ों यात्रियों और आवश्यक माल ढुलाई को सुगम बनाती है। रेलवे के आधुनिकीकरण के अंतर्गत तीव्र गति वाली रेलगाड़ियों, स्वचालित सिग्नल प्रणाली और आधुनिक रेलवे स्टेशनों का विकास तेजी से किया जा रहा है। संरक्षा और समयबद्धता को सर्वोच्च प्राथमिकता देते हुए डिजिटल तकनीकों का व्यापक समावेश किया गया है जिससे यात्रियों को विश्वस्तरीय यात्रा अनुभव प्राप्त हो रहा है।`,
    `पर्यावरण संरक्षण आज संपूर्ण मानव जाति के समक्ष सबसे महत्वपूर्ण चुनौती है। औद्योगिकीकरण और वृक्षों की अंधाधुंध कटाई से वैश्विक तापमान में निरंतर वृद्धि हो रही है। सौर ऊर्जा, पवन ऊर्जा और हरित प्रौद्योगिकियों का अधिकाधिक उपयोग करके हम प्रकृति का संतुलन बनाए रख सकते हैं। प्रत्येक नागरिक को वृक्षारोपण और जल संरक्षण को अपनी दैनिक दिनचर्या का अनिवार्य अंग बनाना चाहिए।`
  ],
  hard: [
    `प्रशासनिक न्यायशास्त्र और विधिक प्रक्रियाओं का सम्यक अनुपालन सुव्यवस्थित शासन तंत्र का मूलाधार है। किसी भी न्यायिक अथवा अर्द्ध-न्यायिक अधिकरण द्वारा दिए गए निर्णय प्राकृतिक न्याय के सिद्धांतों के अनुकूल होने चाहिए। अभिलेखों का सटीक रख-रखाव, आधिकारिक पत्राचार का शुद्ध प्रारूपण तथा विधायी उपबंधों की स्पष्ट व्याख्या प्रशासनिक दक्षता को प्रतिबिंबित करती है। विधि के शासन को अक्षुण्ण रखने हेतु प्रत्येक स्तर पर दायित्व बोध और सत्यनिष्ठा अपरिहार्य है।`,
    `आर्थिक उदारीकरण और वैश्विक व्यापार के वर्तमान युग में वित्तीय अनुशासन तथा राजकोषीय प्रबंधन का महत्व अत्यधिक बढ़ गया है। मुद्रास्फीति पर नियंत्रण रखते हुए औद्योगिक उत्पादन और अवसंरचना विकास को गति देना किसी भी अर्थव्यवस्था के लिए संवेदनशील कार्य है। बैंकिंग प्रणाली में नवाचार, डिजिटल भुगतान सुरक्षा तथा सूक्ष्म एवं मध्यम उद्योगों को सुलभ ऋण उपलब्ध कराना आत्मनिर्भरता की दिशा में युगांतरकारी कदम है।`
  ]
};

async function run() {
  console.log('Connecting to database...');
  const client = await pool.connect();

  try {
    const allCategories = [];
    const allTests = [];

    for (let i = 0; i < scrapedData.length; i++) {
      const item = scrapedData[i];
      const categoryId = item.slug || `cat-${item.dataName.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}`;
      
      const fullDescription = (item.description || '').trim();
      const typingRules = (item.rules || '').trim();
      const officialPdf = (item.pdfUrl || '').trim();

      const metaBlock = {
        description: fullDescription || `${item.name} official typing test preparation.`,
        rules: typingRules || `Required standard speed & accuracy guidelines for ${item.name}.`,
        pdfUrl: officialPdf || ''
      };

      const safeFilename = `${item.slug}.webp`;
      const localLogoPath = path.join(__dirname, 'public', 'typing-logos', safeFilename);
      const logoUrl = fs.existsSync(localLogoPath) ? `/typing-logos/${safeFilename}` : item.logoUrl;

      allCategories.push({
        id: categoryId,
        name: item.name,
        nameHi: item.name,
        description: JSON.stringify(metaBlock),
        icon: 'Keyboard',
        logoUrl: logoUrl,
        orderIndex: i + 1,
        isActive: true
      });

      let durationMinutes = 10;
      let qualifyingWpm = 35;
      let maxErrorPercentage = 5;
      let backspaceAllowed = true;
      let retypeAllowed = false;

      const lowerName = item.name.toLowerCase();
      if (lowerName.includes('cgl')) {
        durationMinutes = 15;
        qualifyingWpm = 27;
        maxErrorPercentage = 7;
      } else if (lowerName.includes('chsl')) {
        durationMinutes = 10;
        qualifyingWpm = 35;
        maxErrorPercentage = 7;
      } else if (lowerName.includes('ntpc')) {
        durationMinutes = 10;
        qualifyingWpm = 30;
        maxErrorPercentage = 5;
        retypeAllowed = true;
      } else if (lowerName.includes('high court') || lowerName.includes('court') || lowerName.includes('jca')) {
        durationMinutes = 10;
        qualifyingWpm = 35;
        maxErrorPercentage = 3;
      } else if (lowerName.includes('upsssc') || lowerName.includes('rvunl')) {
        durationMinutes = 5;
        qualifyingWpm = 30;
        maxErrorPercentage = 5;
      } else if (lowerName.includes('computer operator') || lowerName.includes('aiims')) {
        durationMinutes = 15;
        qualifyingWpm = 30;
        maxErrorPercentage = 15;
      } else if (lowerName.includes('steno')) {
        durationMinutes = 10;
        qualifyingWpm = 40;
        maxErrorPercentage = 5;
      } else if (lowerName.includes('quick brown fox')) {
        durationMinutes = 2;
        qualifyingWpm = 40;
        maxErrorPercentage = 0;
      }

      // English Easy (5)
      ENGLISH_PASSAGES.easy.forEach((txt, idx) => {
        allTests.push({
          id: `${categoryId}-en-easy-${idx + 1}`,
          title: `${item.name} Passage (Easy) ${idx + 1}`,
          titleHi: `${item.name} गद्यांश (आसान) ${idx + 1}`,
          categoryId,
          passageText: txt,
          language: 'en',
          difficulty: 'Easy',
          mainDurationMinutes: durationMinutes,
          qualifyingWpm: qualifyingWpm,
          maxErrorPercentage: maxErrorPercentage,
          enableBackspace: backspaceAllowed,
          allowRetype: retypeAllowed,
          instructions: typingRules || `Required speed: ${qualifyingWpm} WPM.`,
          orderIndex: idx + 1
        });
      });

      // English Medium (5)
      ENGLISH_PASSAGES.medium.forEach((txt, idx) => {
        allTests.push({
          id: `${categoryId}-en-med-${idx + 1}`,
          title: `${item.name} Passage (Medium) ${idx + 1}`,
          titleHi: `${item.name} गद्यांश (मध्यम) ${idx + 1}`,
          categoryId,
          passageText: txt,
          language: 'en',
          difficulty: 'Medium',
          mainDurationMinutes: durationMinutes,
          qualifyingWpm: qualifyingWpm,
          maxErrorPercentage: maxErrorPercentage,
          enableBackspace: backspaceAllowed,
          allowRetype: retypeAllowed,
          instructions: typingRules || `Required speed: ${qualifyingWpm} WPM.`,
          orderIndex: 20 + idx + 1
        });
      });

      // English Hard (4)
      ENGLISH_PASSAGES.hard.forEach((txt, idx) => {
        allTests.push({
          id: `${categoryId}-en-hard-${idx + 1}`,
          title: `${item.name} Passage (Hard) ${idx + 1}`,
          titleHi: `${item.name} गद्यांश (कठिन) ${idx + 1}`,
          categoryId,
          passageText: txt,
          language: 'en',
          difficulty: 'Hard',
          mainDurationMinutes: durationMinutes,
          qualifyingWpm: qualifyingWpm,
          maxErrorPercentage: maxErrorPercentage,
          enableBackspace: backspaceAllowed,
          allowRetype: retypeAllowed,
          instructions: typingRules || `Required speed: ${qualifyingWpm} WPM.`,
          orderIndex: 40 + idx + 1
        });
      });

      // Hindi Easy (3)
      HINDI_PASSAGES.easy.forEach((txt, idx) => {
        allTests.push({
          id: `${categoryId}-hi-easy-${idx + 1}`,
          title: `${item.name} हिंदी गद्यांश (सरल) ${idx + 1}`,
          titleHi: `${item.name} हिंदी गद्यांश (सरल) ${idx + 1}`,
          categoryId,
          passageText: txt,
          language: 'hi',
          difficulty: 'Easy',
          mainDurationMinutes: durationMinutes,
          qualifyingWpm: Math.max(20, qualifyingWpm - 5),
          maxErrorPercentage: maxErrorPercentage,
          enableBackspace: backspaceAllowed,
          allowRetype: retypeAllowed,
          instructions: typingRules || `Required speed: ${Math.max(20, qualifyingWpm - 5)} WPM.`,
          orderIndex: 60 + idx + 1
        });
      });

      // Hindi Medium (3)
      HINDI_PASSAGES.medium.forEach((txt, idx) => {
        allTests.push({
          id: `${categoryId}-hi-med-${idx + 1}`,
          title: `${item.name} हिंदी गद्यांश (मध्यम) ${idx + 1}`,
          titleHi: `${item.name} हिंदी गद्यांश (मध्यम) ${idx + 1}`,
          categoryId,
          passageText: txt,
          language: 'hi',
          difficulty: 'Medium',
          mainDurationMinutes: durationMinutes,
          qualifyingWpm: Math.max(20, qualifyingWpm - 5),
          maxErrorPercentage: maxErrorPercentage,
          enableBackspace: backspaceAllowed,
          allowRetype: retypeAllowed,
          instructions: typingRules || `Required speed: ${Math.max(20, qualifyingWpm - 5)} WPM.`,
          orderIndex: 80 + idx + 1
        });
      });

      // Hindi Hard (2)
      HINDI_PASSAGES.hard.forEach((txt, idx) => {
        allTests.push({
          id: `${categoryId}-hi-hard-${idx + 1}`,
          title: `${item.name} हिंदी गद्यांश (कठिन) ${idx + 1}`,
          titleHi: `${item.name} हिंदी गद्यांश (कठिन) ${idx + 1}`,
          categoryId,
          passageText: txt,
          language: 'hi',
          difficulty: 'Hard',
          mainDurationMinutes: durationMinutes,
          qualifyingWpm: Math.max(20, qualifyingWpm - 5),
          maxErrorPercentage: maxErrorPercentage,
          enableBackspace: backspaceAllowed,
          allowRetype: retypeAllowed,
          instructions: typingRules || `Required speed: ${Math.max(20, qualifyingWpm - 5)} WPM.`,
          orderIndex: 100 + idx + 1
        });
      });
    }

    // 1. Single Multi-row INSERT for all 39 Categories
    console.log('1. Inserting Categories...');
    const catValues = [];
    const catParams = [];
    let p = 1;
    for (const c of allCategories) {
      catValues.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, NOW(), NOW())`);
      catParams.push(c.id, c.name, c.nameHi, c.description, c.icon, c.logoUrl, c.orderIndex, c.isActive);
    }
    const catQuery = `
      INSERT INTO typing_categories (id, name, "nameHi", description, icon, "logoUrl", "orderIndex", "isActive", "createdAt", "updatedAt")
      VALUES ${catValues.join(', ')}
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        "nameHi" = EXCLUDED."nameHi",
        description = EXCLUDED.description,
        icon = EXCLUDED.icon,
        "logoUrl" = EXCLUDED."logoUrl",
        "orderIndex" = EXCLUDED."orderIndex",
        "isActive" = EXCLUDED."isActive",
        "updatedAt" = NOW();
    `;
    await client.query(catQuery, catParams);
    console.log(`   ✅ Inserted all ${allCategories.length} categories!`);

    // 2. Multi-row INSERT for Tests in batches of 40 tests per query (40 * 21 params = 840 params < 65535 limit)
    console.log('2. Inserting Tests in fast multi-row batches...');
    const batchSize = 40;
    for (let i = 0; i < allTests.length; i += batchSize) {
      const batch = allTests.slice(i, i + batchSize);
      const testValues = [];
      const testParams = [];
      let tp = 1;
      for (const t of batch) {
        testValues.push(`($${tp++}, $${tp++}, $${tp++}, $${tp++}, $${tp++}, $${tp++}, $${tp++}, $${tp++}, $${tp++}, $${tp++}, $${tp++}, $${tp++}, $${tp++}, $${tp++}, $${tp++}, $${tp++}, $${tp++}, $${tp++}, $${tp++}, $${tp++}, $${tp++}, NOW(), NOW())`);
        testParams.push(
          t.id, t.title, t.titleHi, t.categoryId, t.id, t.passageText,
          'This is a demo typing test passage designed to check your keyboard responsiveness and warm up your fingers before starting the main examination.',
          1, 1, t.mainDurationMinutes, t.qualifyingWpm, t.maxErrorPercentage,
          'ALLOWED', t.enableBackspace, t.allowRetype, false, t.language, t.difficulty,
          t.instructions, t.orderIndex, true
        );
      }
      const testQuery = `
        INSERT INTO typing_tests (
          id, title, "titleHi", "categoryId", "passageId", "passageText",
          "demoPassageText", "demoDurationMinutes", "breakDurationMinutes", "mainDurationMinutes",
          "qualifyingWpm", "maxErrorPercentage", "backspaceRule", "enableBackspace", "allowRetype",
          "highlightAllowed", language, difficulty, instructions, "orderIndex", "isActive", "createdAt", "updatedAt"
        ) VALUES ${testValues.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          "titleHi" = EXCLUDED."titleHi",
          "passageText" = EXCLUDED."passageText",
          "mainDurationMinutes" = EXCLUDED."mainDurationMinutes",
          "qualifyingWpm" = EXCLUDED."qualifyingWpm",
          "maxErrorPercentage" = EXCLUDED."maxErrorPercentage",
          language = EXCLUDED.language,
          difficulty = EXCLUDED.difficulty,
          instructions = EXCLUDED.instructions,
          "orderIndex" = EXCLUDED."orderIndex",
          "isActive" = EXCLUDED."isActive",
          "updatedAt" = NOW();
      `;
      await client.query(testQuery, testParams);
      console.log(`   [${Math.min(i + batchSize, allTests.length)}/${allTests.length}] tests inserted...`);
    }

    console.log(`\n🎉 SUCCESS! All ${allCategories.length} categories and ${allTests.length} tests are active!`);
  } catch (e) {
    console.error('Error during bulk seed:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
