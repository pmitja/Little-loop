import Link from 'next/link';
import type { ReactNode } from 'react';
import { APP_STORE_URL, getGuide, SITE_URL } from '@/content/guides';
import { GuideFooter } from './GuideChrome';
import { GuideDownload } from './GuideDownload';
import styles from './guides.module.css';

export interface TocItem {
  id: string;
  label: string;
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${value}T00:00:00Z`));
}

export function GuideArticle({
  slug,
  toc,
  children,
}: {
  slug: string;
  toc: TocItem[];
  children: ReactNode;
}) {
  const guide = getGuide(slug);
  const related = guide.relatedSlugs.map(getGuide);
  const url = `${SITE_URL}/guides/${guide.slug}`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    image: `${SITE_URL}/guides/og/${guide.slug}`,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt ?? guide.publishedAt,
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: 'LittleLoop team', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'LittleLoop', url: SITE_URL },
  };
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/guides` },
      { '@type': 'ListItem', position: 3, name: guide.title, item: url },
    ],
  };

  return (
    <>
      <main id="guide-content" className={styles.page}>
        <article>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/guides">Guides</Link>
          </nav>
          <header className={styles.articleHeader}>
            <span className={styles.cluster}>{guide.cluster}</span>
            <h1>{guide.title}</h1>
            <p className={styles.dek}>{guide.description}</p>
            <div className={styles.byline}>
              <span>By LittleLoop team</span>
              <span>Published {displayDate(guide.publishedAt)}</span>
              {guide.updatedAt ? <span>Updated {displayDate(guide.updatedAt)}</span> : null}
              <span>Checked {displayDate(guide.verifiedAt)}</span>
            </div>
            <p className={styles.disclosure}>Written by the team that makes LittleLoop, one of the options discussed in these guides. Instructions and comparisons use the sources below; provider descriptions are not independent product testing.</p>
          </header>

          <div className={styles.articleGrid}>
            <aside className={styles.toc} aria-label="On this page">
              <strong>On this page</strong>
              <ol>{toc.map((item) => <li key={item.id}><a href={`#${item.id}`}>{item.label}</a></li>)}</ol>
              <div className={styles.sidebarDownload}>
                <p>Want to choose the videos yourself?</p>
                <a className="button button-small" href={APP_STORE_URL}>Download app</a>
                <small>iPhone and iPad.<br />Android coming soon.</small>
              </div>
            </aside>
            <div className={`${styles.prose} guide-body`}>
              {children}

              <section className={styles.sources} aria-labelledby="sources-heading">
                <h2 id="sources-heading">Sources checked</h2>
                <ul>{guide.sources.map((source) => <li key={source.url}><a href={source.url}>{source.title}</a><span>{source.publisher}</span></li>)}</ul>
              </section>
            </div>
          </div>
        </article>

        <GuideDownload />

        <section className={styles.related} aria-labelledby="related-heading">
          <p className={styles.cluster}>Keep going</p>
          <h2 id="related-heading">Related guides</h2>
          <div>{related.map((item) => <Link href={`/guides/${item.slug}`} key={item.slug}><span>{item.cluster}</span><strong>{item.title}</strong></Link>)}</div>
        </section>
      </main>
      <GuideFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, '\\u003c') }} />
    </>
  );
}
