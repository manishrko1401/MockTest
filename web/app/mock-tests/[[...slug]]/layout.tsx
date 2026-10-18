import type { Metadata } from 'next';
import { prisma } from '../../lib/prisma';
import { toSlug, buildTestSeriesPath } from '../../lib/testSeriesUrl';

// Server-side titles for every Test Series address (/mock-tests/{category}/{exam}/{series}),
// so the browser tab and search engines show the real category / exam / series name.

type CatalogNames = {
  categories: { id: string; name: string }[];
  exams: { id: string; name: string; categoryId: string }[];
  series: { id: string; title: string; examId: string }[];
};

const NAMES_TTL_MS = 10 * 60 * 1000;
let namesCache: { at: number; data: CatalogNames } | null = null;

async function loadCatalogNames(): Promise<CatalogNames> {
  if (namesCache && Date.now() - namesCache.at < NAMES_TTL_MS) return namesCache.data;
  const [categories, exams, series] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true } }),
    prisma.exam.findMany({ select: { id: true, name: true, categoryId: true } }),
    prisma.testSeries.findMany({ select: { id: true, title: true, examId: true } }),
  ]);
  const data = { categories, exams, series };
  namesCache = { at: Date.now(), data };
  return data;
}

const DEFAULT_DESCRIPTION =
  'Free online mock tests for SSC, Railways, Banking, Teaching, UPSC and State exams with full tests, previous year papers and sectional tests.';

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const { slug = [] } = await params;
  const base: Metadata = {
    title: 'Test Series',
    description: DEFAULT_DESCRIPTION,
    alternates: { canonical: '/mock-tests' },
  };
  if (slug.length === 0) return base;

  try {
    const { categories, exams, series } = await loadCatalogNames();
    const seg = (i: number) => {
      const raw = slug[i];
      if (!raw) return '';
      try { return toSlug(decodeURIComponent(raw)); } catch { return toSlug(raw); }
    };
    const cat = categories.find(c => toSlug(c.id) === seg(0));
    if (!cat) return base;
    const exam = slug[1] ? exams.find(e => e.categoryId === cat.id && toSlug(e.id) === seg(1)) : undefined;
    const ser = exam && slug[2] ? series.find(s => s.examId === exam.id && toSlug(s.id) === seg(2)) : undefined;

    const parts = [ser?.title, exam?.name, cat.name].filter(Boolean) as string[];
    const subject = exam ? exam.name : cat.name;
    return {
      title: `${parts.join(' - ')} | Test Series`,
      description: ser
        ? `${ser.title} for ${exam!.name}: online mock tests with detailed solutions and analysis.`
        : `Online mock tests for ${subject}: full tests, previous year papers and sectional tests with detailed analysis.`,
      alternates: { canonical: buildTestSeriesPath(cat.id, exam?.id, ser?.id) },
    };
  } catch {
    return base;
  }
}

export default function TestSeriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
