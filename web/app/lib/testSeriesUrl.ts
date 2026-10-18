// URL helpers for the Test Series catalog.
//
// Every level of the catalog has its own address, like the typing test pages:
//   /mock-tests                                  all categories
//   /mock-tests/{category}                       one category (its exams)
//   /mock-tests/{category}/{exam}                one exam (its test series)
//   /mock-tests/{category}/{exam}/{series}       one test series (its tests)
//
// Segments are readable slugs derived from the catalog ids (underscores become hyphens).
// Resolution compares slugs, so both the slug and the raw id work in a URL.

export const TEST_SERIES_BASE = '/mock-tests';

export function toSlug(id: string): string {
  return String(id || '')
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildTestSeriesPath(categoryId?: string | null, examId?: string | null, seriesId?: string | null): string {
  if (!categoryId) return TEST_SERIES_BASE;
  let path = `${TEST_SERIES_BASE}/${toSlug(categoryId)}`;
  if (examId) {
    path += `/${toSlug(examId)}`;
    if (seriesId) path += `/${toSlug(seriesId)}`;
  }
  return path;
}

export interface ResolvedTestSeriesPath {
  categoryId: string | null;
  examId: string | null;
  seriesId: string | null;
  /** true when every segment in the URL matched a catalog entry */
  exact: boolean;
}

const match = (items: any[] | undefined, segment: string | undefined): any | undefined => {
  if (!segment || !items) return undefined;
  let decoded = segment;
  try { decoded = decodeURIComponent(segment); } catch { /* malformed escape: compare as-is */ }
  const wanted = toSlug(decoded);
  return items.find(item => toSlug(item.id) === wanted);
};

/** Maps URL segments (after /mock-tests) to catalog ids. Unknown segments stop resolution. */
export function resolveTestSeriesPath(catalog: any[], segments: string[]): ResolvedTestSeriesPath {
  const [catSeg, examSeg, seriesSeg] = segments;
  const cat = match(catalog, catSeg);
  const exam = cat ? match(cat.subCategories, examSeg) : undefined;
  const series = exam ? match(exam.subSubCategories, seriesSeg) : undefined;
  const exact =
    (!catSeg || !!cat) &&
    (!examSeg || !!exam) &&
    (!seriesSeg || !!series) &&
    segments.length <= 3;
  return {
    categoryId: cat ? cat.id : null,
    examId: exam ? exam.id : null,
    seriesId: series ? series.id : null,
    exact,
  };
}

/** Path segments after /mock-tests for a pathname such as /mock-tests/ssc/ssc-cgl. */
export function testSeriesSegments(pathname: string): string[] {
  const parts = (pathname || '').split('?')[0].split('#')[0].split('/').filter(Boolean);
  const base = TEST_SERIES_BASE.replace(/^\//, '');
  return parts[0] === base ? parts.slice(1) : [];
}
