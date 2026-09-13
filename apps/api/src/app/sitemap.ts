import type { MetadataRoute } from 'next';
import { GUIDES, SITE_URL } from '@/content/guides';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...['', '/guides', '/privacy', '/terms'].map((path) => ({ url: `${SITE_URL}${path}` })),
    ...GUIDES.map((guide) => ({
      url: `${SITE_URL}/guides/${guide.slug}`,
      lastModified: guide.updatedAt ?? guide.publishedAt,
    })),
  ];
}
