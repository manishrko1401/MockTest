import crypto from 'crypto';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import { LIVE_TESTS, LiveTestConfig, LivePaper, LiveResult, LiveResultQuestion, isLiveTestId, liveQuestionCount } from './liveTestShared';

// -----------------------------------------------------------------------------
// Live tests (see liveTestShared.ts). 'live-test-start' makes a new random paper from the
// bank and returns it WITHOUT answers, with a signed token listing its questions.
// 'live-test-submit' checks the token, scores the answers from the bank and returns the
// result with answers and solutions. Nothing is written to the database.
// -----------------------------------------------------------------------------

export const LIVE_ACTIONS = ['live-test-start', 'live-test-submit'] as const;

const PAPER_DAYS = 7;
const BANK_CACHE_MS = 60 * 60 * 1000;

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.TIGRIS_ENDPOINT || 'https://fly.storage.tigris.dev',
  credentials: { accessKeyId: process.env.TIGRIS_ACCESS_KEY_ID || '', secretAccessKey: process.env.TIGRIS_SECRET_ACCESS_KEY || '' },
});

type BankQuestion = Record<string, any> & { id: string; area: string; difficulty: 'easy' | 'medium' | 'hard'; correctIndex: number };
const bankCache = new Map<string, { at: number; questions: BankQuestion[]; byId: Map<string, BankQuestion> }>();

/** The bank, read from Tigris once an hour per server instance. */
async function loadBank(cfg: LiveTestConfig) {
  const hit = bankCache.get(cfg.id);
  if (hit && Date.now() - hit.at < BANK_CACHE_MS) return hit;
  const obj = await s3.send(new GetObjectCommand({ Bucket: process.env.TIGRIS_BUCKET_NAME, Key: cfg.bankKey }));
  const data = JSON.parse(await obj.Body!.transformToString());
  const questions: BankQuestion[] = Array.isArray(data) ? data : data.questions;
  const entry = { at: Date.now(), questions, byId: new Map(questions.map(q => [q.id, q])) };
  bankCache.set(cfg.id, entry);
  return entry;
}

/** All bank questions of a live test (used to describe a reported question). */
export async function liveBankQuestions(testId: string): Promise<any[] | null> {
  const cfg = LIVE_TESTS[testId];
  return cfg ? (await loadBank(cfg)).questions : null;
}

// ---- Signed paper token ----

function signingKey(): Buffer {
  const secret = process.env.LIVE_TEST_SECRET || process.env.TIGRIS_SECRET_ACCESS_KEY || process.env.CRON_SECRET;
  if (!secret) throw new Error('No server secret configured for live tests');
  return crypto.createHmac('sha256', secret).update('mth-live-test-v1').digest();
}
const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');

function signPaper(payload: { t: string; u: string; q: string[]; iat: number; exp: number }): string {
  const body = b64(JSON.stringify(payload));
  return `${body}.${b64(crypto.createHmac('sha256', signingKey()).update(body).digest())}`;
}

