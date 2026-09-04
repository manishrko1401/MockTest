import type { Metadata } from 'next';
import { cache } from 'react';
import { prisma } from '../../lib/prisma';
import NoticeDetailClient from './NoticeDetailClient';

const SITE_URL = 'https://mocktesthub.vercel.app';
const SITE_NAME = 'Mock Test Hub';

const CATEGORY_LABEL: Record<string, string> = {
  result: 'Result',
  admit_card: 'Admit Card',
  answer_key: 'Answer Key',
  notice: 'Recruitment Notification',
  announcement: 'Announcement',
};

// Cached so generateMetadata and the page body share one DB hit per request.
const getNotice = cache(async (id: string) => {
  return prisma.notice.findUnique({
    where: { id },
    select: {
      id: true, title: true, category: true, type: true,
      publishDate: true, lastDate: true, imageUrl: true, createdAt: true,
    },
  });
});

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const notice = await getNotice(id);

  if (!notice) {
    return { title: `Notice Not Found | ${SITE_NAME}` };
  }

  const categoryLabel = CATEGORY_LABEL[notice.category] || notice.type;
  // The bare title feeds the root layout's title template ("%s | Mock Test Hub"),
  // which handles the <title> tag suffix. OG/Twitter titles aren't affected by that
  // template, so they get the suffix added explicitly to keep branding on social shares.
  const title = notice.title;
  const socialTitle = `${notice.title} | ${SITE_NAME}`;
  const description = notice.lastDate
    ? `${notice.title}. Last Date: ${notice.lastDate}. Check ${categoryLabel} details, official links, and apply online at ${SITE_NAME}.`
    : `${notice.title}. Check ${categoryLabel} details and official links at ${SITE_NAME}.`;
  const url = `${SITE_URL}/updates/${notice.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: SITE_NAME,
      type: 'article',
      images: notice.imageUrl ? [{ url: notice.imageUrl }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: notice.imageUrl ? [notice.imageUrl] : undefined,
    },
  };
}

export default async function NoticeDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const notice = await getNotice(id);

  const jsonLd = notice ? {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: notice.title,
    datePublished: notice.createdAt.toISOString(),
    dateModified: notice.createdAt.toISOString(),
    publisher: { '@type': 'Organization', name: SITE_NAME },
    mainEntityOfPage: `${SITE_URL}/updates/${notice.id}`,
    ...(notice.imageUrl ? { image: notice.imageUrl } : {}),
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <NoticeDetailClient params={params} />
    </>
  );
}
