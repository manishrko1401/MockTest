import type { ActiveSession } from '../useTestEngine';

// -----------------------------------------------------------------------------
// Mock test scoring rules, shared by the exam engine (browser) and the server.
// The server re-scores every submitted attempt from the student's answers with its own
// answer key, so a result can't be faked — and the browser no longer needs the answers
// before the test is submitted.
// -----------------------------------------------------------------------------

export type ResponseInput = { selectedOptionIndex: number | null; state?: number };
export type ScoreResult = {
  totalMarks: number; obtainedMarks: number; correctCount: number;
  incorrectCount: number; unattemptedCount: number; accuracyPercentage: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** TCS iON marking: positive / negative marks per question (or section), RPSC RAS rules. */
export function scoreSession(session: ActiveSession, responses: Record<string, ResponseInput | undefined>, isRpscRasMode: boolean): ScoreResult {
  let totalMarks = 0, obtainedMarks = 0, correctCount = 0, incorrectCount = 0, unattemptedCount = 0;

  session.sections.forEach((section) => {
    const questions = session.questions.filter(q => q.sectionId === section.id).sort((a, b) => a.orderIndex - b.orderIndex);
    questions.forEach((q) => {
      const resp = responses[q.id];
      const positive = q.positiveMark !== undefined && q.positiveMark !== null ? Number(q.positiveMark) : Number(section.positiveMark);
      const negative = q.negativeMark !== undefined && q.negativeMark !== null ? Number(q.negativeMark) : Number(section.negativeMark);
      totalMarks += positive;

      // Count only ANSWERED (3) or ANSWERED_AND_MARKED_FOR_REVIEW (5), i.e. a saved option
      if (resp && (resp.state === 3 || resp.state === 5 || (resp.selectedOptionIndex !== null && resp.selectedOptionIndex !== undefined))) {
        // RPSC RAS: option index 4 = "Leave question unattempted" — 0 marks, no penalty
        if (isRpscRasMode && resp.selectedOptionIndex === 4) {
          unattemptedCount += 1;
        } else if (resp.selectedOptionIndex === q.correctOptionIndex) {
          obtainedMarks += positive;
          correctCount += 1;
        } else {
          obtainedMarks -= negative;
          incorrectCount += 1;
        }
      } else if (isRpscRasMode) {
        // RPSC RAS: a question left completely unattempted (without option 5) is penalised
        obtainedMarks -= negative > 0 ? negative : 0.44;
        incorrectCount += 1;
        unattemptedCount += 1;
      } else {
        unattemptedCount += 1;
      }
    });
  });

  return {
    totalMarks: round2(totalMarks),
    obtainedMarks: round2(obtainedMarks),
    correctCount,
    incorrectCount,
    unattemptedCount,
    accuracyPercentage: correctCount + incorrectCount > 0 ? round2((correctCount / (correctCount + incorrectCount)) * 100) : 0,
  };
}

/** RPSC RAS full tests / PYQs use the mandatory-attempt rules (option 5, extra time). */
export function isRpscRasTest(testId: string, session: Pick<ActiveSession, 'testTitle' | 'testCategory' | 'testSubcategory'>) {
  const idLower = testId.toLowerCase();
  const titleLower = (session.testTitle || '').toLowerCase();
  const catLower = (session.testCategory || '').toLowerCase();
  const subLower = (session.testSubcategory || '').toLowerCase();
  return (
    (catLower.includes('rpsc') && (subLower.includes('ras') || titleLower.includes('ras'))) ||
    idLower.includes('rpsc_ras') || idLower.includes('rpsc-ras') || idLower.includes('rpsc__ras') ||
    (titleLower.includes('rpsc') && (titleLower.includes('ras') || titleLower.includes('prelim'))) ||
    (titleLower.includes('ras') && (titleLower.includes('prelim') || titleLower.includes('full') || titleLower.includes('pyq') || titleLower.includes('paper')))
  );
}

/** RDSO CBAT (psycho) tests run on the CBAT engine. */
export function isCbatTest(testId: string, catalog: any[] | null | undefined) {
  const lowerId = (testId || '').toLowerCase();
  if (lowerId === 'rrb_ntpc_cbat__psycho_test__iayf') return true;
  // The catalog decides when the test is listed: CBAT only if it sits under the CBAT / psycho exam
  if (Array.isArray(catalog)) {
    for (const cat of catalog) {
      for (const sub of cat.subCategories || []) {
        const inSub =
          sub.tests?.some((t: any) => t.id === testId) ||
          sub.subSubCategories?.some((ss: any) => ss.tests?.some((t: any) => t.id === testId)) ||
          sub.subSubCategories?.some((ss: any) => ss.mockTests?.some((t: any) => t.id === testId));
        if (inSub) {
          const subName = (sub.name || '').toLowerCase();
          return sub.id === 'rrb_ntpc_cbat__psycho_test__iayf' || subName.includes('cbat') || subName.includes('psycho');
        }
      }
    }
  }
  // Not in the catalog (e.g. a direct link): fall back to id keywords
  return (
    lowerId.includes('cbat') || lowerId.includes('psycho') || lowerId.includes('station_master') ||
    lowerId.includes('classification') || lowerId.includes('personality') || lowerId.includes('short_route') ||
    lowerId.includes('information_ordering') || lowerId.includes('add_of_odd') || lowerId.includes('odd_numbers') ||
    lowerId.includes('selective_attention') || lowerId.includes('spatial_scanning') ||
    (lowerId.includes('intelligence') && !lowerId.includes('reasoning'))
  );
}

/** CBAT: 1 mark per correct answer (the chosen option's position = the answer's position). */
export function scoreCbat(rawQuestions: any[], responses: Record<string, ResponseInput | undefined>): ScoreResult {
  let correct = 0, attempted = 0;
  for (const q of rawQuestions) {
    const r = q?.id ? responses[q.id] : undefined;
    if (!r || r.selectedOptionIndex === null || r.selectedOptionIndex === undefined) continue;
    attempted++;
    if (r.selectedOptionIndex === (typeof q.correctIndex === 'number' ? q.correctIndex : 0)) correct++;
  }
  return {
    totalMarks: rawQuestions.length,
    obtainedMarks: correct,
    correctCount: correct,
    incorrectCount: attempted - correct,
    unattemptedCount: rawQuestions.length - attempted,
    accuracyPercentage: attempted ? Math.round((correct / attempted) * 100) : 0,
  };
}

/** Fields that give away the answer; removed from questions sent before an attempt. */
const ANSWER_FIELD = /^(correct|answer|explanation|solution|rationale)/i;
export function stripAnswers<T extends Record<string, any>>(questions: T[]): T[] {
  return questions.map(q => {
    if (!q || typeof q !== 'object') return q;
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(q)) if (!ANSWER_FIELD.test(k)) out[k] = v;
    return out as T;
  });
}