function readPaper(token: string): { t: string; u: string; q: string[]; iat: number; exp: number } | null {
  if (typeof token !== 'string' || token.length > 8000) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', signingKey()).update(body).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

// ---- Making a paper ----

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const answerKey = (q: BankQuestion) => String(q.optionsEn?.[q.correctIndex] ?? '').trim().toLowerCase();

/** A balanced random paper: each area's count, about 22% easy, 56% medium, 22% hard, no two questions with the same answer. */
function makePaper(cfg: LiveTestConfig, bank: BankQuestion[]): BankQuestion[] {
  const picked: BankQuestion[] = [];
  const answers = new Set<string>();
  for (const area of cfg.areas) {
    const pool = bank.filter(q => q.area === area.name);
    const easy = Math.round(area.count * 0.225);
    const hard = Math.round(area.count * 0.225);
    const want = { easy, hard, medium: area.count - easy - hard } as Record<string, number>;
    const fromArea: BankQuestion[] = [];
    for (const level of ['easy', 'medium', 'hard']) {
      for (const q of shuffled(pool.filter(x => x.difficulty === level))) {
        if (want[level] <= 0) break;
        if (answers.has(answerKey(q))) continue;
        fromArea.push(q); answers.add(answerKey(q)); want[level]--;
      }
    }
    // Not enough of one level: top up from the rest of the area
    for (const q of shuffled(pool)) {
      if (fromArea.length >= area.count) break;
      if (fromArea.includes(q) || answers.has(answerKey(q))) continue;
      fromArea.push(q); answers.add(answerKey(q));
    }
    picked.push(...fromArea);
  }
  return shuffled(picked);
}

/** What the student gets during the test: no answer, no solution. */
function forStudent(cfg: LiveTestConfig, q: BankQuestion) {
  return {
    id: q.id, textEn: q.textEn, textHi: q.textHi, optionsEn: q.optionsEn, optionsHi: q.optionsHi,
    section: cfg.section, positiveMarks: cfg.positiveMarks, negativeMarks: cfg.negativeMarks,
    ...(q.fixedOrder ? { fixedOrder: true } : {}),
  };
}

async function canTake(cfg: LiveTestConfig, requester: { id: string; role: string }, tierAllows: (r: string, u: string | null | undefined) => boolean) {
  if (requester.role !== 'STUDENT') return true;
  const u = await prisma.user.findUnique({ where: { id: requester.id }, select: { subscriptionTier: true } });
  return tierAllows(cfg.requiredTier, u?.subscriptionTier);
}

// ---- Actions ----

export async function handleLiveAction(
  action: string,
  data: any,
  requester: { id: string; role: string },
  deps: { tierAllows: (required: string, userTier: string | null | undefined) => boolean },
) {
  const testId = String(data?.testId || '');
  if (!isLiveTestId(testId)) return NextResponse.json({ success: false, error: 'Not a live test' }, { status: 400 });
  const cfg = LIVE_TESTS[testId];
  if (!(await canTake(cfg, requester, deps.tierAllows))) {
    return NextResponse.json({ success: false, locked: cfg.requiredTier, error: 'This live test is for Pass Pro members.' }, { status: 403 });
  }

  const bank = await loadBank(cfg);

  if (action === 'live-test-start') {
    const paper = makePaper(cfg, bank.questions);
    const now = Date.now();
    const exp = now + PAPER_DAYS * 86400_000;
    const result: LivePaper = {
      testId,
      token: signPaper({ t: testId, u: requester.id, q: paper.map(q => q.id), iat: now, exp }),
      questions: paper.map(q => forStudent(cfg, q)),
      createdAt: now,
      expiresAt: exp,
    };
    return NextResponse.json({
      success: true, paper: result, title: cfg.title, titleHi: cfg.titleHi,
      durationMinutes: cfg.durationMinutes, positiveMarks: cfg.positiveMarks, negativeMarks: cfg.negativeMarks,
      questionsCount: liveQuestionCount(cfg), maxMarks: liveQuestionCount(cfg) * cfg.positiveMarks,
    });
  }

  // live-test-submit
  const paper = readPaper(data?.token);
  if (!paper || paper.t !== testId || paper.u !== requester.id) {
    return NextResponse.json({ success: false, error: 'This paper could not be verified. Please start a new live test.' }, { status: 400 });
  }
  if (Date.now() > paper.exp) {
    return NextResponse.json({ success: false, error: 'This paper has expired. Please start a new live test.' }, { status: 400 });
  }
  const responses = (data?.responses && typeof data.responses === 'object') ? data.responses : {};
  const questions: LiveResultQuestion[] = [];
  const areas = cfg.areas.map(a => ({ name: a.name, nameHi: a.nameHi, total: 0, correct: 0, wrong: 0, skipped: 0, score: 0 }));
  let correct = 0, wrong = 0, skipped = 0;
  for (const id of paper.q) {
    const q = bank.byId.get(id);
    if (!q) continue;
    const raw = responses[id]?.selectedOptionIndex;
    const n = Array.isArray(q.optionsEn) ? q.optionsEn.length : 0;
    const chosen = Number.isInteger(raw) && raw >= 0 && raw < n ? raw : null;
    const status = chosen === null ? 'skipped' : chosen === q.correctIndex ? 'correct' : 'wrong';
    if (status === 'correct') correct++; else if (status === 'wrong') wrong++; else skipped++;
    const area = areas.find(a => a.name === q.area);
    if (area) {
      area.total++;
      area[status]++;
      area.score += status === 'correct' ? cfg.positiveMarks : status === 'wrong' ? -cfg.negativeMarks : 0;
    }
    questions.push({
      id, area: q.area,
      content: { en: { questionText: q.textEn, options: q.optionsEn }, hi: { questionText: q.textHi || q.textEn, options: q.optionsHi || q.optionsEn } },
      correctOptionIndex: q.correctIndex, selectedOptionIndex: chosen, status,
      explanation: { en: q.explanationEn || '', hi: q.explanationHi || q.explanationEn || '' },
    });
  }
  const round2 = (x: number) => Math.round(x * 100) / 100;
  areas.forEach(a => { a.score = round2(a.score); });
  const result: LiveResult = {
    testId, title: cfg.title, titleHi: cfg.titleHi,
    score: round2(correct * cfg.positiveMarks - wrong * cfg.negativeMarks),
    maxScore: questions.length * cfg.positiveMarks,
    correct, wrong, skipped,
    accuracy: correct + wrong ? round2((100 * correct) / (correct + wrong)) : 0,
    timeTakenSeconds: Math.max(0, Math.min(Number(data?.timeTakenSeconds) || 0, cfg.durationMinutes * 60 * 3)),
    positiveMarks: cfg.positiveMarks, negativeMarks: cfg.negativeMarks,
    areas, questions,
  };
  return NextResponse.json({ success: true, result });
}
