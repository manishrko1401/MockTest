import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import fs from 'fs';
import path from 'path';

// Persistent in-memory cache to survive hot reloads
const vocabCache = (global as any).vocabCache || { items: null };
if (process.env.NODE_ENV !== 'production') {
  (global as any).vocabCache = vocabCache;
}

const LOCAL_JSON_PATH = path.join(process.cwd(), 'vocab_catalog.json');

const DEFAULT_VOCAB = [
  {
    id: 1,
    word: "SCEPTICAL",
    pos: "(adj)",
    hindiMeaning: "संदेहवादी",
    meaning: "having or expressing doubt; not easily convinced; questioning the truth or validity of something.",
    synonyms: ["dubious", "incredulous", "cynical", "distrustful"],
    antonyms: ["certain", "convinced", "credulous", "trusting"],
    usage: "The public remains sceptical about the government's promises regarding tax cuts."
  },
  {
    id: 2,
    word: "EKE",
    pos: "(verb)",
    hindiMeaning: "बनाए रखना / कमी पूरा करना",
    meaning: "make an amount or supply of something last longer by using or consuming it frugally.",
    synonyms: ["save", "augment", "stretch", "economize"],
    antonyms: ["squander", "waste", "exhaust", "deplete"],
    usage: "She managed to eke out her student loan till the end of the academic year."
  },
  {
    id: 3,
    word: "CURATE",
    pos: "(verb)",
    hindiMeaning: "संग्रह करना / व्यवस्थित करना",
    meaning: "select, organize, and look after the items in a collection or exhibition.",
    synonyms: ["organize", "select", "manage", "assemble"],
    antonyms: ["neglect", "disorganize", "scatter", "disregard"],
    usage: "Both special art exhibitions are curated by independent museum specialists."
  },
  {
    id: 4,
    word: "GOSPEL",
    pos: "(noun)",
    hindiMeaning: "अकाट्य सत्य",
    meaning: "something that is accepted as unquestionably true.",
    synonyms: ["doctrine", "truth", "verity", "creed"],
    antonyms: ["falsehood", "lie", "myth", "fabrication"],
    usage: "You shouldn't take everything written in that tabloid as absolute gospel."
  },
  {
    id: 5,
    word: "CYNICISM",
    pos: "(noun)",
    hindiMeaning: "कुटिलता / निंदकता",
    meaning: "an inclination to believe that people are motivated purely by self-interest.",
    synonyms: ["skepticism", "distrust", "pessimism", "doubt"],
    antonyms: ["trust", "optimism", "faith", "naivety"],
    usage: "Her growing cynicism about human nature was understandable after years of trial."
  },
  {
    id: 6,
    word: "CORROBORATION",
    pos: "(noun)",
    hindiMeaning: "पुष्टि / समर्थन",
    meaning: "evidence that confirms or supports a statement, theory, or finding.",
    synonyms: ["confirmation", "verification", "validation", "substantiation"],
    antonyms: ["refutation", "contradiction", "denial", "disproof"],
    usage: "The police needed independent corroboration of the suspect's alibi."
  },
  {
    id: 7,
    word: "RENUNCIATION",
    pos: "(noun)",
    hindiMeaning: "त्याग / सन्यास",
    meaning: "the formal rejection of something, typically a belief, claim, or course of action.",
    synonyms: ["repudiation", "relinquishment", "abandonment", "abdication"],
    antonyms: ["acceptance", "assertion", "adoption", "claim"],
    usage: "His sudden renunciation of the royal title surprised the entire nation."
  },
  {
    id: 8,
    word: "PROBITY",
    pos: "(noun)",
    hindiMeaning: "ईमानदारी / सत्यनिष्ठा",
    meaning: "the quality of having strong moral principles; honesty and decency.",
    synonyms: ["integrity", "uprightness", "honesty", "rectitude"],
    antonyms: ["dishonesty", "deceit", "corruption", "unscrupulousness"],
    usage: "Financial probity is expected of anyone in a position of public trust."
  },
  {
    id: 9,
    word: "EXALT",
    pos: "(verb)",
    hindiMeaning: "प्रशंसा करना / पद बढ़ाना",
    meaning: "think or speak very highly of someone or something; elevate in rank.",
    synonyms: ["glorify", "praise", "extol", "laud"],
    antonyms: ["humiliate", "debase", "disparage", "condemn"],
    usage: "The essay exalts the virtues of traditional craftsmanship in modern design."
  },
  {
    id: 10,
    word: "EXCORIATE",
    pos: "(verb)",
    hindiMeaning: "आलोचना करना",
    meaning: "to criticize harshly and usually publicly.",
    synonyms: ["assail", "castigate", "lambaste", "vituperate", "imprecate"],
    antonyms: ["acclaim", "laud", "praise", "glorify", "admire", "exalt"],
    usage: "The stern judge will excoriate the behavior of the repeat offender by sentencing him to thirty years in prison."
  }
];

