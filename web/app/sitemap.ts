import type { MetadataRoute } from 'next';
import { prisma } from './lib/prisma';
import { buildTestSeriesPath } from './lib/testSeriesUrl';

const SITE_URL = 'https://mocktesthub.vercel.app';

// Regenerate at most once an hour — sitemap freshness doesn't need to be per-request.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/updates`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/mock-tests`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/practice-series`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/typing-test`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/referrals`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const [notices, typingCategories, testCategories, testExams] = await Promise.all([
    // Most recent 1000 notices — plenty of headroom under the 50k sitemap-entry limit
    // while keeping the query fast; older notices stay reachable via internal links.
    prisma.notice.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1000,
      select: { id: true, createdAt: true },
    }),
    prisma.typingCategory.findMany({
      where: { isActive: true },
      select: { id: true, updatedAt: true },
    }),
    prisma.category.findMany({ select: { id: true } }),
    prisma.exam.findMany({ select: { id: true, categoryId: true } }),
  ]);

  const noticeRoutes: MetadataRoute.Sitemap = notices.map(n => ({
    url: `${SITE_URL}/updates/${n.id}`,
    lastModified: n.createdAt,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  const typingRoutes: MetadataRoute.Sitemap = typingCategories.map(c => ({
    url: `${SITE_URL}/typing-test/category/${c.id}`,
    lastModified: c.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  // Test Series: one address per category and per exam (practice series live on their own page)
  const isTestSeriesCategory = (id: string) => id !== 'practice_series' && !id.startsWith('ps_');
  const testSeriesRoutes: MetadataRoute.Sitemap = [
    ...testCategories
      .filter(c => isTestSeriesCategory(c.id))
      .map(c => ({ url: `${SITE_URL}${buildTestSeriesPath(c.id)}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...testExams
      .filter(e => isTestSeriesCategory(e.categoryId))
      .map(e => ({ url: `${SITE_URL}${buildTestSeriesPath(e.categoryId, e.id)}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
  ];

  return [...staticRoutes, ...noticeRoutes, ...typingRoutes, ...testSeriesRoutes];
}
