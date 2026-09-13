import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/content/guides';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/invite'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