function readLocalCatalog() {
  try {
    if (fs.existsSync(LOCAL_JSON_PATH)) {
      const text = fs.readFileSync(LOCAL_JSON_PATH, 'utf-8');
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading local vocab_catalog.json:', e);
  }
  return null;
}

function saveLocalCatalog(items: any[]) {
  try {
    vocabCache.items = items;
    fs.writeFileSync(LOCAL_JSON_PATH, JSON.stringify(items, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving local vocab_catalog.json:', e);
  }
}

export async function GET() {
  try {
    let items = [];
    if ((prisma as any).vocab) {
      items = await (prisma as any).vocab.findMany({
        orderBy: { id: 'asc' }
      });
    }

    if (items && items.length > 0) {
      vocabCache.items = items;
      return NextResponse.json({ success: true, items, count: items.length, source: 'database' });
    }

    // Check memory cache or local JSON catalog
    if (vocabCache.items && vocabCache.items.length > 0) {
      return NextResponse.json({ success: true, items: vocabCache.items, count: vocabCache.items.length, source: 'cache' });
    }

    const localItems = readLocalCatalog();
    if (localItems && localItems.length > 0) {
      vocabCache.items = localItems;
      return NextResponse.json({ success: true, items: localItems, count: localItems.length, source: 'json_file' });
    }

    return NextResponse.json({ success: true, items: DEFAULT_VOCAB, count: DEFAULT_VOCAB.length, source: 'default' });
  } catch (error: any) {
    console.error('GET /api/vocab Error:', error);
    const localItems = readLocalCatalog() || DEFAULT_VOCAB;
    return NextResponse.json({ success: true, items: localItems, count: localItems.length, source: 'fallback' });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, data, items: bulkItems } = body;

    if (action === 'bulk_upload' || Array.isArray(body)) {
      const itemsToInsert = Array.isArray(body) ? body : bulkItems || data;
      if (!Array.isArray(itemsToInsert) || itemsToInsert.length === 0) {
        return NextResponse.json({ success: false, error: 'Invalid or empty JSON array provided.' }, { status: 400 });
      }

      const formatted = itemsToInsert.map((item, idx) => ({
        id: item.id || idx + 1,
        word: String(item.word || '').toUpperCase().trim(),
        pos: String(item.pos || '(verb)').trim(),
        hindiMeaning: String(item.hindiMeaning || item.hindi || '').trim(),
        meaning: String(item.meaning || '').trim(),
        synonyms: Array.isArray(item.synonyms) 
          ? item.synonyms.map((s: any) => String(s).trim())
          : String(item.synonyms || '').split(',').map(s => s.trim()).filter(Boolean),
        antonyms: Array.isArray(item.antonyms)
          ? item.antonyms.map((a: any) => String(a).trim())
          : String(item.antonyms || '').split(',').map(a => a.trim()).filter(Boolean),
        usage: String(item.usage || item.example || '').trim()
      })).filter(i => i.word.length > 0);

      // Save locally to file & memory cache
      saveLocalCatalog(formatted);

      if ((prisma as any).vocab) {
        try {
          // Clear previous entries and insert new batch
          await (prisma as any).vocab.deleteMany({});
          for (const item of formatted) {
            const { id, ...rest } = item;
            await (prisma as any).vocab.create({ data: rest });
          }
          const allItems = await (prisma as any).vocab.findMany({ orderBy: { id: 'asc' } });
          vocabCache.items = allItems;
          return NextResponse.json({
            success: true,
            message: `Successfully saved ${allItems.length} vocabulary words to Tigris database!`,
            items: allItems,
            count: allItems.length
          });
        } catch (dbErr) {
          console.error('Prisma bulk insert warning:', dbErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully saved ${formatted.length} vocabulary words!`,
        items: formatted,
        count: formatted.length
      });
    }

    if (action === 'add') {
      const newItem = {
        word: String(data.word || '').toUpperCase().trim(),
        pos: String(data.pos || '(verb)').trim(),
        hindiMeaning: String(data.hindiMeaning || '').trim(),
        meaning: String(data.meaning || '').trim(),
        synonyms: Array.isArray(data.synonyms) ? data.synonyms : String(data.synonyms || '').split(',').map(s => s.trim()).filter(Boolean),
        antonyms: Array.isArray(data.antonyms) ? data.antonyms : String(data.antonyms || '').split(',').map(a => a.trim()).filter(Boolean),
        usage: String(data.usage || '').trim()
      };

      let updatedList = vocabCache.items || readLocalCatalog() || DEFAULT_VOCAB;
      updatedList = [...updatedList, { id: updatedList.length + 1, ...newItem }];
      saveLocalCatalog(updatedList);

      if ((prisma as any).vocab) {
        try {
          await (prisma as any).vocab.create({ data: newItem });
          const allItems = await (prisma as any).vocab.findMany({ orderBy: { id: 'asc' } });
          vocabCache.items = allItems;
          return NextResponse.json({ success: true, message: 'Word added to Tigris database!', created: newItem, items: allItems });
        } catch (e) {
          console.error('DB error adding word:', e);
        }
      }

      return NextResponse.json({ success: true, message: 'Word added!', created: newItem, items: updatedList });
    }

    if (action === 'delete') {
      const { id } = data;
      let updatedList = (vocabCache.items || readLocalCatalog() || DEFAULT_VOCAB).filter((i: any) => i.id !== Number(id));
      saveLocalCatalog(updatedList);

      if ((prisma as any).vocab && id) {
        try {
          await (prisma as any).vocab.delete({ where: { id: Number(id) } });
          const allItems = await (prisma as any).vocab.findMany({ orderBy: { id: 'asc' } });
          vocabCache.items = allItems;
          return NextResponse.json({ success: true, message: 'Word deleted from database', items: allItems });
        } catch (e) {
          console.error('DB error deleting word:', e);
        }
      }
      return NextResponse.json({ success: true, message: 'Word deleted', items: updatedList });
    }

    if (action === 'seed_defaults') {
      saveLocalCatalog(DEFAULT_VOCAB);
      if ((prisma as any).vocab) {
        try {
          await (prisma as any).vocab.deleteMany({});
          for (const item of DEFAULT_VOCAB) {
            const { id, ...rest } = item;
            await (prisma as any).vocab.create({ data: rest });
          }
          const allItems = await (prisma as any).vocab.findMany({ orderBy: { id: 'asc' } });
          vocabCache.items = allItems;
          return NextResponse.json({ success: true, message: 'Loaded default 10 vocabulary words to database!', items: allItems });
        } catch (e) {
          console.error('DB error seeding defaults:', e);
        }
      }
      return NextResponse.json({ success: true, items: DEFAULT_VOCAB });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('POST /api/vocab Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
