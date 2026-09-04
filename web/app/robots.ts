import type { MetadataRoute } from 'next';

const SITE_URL = 'https://mocktesthub.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/admin/*',
        '/api/*',
        '/profile',
        '/profile/*',
        '/locker',
        '/locker/*',
        '/exam/*',
        '/auth',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
