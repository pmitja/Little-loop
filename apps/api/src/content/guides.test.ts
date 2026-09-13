import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GUIDES, getGuideMetadata, SITE_URL } from './guides';
import sitemap from '../app/sitemap';
import robots from '../app/robots';
import { GET as getLlmsText } from '../app/llms.txt/route';

const guideRoot = resolve(process.cwd(), 'src/app/guides');
const slugs = new Set(GUIDES.map((guide) => guide.slug));

describe('guide publishing contract', () => {
  it('provides a text overview with every guide and accurate product limits', async () => {
    const response = getLlmsText();
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    const text = await response.text();
    expect(text.startsWith('# LittleLoop\n')).toBe(true);
    expect(text).not.toContain('<html');
    expect(text).toContain('Android is coming soon');
    expect(text).toContain('ads may appear');
    for (const guide of GUIDES) expect(text).toContain(`](${SITE_URL}/guides/${guide.slug})`);
  });

  it('blocks crawling of invitations with and without trailing slashes', () => {
    const rules = robots().rules;
    const rule = Array.isArray(rules) ? rules[0] : rules;
    const disallowed = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow ?? ''];
    expect(rule).toMatchObject({ allow: '/', disallow: ['/api/', '/invite'] });
    for (const path of ['/invite', '/invite/', '/invite?token=example']) {
      expect(disallowed.some((prefix) => path.startsWith(prefix))).toBe(true);
    }
    expect(disallowed.some((prefix) => '/guides'.startsWith(prefix))).toBe(false);
  });

  it('has at least 25 distinct search intents and exactly one MDX page per guide', () => {
    expect(GUIDES.length).toBeGreaterThanOrEqual(25);
    for (const field of ['slug', 'title', 'description', 'primaryQuery'] as const) {
      const values = GUIDES.map((guide) => guide[field].trim().toLowerCase());
      expect(new Set(values).size, `duplicate ${field}`).toBe(GUIDES.length);
    }
    const directories = readdirSync(guideRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== 'og').map((entry) => entry.name);
    expect(directories.sort()).toEqual([...slugs].sort());
  });

  for (const guide of GUIDES) {
    it(`${guide.slug}: content, navigation and metadata are complete`, () => {
      const mdx = readFileSync(resolve(guideRoot, guide.slug, 'page.mdx'), 'utf8');
      expect(mdx).toContain(`getGuideMetadata('${guide.slug}')`);
      expect(mdx).toContain(`slug="${guide.slug}"`);
      expect(mdx).not.toMatch(/^# /m);
      const headings = [...mdx.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
      const headingIds = headings.map((heading) => heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
      expect(new Set(headingIds).size).toBe(headings.length);
      const tocIds = [...mdx.matchAll(/["']?id["']?\s*:\s*["']([^"']+)["']/g)].map((match) => match[1]);
      expect(tocIds.length).toBeGreaterThan(0);
      for (const id of tocIds) expect(headingIds, `missing heading ${id}`).toContain(id);
      const links = [...mdx.matchAll(/\]\(\/guides\/([^)#]+)(?:#[^)]*)?\)/g)].map((match) => match[1]);
      expect(new Set(links).size).toBeGreaterThanOrEqual(2);
      expect(new Set(guide.relatedSlugs).size).toBe(guide.relatedSlugs.length);
      expect(guide.relatedSlugs.length).toBeGreaterThanOrEqual(2);
      expect(guide.relatedSlugs.length).toBeLessThanOrEqual(4);
      for (const slug of [...links, ...guide.relatedSlugs]) {
        expect(slugs.has(slug), `broken link ${slug}`).toBe(true);
        expect(slug).not.toBe(guide.slug);
      }
      for (const date of [guide.publishedAt, guide.verifiedAt]) {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(Date.parse(date))).toBe(false);
      }
      expect(guide.sources.length).toBeGreaterThan(0);
      for (const source of guide.sources) expect(new URL(source.url).protocol).toBe('https:');
      const metadata = getGuideMetadata(guide.slug);
      expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/guides/${guide.slug}`);
      expect(metadata.title).toBe(guide.title);
      expect(metadata.description).toBe(guide.description);
      expect(metadata.openGraph).toMatchObject({ type: 'article', url: `${SITE_URL}/guides/${guide.slug}` });
    });
  }

  it('includes every guide in the sitemap on the canonical domain', () => {
    const entries = sitemap();
    expect(new Set(entries.map((entry) => entry.url)).size).toBe(entries.length);
    for (const guide of GUIDES) expect(entries.map((entry) => entry.url)).toContain(`${SITE_URL}/guides/${guide.slug}`);
    for (const entry of entries) expect(new URL(entry.url).origin).toBe(SITE_URL);
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it('does not reuse article paragraphs across search intents', () => {
    const seen = new Map<string, string>();
    for (const guide of GUIDES) {
      const text = readFileSync(resolve(guideRoot, guide.slug, 'page.mdx'), 'utf8');
      for (const paragraph of text.split(/\n\s*\n/)) {
        if (paragraph.length < 180 || /^(import|export|<|#|\|)/.test(paragraph)) continue;
        const normalized = paragraph.replace(/\s+/g, ' ').trim();
        expect(seen.get(normalized), `paragraph repeated in ${guide.slug}`).toBeUndefined();
        seen.set(normalized, guide.slug);
      }
    }
  });
});
