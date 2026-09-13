import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const origin = process.argv[2] ?? 'http://127.0.0.1:3002';
const canonicalOrigin = 'https://www.littleloopapp.com';
const directory = fileURLToPath(new URL('../src/app/guides/', import.meta.url));
const slugs = readdirSync(directory, { withFileTypes: true })
  .filter((item) => item.isDirectory() && item.name !== 'og').map((item) => item.name);
const titles = new Set();
const descriptions = new Set();
const storeUrl = 'https://apps.apple.com/si/app/littleloop-safe-kids-videos/id6792684159?l=sl&amp;platform=ipad';

async function get(path) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  return response;
}

const index = await (await get('/guides')).text();
const sharedHeader = index.match(/<header class="site-header-shell">.*?<\/header>/s)?.[0];
assert(sharedHeader?.includes(storeUrl), 'shared header App Store link');
for (const path of ['/', '/privacy', '/terms', '/support', '/delete-account']) {
  const html = await (await get(path)).text();
  assert.equal(html.match(/<header class="site-header-shell">.*?<\/header>/s)?.[0], sharedHeader, `${path}: inconsistent header`);
}
const sitemap = await (await get('/sitemap.xml')).text();
const robots = await (await get('/robots.txt')).text();
assert(/^Disallow: \/invite$/m.test(robots), 'missing invitation crawl rule');
const llmsResponse = await get('/llms.txt');
assert(llmsResponse.headers.get('content-type')?.includes('text/plain'), 'llms.txt content type');
const llms = await llmsResponse.text();
assert(llms.startsWith('# LittleLoop\n'), 'llms.txt heading');
assert(robots.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`));
assert(!robots.includes('Disallow: /\n'), 'site-wide robots block');
for (const slug of slugs) {
  const path = `/guides/${slug}`;
  assert(llms.includes(`](${canonicalOrigin}${path})`), `${slug}: absent from llms.txt`);
  const html = await (await get(path)).text();
  assert.equal(html.match(/<header class="site-header-shell">.*?<\/header>/s)?.[0], sharedHeader, `${slug}: inconsistent header`);
  assert.equal((html.match(/<header class="site-header-shell">/g) ?? []).length, 1, `${slug}: duplicate header`);
  assert((html.match(/href="https:\/\/apps.apple.com\//g) ?? []).length >= 3, `${slug}: missing download placements`);
  assert(html.includes('Android coming soon'), `${slug}: missing platform availability`);
  assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1, `${slug}: H1 count`);
  assert(html.includes(`<link rel="canonical" href="${canonicalOrigin}${path}"`), `${slug}: canonical`);
  assert(!/<meta name="robots" content="[^"]*noindex/.test(html), `${slug}: noindex`);
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  assert(title && !titles.has(title), `${slug}: missing or duplicate title`);
  assert(description && !descriptions.has(description), `${slug}: missing or duplicate description`);
  titles.add(title);
  descriptions.add(description);
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((match) => JSON.parse(match[1]));
  assert(schemas.some((item) => item['@type'] === 'Article' && item.mainEntityOfPage === `${canonicalOrigin}${path}`), `${slug}: Article schema`);
  assert(schemas.some((item) => item['@type'] === 'BreadcrumbList' && item.itemListElement.length === 3), `${slug}: breadcrumbs`);
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert(html.includes(`id="${id}"`), `${slug}: broken anchor ${id}`);
  assert(index.includes(`href="${path}"`), `${slug}: absent from index`);
  assert(sitemap.includes(`<loc>${canonicalOrigin}${path}</loc>`), `${slug}: absent from sitemap`);
  const image = await get(`/guides/og/${slug}`);
  assert(image.headers.get('content-type')?.includes('image/png'), `${slug}: OG image type`);
  const png = new DataView(await image.arrayBuffer());
  assert.equal(png.getUint32(16), 1200);
  assert.equal(png.getUint32(20), 630);
}
assert.equal((await fetch(new URL('/guides/this-guide-does-not-exist', origin))).status, 404);
console.log(`PASS: ${slugs.length} article pages and OG images, HTTP 200, unique metadata, canonical URLs, H1, JSON-LD, anchors, index links, sitemap, robots and unknown-route 404 (${origin}).`);
