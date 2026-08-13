export interface TestMarkingSchemeInfo {
  badgeText: string;
  isCustom: boolean;
  sectionsBreakdown?: Array<{ name: string; positiveMarks: number; negativeMarks: number }>;
}

export function shortenSectionName(name: string): string {
  if (!name) return 'Sec';
  const clean = name.trim();
  const lower = clean.toLowerCase();
  if (lower.includes('general studies') || lower.includes('general awareness') || lower.includes('general knowledge') || lower.includes('gs')) return 'GS';
  if (lower.includes('quantitative') || lower.includes('aptitude') || lower.includes('math')) return 'Quant';
  if (lower.includes('reasoning') || lower.includes('mental')) return 'Reasoning';
  if (lower.includes('english')) return 'English';
  if (lower.includes('hindi')) return 'Hindi';
  if (lower.includes('child development') || lower.includes('cdp') || lower.includes('pedagogy')) return 'CDP';
  if (lower.includes('social')) return 'SST';
  if (clean.length > 10) return clean.substring(0, 8) + '…';
  return clean;
}

export function formatTestMarkingScheme(test: {
  positiveMarks?: number;
  negativeMarks?: number;
  sections?: Array<{ name: string; positiveMarks?: number; negativeMarks?: number }>;
  questionsCount?: number;
  maxMarks?: number;
}): TestMarkingSchemeInfo {
  const defaultPos = test.positiveMarks !== undefined && test.positiveMarks !== null ? Number(test.positiveMarks) : 2.0;
  const defaultNeg = test.negativeMarks !== undefined && test.negativeMarks !== null ? Number(test.negativeMarks) : 0.5;

  // 1. Check if test has section-level rules
  if (test.sections && Array.isArray(test.sections) && test.sections.length > 0) {
    const secBadges = test.sections.map(s => {
      const p = s.positiveMarks !== undefined && s.positiveMarks !== null ? Number(s.positiveMarks) : defaultPos;
      const n = s.negativeMarks !== undefined && s.negativeMarks !== null ? Number(s.negativeMarks) : defaultNeg;
      return `${shortenSectionName(s.name)}: +${p}/-${n}`;
    });
    const uniqueMarks = Array.from(new Set(test.sections.map(s => {
      const p = s.positiveMarks !== undefined && s.positiveMarks !== null ? Number(s.positiveMarks) : defaultPos;
      const n = s.negativeMarks !== undefined && s.negativeMarks !== null ? Number(s.negativeMarks) : defaultNeg;
      return `+${p}/-${n}`;
    })));

    if (uniqueMarks.length > 1 || (uniqueMarks.length === 1 && uniqueMarks[0] !== `+${defaultPos}/-${defaultNeg}`)) {
      return {
        badgeText: secBadges.join(' • '),
        isCustom: true,
        sectionsBreakdown: test.sections.map(s => ({
          name: s.name,
          positiveMarks: s.positiveMarks !== undefined && s.positiveMarks !== null ? Number(s.positiveMarks) : defaultPos,
          negativeMarks: s.negativeMarks !== undefined && s.negativeMarks !== null ? Number(s.negativeMarks) : defaultNeg
        }))
      };
    }
  }

  // 2. Check if question-wise or non-uniform marking exists (e.g. 40Q @ +1/-0.25 & 60Q @ +2/-0.5 = 160 marks for 100 Qs)
  const totalQ = test.questionsCount || 100;
  const totalM = test.maxMarks || (totalQ * defaultPos);

  const expectedMarksIfUniform = totalQ * defaultPos;
  if (Math.abs(totalM - expectedMarksIfUniform) > 0.1 && totalQ > 0) {
    // Try solver for +1.0/-0.25 and +2.0/-0.5
    let foundBreakdown = '';
    for (let c1 = 1; c1 < totalQ; c1++) {
      const c2 = totalQ - c1;
      const p1 = 1.0;
      const p2 = 2.0;
      const n1 = 0.25;
      const n2 = 0.5;
      if (Math.abs((c1 * p1 + c2 * p2) - totalM) < 0.01) {
        foundBreakdown = `${c1}Q (+${p1}/-${n1}) • ${c2}Q (+${p2}/-${n2})`;
        break;
      }
    }
    if (foundBreakdown) {
      return {
        badgeText: foundBreakdown,
        isCustom: true
      };
    }

    // Try solver for +2.0/-0.5 and +4.0/-1.0
    for (let c1 = 1; c1 < totalQ; c1++) {
      const c2 = totalQ - c1;
      const p1 = 2.0;
      const p2 = 4.0;
      const n1 = 0.5;
      const n2 = 1.0;
      if (Math.abs((c1 * p1 + c2 * p2) - totalM) < 0.01) {
        foundBreakdown = `${c1}Q (+${p1}/-${n1}) • ${c2}Q (+${p2}/-${n2})`;
        break;
      }
    }
    if (foundBreakdown) {
      return {
        badgeText: foundBreakdown,
        isCustom: true
      };
    }

    return {
      badgeText: `Mixed (${totalQ}Q = ${totalM}M)`,
      isCustom: true
    };
  }

  return {
    badgeText: `+${defaultPos} / -${defaultNeg}`,
    isCustom: false
  };
}
