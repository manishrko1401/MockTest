// AUTO-COPIED from the website by scripts/sync-shared.mjs. Edit the website file, then run npm run sync-shared.
import { ActiveSession, Question, QuestionResponse } from './webTypes';

// -----------------------------------------------------------------------------
// Shuffled tests: every attempt sees the questions (within each section) and each
// question's options in its own random order. One number, the seed, decides the order,
// so the same seed always gives the same order: it is saved with the attempt's progress,
// and a resumed attempt (on the website or the app) looks exactly as before.
//
// Answers are always saved with the ORIGINAL option numbers. During the attempt the
// engine works on the shuffled session (display numbers); convert with
// responsesToOriginal() before saving or submitting, and responsesToDisplay() on resume.
// The analysis page shows the original order, so explanations like "option 2 is correct"
// still match.
//
// Never shuffled: section order, questions sharing a passage (kept together, in order),
// options like "All of the above" / "Both A and B" / "arrange in order", CBAT and typing.
// -----------------------------------------------------------------------------

export interface ShuffledQuestion extends Question {
  /** optionOrder[shownPosition] = original option index */
  optionOrder?: number[];
}

/** A fresh seed for a new attempt. */
export function newShuffleSeed(): number {
  return Math.floor(Math.random() * 2147483646) + 1;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function shuffleInPlace<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const optionText = (o: any): string => String(typeof o === 'string' ? o : (o?.text ?? '')).replace(/<[^>]+>/g, ' ').toLowerCase();

// Options that point at other options or a fixed order, in English and Hindi
const FIXED_ORDER_RE = new RegExp([
  '\\ball\\s+(of\\s+)?(the\\s+)?(above|these|of\\s+them)\\b',
  '\\bnone\\s+(of\\s+)?(the\\s+)?(above|these|of\\s+them)\\b',
  '\\bboth\\b', '\\bneither\\b', '\\bnor\\b',
  '\\bonly\\s*\\(?[a-e1-5]\\)?(\\s|$|,|\\))',
  '(^|[\\s(])\\(?[a-e1-5]\\)?\\s*(,|and|&|or)\\s*\\(?[a-e1-5]\\)?([\\s),]|$)',
  '\\bmore than one\\b', '\\bcannot be determined\\b', '\\bdata (is )?(in)?adequate\\b',
  'उपर्युक्त', 'उपरोक्त', 'इनमें से कोई', 'इनमें से सभी', 'ये सभी', 'सभी विकल्प', 'दोनों', 'न तो', 'कोई भी नहीं',
].join('|'), 'i');

/** True if this question's options must keep their order. */
export function hasFixedOptionOrder(q: Question): boolean {
  if ((q as any).fixedOrder) return true;
  const en = q.content?.en?.options || [];
  const hi = q.content?.hi?.options || [];
  if (en.length < 2 || (hi.length && hi.length !== en.length)) return true;
  // Options that are only "1, 2, 3, 4" or a sequence like "ABCD", "BCDA" (arrangements)
  if ([...en, ...hi].some(o => FIXED_ORDER_RE.test(optionText(o)))) return true;
  const plain = en.map(o => optionText(o).trim());
  if (plain.every(t => /^[a-e]{3,6}$/i.test(t.replace(/[\s,\-–>]/g, '')))) return true;
  // Options that carry their own letter or number ("(a) Delhi", "B. Mumbai"): moving them
  // would put "(a)" in place C
  if (plain.every(t => /^(\(\s*[a-e1-5ivx]{1,3}\s*\)|[a-e1-5][.)])\s*\S/i.test(t))) return true;
  return false;
}

/** Only multiple-choice tests are shuffled (CBAT and typing use their own engines and never get here). */
export function canShuffleTest(session: ActiveSession): boolean {
  if (!session?.questions?.length) return false;
  if (session.questions.some(q => q.questionType && q.questionType !== 'mcq')) return false;
  return true;
}

