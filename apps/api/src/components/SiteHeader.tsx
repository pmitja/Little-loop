import Image from 'next/image';
import Link from 'next/link';
import { APP_STORE_URL } from '@/content/site';

export function SiteHeader() {
  return (
    <header className="site-header-shell">
      <div className="site-header">
        <Link href="/" className="brand-link" aria-label="LittleLoop home">
          <Image className="brand-logo" src="/marketing/little-loop-logo.png" alt="LittleLoop" width={310} height={90} priority />
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#family">For families</Link>
          <Link href="/#safety">Safety</Link>
          <Link href="/guides" className="guides-nav-link">Guides</Link>
        </nav>
        <a className="button button-small" href={APP_STORE_URL} aria-label="Download LittleLoop on the App Store">Download app</a>
      </div>
    </header>
  );
}
