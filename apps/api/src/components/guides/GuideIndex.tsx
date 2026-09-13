import Link from 'next/link';
import { guidesByCluster } from '@/content/guides';
import { GuideFooter } from './GuideChrome';
import { GuideDownload } from './GuideDownload';
import { APP_STORE_URL } from '@/content/site';
import styles from './guides.module.css';

export function GuideIndex() {
  return (
    <>
      <main id="guides" className={styles.indexPage}>
        <header className={styles.indexIntro}>
          <span className={styles.cluster}>LittleLoop guides</span>
          <h1>A little help with<br />what they watch.</h1>
          <p>YouTube settings are scattered across apps, accounts and devices. These guides explain what each control changes, what it leaves open and when a simpler family rule works better.</p>
          <div className={styles.indexDownload}>
            <a className="button" href={APP_STORE_URL}>Download app</a>
            <span>LittleLoop for iPhone and iPad.<br />Android coming soon.</span>
          </div>
        </header>
        {guidesByCluster().map(({ cluster, guides }) => (
          <section className={styles.guideGroup} key={cluster} aria-labelledby={`group-${cluster.replaceAll(' ', '-').toLowerCase()}`}>
            <header><h2 id={`group-${cluster.replaceAll(' ', '-').toLowerCase()}`}>{cluster}</h2><span>{guides.length} guides</span></header>
            <div className={styles.guideGrid}>
              {guides.map((guide) => (
                <Link href={`/guides/${guide.slug}`} key={guide.slug}>
                  <span>{guide.cluster}</span>
                  <h3>{guide.title}</h3>
                  <p>{guide.description}</p>
                  <strong>Read guide <span aria-hidden="true">→</span></strong>
                </Link>
              ))}
            </div>
          </section>
        ))}
        <GuideDownload />
      </main>
      <GuideFooter />
    </>
  );
}