/**
 * The shuffled copy of a session for one attempt. Question ids, sections and marks stay
 * the same; only orderIndex (within a section) and option order change. correctOptionIndex
 * is moved with the options, so the engine scores the shuffled session correctly.
 */
export function shuffleSession(session: ActiveSession, seed: number): ActiveSession {
  if (!seed || !session?.questions?.length) return session;
  const rand = rng(seed ^ hashString(session.testId || ''));

  const questions: ShuffledQuestion[] = [];
  for (const section of session.sections) {
    const inSection = session.questions
      .filter(q => q.sectionId === section.id)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    // Questions sharing a passage move together as one block, in their own order
    const blocks: Question[][] = [];
    for (const q of inSection) {
      const passage = (q.content?.en?.comprehension || q.content?.hi?.comprehension || '').trim();
      const last = blocks[blocks.length - 1];
      const lastPassage = last ? (last[0].content?.en?.comprehension || last[0].content?.hi?.comprehension || '').trim() : '';
      if (last && passage && passage === lastPassage) last.push(q);
      else blocks.push([q]);
    }
    shuffleInPlace(blocks, rand);
    let order = 0;
    for (const block of blocks) {
      for (const q of block) {
        const shuffled: ShuffledQuestion = { ...q, orderIndex: order++ };
        if (!hasFixedOptionOrder(q)) {
          const n = (q.content.en.options || []).length;
          const perm = shuffleInPlace([...Array(n).keys()], rand);
          const pick = (opts: any[]) => perm.map(i => opts[i]);
          shuffled.content = {
            en: { ...q.content.en, options: pick(q.content.en.options as any[]) },
            hi: { ...q.content.hi, options: pick((q.content.hi.options as any[])?.length === n ? q.content.hi.options as any[] : q.content.en.options as any[]) },
          };
          shuffled.correctOptionIndex = perm.indexOf(q.correctOptionIndex);
          shuffled.optionOrder = perm;
        }
        questions.push(shuffled);
      }
    }
  }
  // Questions whose section is missing from the list stay as they were
  for (const q of session.questions) if (!questions.some(s => s.id === q.id)) questions.push(q);
  return { ...session, questions, shuffleSeed: seed };
}

function mapIndex(idx: number | null | undefined, order: number[] | undefined, toOriginal: boolean): number | null {
  if (idx === null || idx === undefined) return idx ?? null;
  if (!order) return idx;
  if (toOriginal) return order[idx] ?? idx;
  const shown = order.indexOf(idx);
  return shown >= 0 ? shown : idx;
}

function convert<T extends Partial<QuestionResponse>>(session: ActiveSession, responses: Record<string, T>, toOriginal: boolean): Record<string, T> {
  const orders = new Map((session.questions as ShuffledQuestion[]).map(q => [q.id, q.optionOrder]));
  const out: Record<string, T> = {};
  for (const [id, r] of Object.entries(responses || {})) {
    const order = orders.get(id);
    if (!order || !r) { out[id] = r; continue; }
    out[id] = {
      ...r,
      ...('selectedOptionIndex' in r ? { selectedOptionIndex: mapIndex(r.selectedOptionIndex, order, toOriginal) } : {}),
      ...('tempOptionIndex' in r ? { tempOptionIndex: mapIndex(r.tempOptionIndex, order, toOriginal) } : {}),
    };
  }
  return out;
}

/** Shown option numbers (shuffled session) → original option numbers, for saving and submitting. */
export function responsesToOriginal<T extends Partial<QuestionResponse>>(session: ActiveSession, responses: Record<string, T>): Record<string, T> {
  return convert(session, responses, true);
}

/** Original option numbers (saved progress) → shown option numbers in the shuffled session. */
export function responsesToDisplay<T extends Partial<QuestionResponse>>(session: ActiveSession, responses: Record<string, T>): Record<string, T> {
  return convert(session, responses, false);
}
