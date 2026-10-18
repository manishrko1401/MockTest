// -----------------------------------------------------------------------------
// Ongoing exam progress: one snapshot of everything needed to continue a test
// (answers, review marks, visited questions, timer, position, submitted sections).
//
// - Saved in this browser on every change, so a refresh, closed tab, crash or
//   power cut loses at most a second.
// - Backed up to the server (save-exam-progress) shortly after each change and
//   every few seconds while the test runs, so it also survives a cleared browser
//   or a switch to another device.
// - On resume, the newer of the two copies wins.
// - Removed only when the test is submitted or the student resets it.
// -----------------------------------------------------------------------------

export type ExamEngineKind = 'tcs' | 'cbat';

export interface ExamProgress {
  v: 1;
  engine: ExamEngineKind;
  testId: string;
  userId: string;
  title?: string;
  source?: 'web' | 'mobile_web';
  /** Client time (epoch ms) of this save; newer saves win, on the server and on resume. */
  savedAt: number;
  timeRemaining: number;
  violations: number;
  currentSectionIndex: number;
  currentQuestionIndex: number;
  /** Engine-specific state */
  data: any;
}

const PREFIX = 'exam_progress_';
const keyOf = (userId: string | null | undefined, testId: string) => `${PREFIX}${userId || 'guest'}_${testId}`;
// Key used by the previous version of the exam page
const legacyKeyOf = (testId: string) => `ongoing_web_${testId}`;

export function readLocalProgress(userId: string | null | undefined, testId: string, engine: ExamEngineKind): ExamProgress | null {
  try {
    const raw = localStorage.getItem(keyOf(userId, testId));
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.v === 1 && p.testId === testId && p.engine === engine && (p.userId || 'guest') === (userId || 'guest')) return p;
    }
    // Snapshot written by the previous version of the TCS exam page (not tied to a user)
    if (engine === 'tcs') {
      const old = localStorage.getItem(legacyKeyOf(testId));
      if (old) {
        const s = JSON.parse(old);
        if (s && s.status === 'ONGOING' && s.responses) {
          return {
            v: 1, engine: 'tcs', testId, userId: userId || 'guest',
            savedAt: Number(s.savedAt) || 0,
            timeRemaining: s.timeRemaining, violations: s.violations ?? 0,
            currentSectionIndex: s.currentSectionIndex ?? 0, currentQuestionIndex: s.currentQuestionIndex ?? 0,
            data: { responses: s.responses },
          };
        }
      }
    }
  } catch { /* storage unavailable or corrupt */ }
  return null;
}

export function writeLocalProgress(p: ExamProgress) {
  try {
    localStorage.setItem(keyOf(p.userId, p.testId), JSON.stringify(p));
  } catch { /* storage full or unavailable: the server copy still has it */ }
}

/** Removes this browser's copy of a test's progress (on submit or reset). */
export function clearLocalProgress(testId: string, userId?: string | null) {
  try {
    localStorage.removeItem(keyOf(userId, testId));
    localStorage.removeItem(keyOf(null, testId));
    localStorage.removeItem(legacyKeyOf(testId));
  } catch { /* ignore */ }
}

/** null: the server has no progress for this test; undefined: the server could not be reached. */
export async function fetchServerProgress(userId: string, testId: string, engine: ExamEngineKind): Promise<ExamProgress | null | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-exam-progress', data: { userId, testId } }),
      signal: controller.signal,
    });
    const json = await res.json();
    if (!json?.success) return undefined;
    const p = json.progress;
    if (p && p.testId === testId && (p.engine || 'tcs') === engine) {
      return { ...p, v: 1, engine, userId, savedAt: Number(p.savedAt) || 0 };
    }
    return null;
  } catch {
    return undefined; // offline or slow: fall back to this browser's copy
  } finally {
    clearTimeout(timer);
  }
}

export function newerProgress(a: ExamProgress | null, b: ExamProgress | null): ExamProgress | null {
  if (!a) return b;
  if (!b) return a;
  return b.savedAt > a.savedAt ? b : a;
}

const KEEPALIVE_LIMIT = 60 * 1024; // browsers cap keepalive request bodies at 64 KB

/**
 * Sends progress to the server one request at a time; if saves pile up while one is
 * in flight, only the newest is sent next. stopAndFlush() is called before submitting,
 * so no progress save can land after the attempt is recorded.
 */
export function createProgressSyncer() {
  let inFlight: Promise<void> | null = null;
  let pending: ExamProgress | null = null;
  let stopped = false;

  const send = async (p: ExamProgress, keepalive: boolean) => {
    const body = JSON.stringify({ action: 'save-exam-progress', data: { userId: p.userId, snapshot: p } });
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: keepalive && body.length < KEEPALIVE_LIMIT,
      });
    } catch { /* offline: the browser copy has it, and the next save retries */ }
  };

  const drain = () => {
    inFlight = (async () => {
      while (pending && !stopped) {
        const p = pending;
        pending = null;
        await send(p, false);
      }
    })().finally(() => { inFlight = null; });
  };

  return {
    /** keepalive: the page is closing — send right away in a request the browser finishes after the tab is gone. */
    push(p: ExamProgress, opts: { keepalive?: boolean } = {}) {
      if (stopped || !p.userId || p.userId === 'guest') return;
      if (opts.keepalive) { void send(p, true); return; }
      pending = p;
      if (!inFlight) drain();
    },
    async stopAndFlush() {
      stopped = true;
      pending = null;
      if (inFlight) await inFlight;
    },
  };
}
