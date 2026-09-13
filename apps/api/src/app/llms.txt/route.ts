import { guidesByCluster } from '@/content/guides';
import { SITE_URL } from '@/content/site';

export const dynamic = 'force-static';

export function GET() {
  const content = [
    '# LittleLoop',
    '',
    '> LittleLoop is a parent-controlled YouTube video player for iPhone and iPad. This website also publishes practical guides to children\'s video viewing.',
    '',
    'Parents review and choose content before children watch. Android is coming soon. Playback uses the official YouTube embedded player; ads may appear. LittleLoop is not affiliated with or endorsed by Google or YouTube.',
    '',
    'Guides are written by the LittleLoop team and include competing products and options without a new app. Provider descriptions are not independent product tests. Each article lists its sources and verification date. Content controls do not guarantee that every video suits every child.',
    '',
    '## Website',
    '',
    `- [LittleLoop](${SITE_URL}/): Product overview and App Store download.`,
    `- [Parent guides](${SITE_URL}/guides): Browse all guides by topic.`,
    '',
    ...guidesByCluster().flatMap(({ cluster, guides }) => [
      `## ${cluster}`,
      '',
      ...guides.map((guide) => `- [${guide.title}](${SITE_URL}/guides/${guide.slug}): ${guide.description}`),
      '',
    ]),
    '## Optional',
    '',
    `- [Privacy policy](${SITE_URL}/privacy): Data collection, use and deletion.`,
    `- [Terms of use](${SITE_URL}/terms): Responsibilities, subscriptions and playback limitations.`,
    `- [Support](${SITE_URL}/support): Help and contact details.`,
    `- [Sitemap](${SITE_URL}/sitemap.xml): Public page URLs.`,
    '',
  ].join('\n');

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
