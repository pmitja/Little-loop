# Guide publishing and review

The registry is `src/content/guides.ts`. Article bodies are MDX pages under `src/app/guides/`. There are 26 articles: the 25 agreed topics plus a separate no-app viewing guide.

## Search priorities

The three main query owners are:

- `how to stop youtube autoplay for kids`: `/guides/stop-youtube-autoplay-for-kids`
- `app to control what my kid watches`: `/guides/apps-to-control-what-kids-watch`
- `youtube kids alternative`: `/guides/youtube-kids-alternatives`

P0/P1/P2 stay in the registry for editorial work, not as visitor-facing badges. No monthly search-volume or ranking guarantees are claimed. The alternatives page is the competitive, longer-term target.

## Facts and editorial limits

Instructions use Google and Apple support documentation; behavior advice uses the American Academy of Pediatrics. Each article links its sources. Competitor descriptions are attributed to their providers and are not hands-on security tests. Cuppie could not be documented sufficiently for a confident comparison; Kovi was described as forthcoming when checked. Current app-store availability and prices for every competitor have not been independently verified. Do not turn provider claims into guarantees.

The team disclosure, non-app options and limitations of LittleLoop remain in the articles. On September 13 the user explicitly replaced the original one-CTA limit with repeated download placements. A common sticky header, a prompt beside the contents and a separate end-of-article download block now provide three App Store links per article. Android is marked coming soon. The final block states that parents select content, playback uses YouTube embeds, ads may appear and LittleLoop is not affiliated with Google or YouTube.

## Dates

The initial publication date is prepared as September 13, 2026. If the first production deployment happens later, change `publishedAt` to that real date before publishing. `verifiedAt` records a factual check. Set an individual `updatedAt` only when the article content changes after publication. A source recheck alone must not change the sitemap or Article modification date.

## Verification

Run from `apps/api`:

```sh
rtk proxy pnpm run build
rtk proxy pnpm run typecheck
rtk proxy pnpm exec next start --hostname 127.0.0.1 --port 3002
rtk proxy node scripts/check-guides.mjs http://127.0.0.1:3002
```

The build runs 31 publishing tests before Next.js. They check unique topics and metadata, route coverage, headings, contents anchors, related links, dates, exact repeated paragraphs, invitation crawl exclusions and `llms.txt`. The HTTP check covers every article and generated OG image, canonical URLs, JSON-LD, H1 counts, sitemap inclusion, unknown-route 404, shared headers and download placements. `/llms.txt` is statically generated from the same guide registry and includes the product limitations and all 26 article links.

Visual review covered the shared header, article titles, tables, anchor offsets and download blocks at phone, tablet and desktop widths. Preserve the existing cream, navy, coral and yellow palette, logo and rounded components. Do not introduce a new visual system for the guides.

## Production handoff

The linked project is the existing Vercel `little-loop-api` project. No hosting migration is intended. The available Vercel CLI credential was rejected as invalid; no production deployment or Search Console submission was completed in this task.

After deployment:

1. Run the HTTP check against `https://www.littleloopapp.com`.
2. Submit `/sitemap.xml` through the verified Search Console property and inspect the three primary pages.
3. At 8-12 weeks, use actual non-brand impressions and queries to improve P0 pages.
4. At 3-6 months, check overlapping query coverage and merge pages where the same intent is competing with itself.

Keep Search Console access, submission and index status separate from the local build passing. An indexable page is not proof that Google has indexed it.
