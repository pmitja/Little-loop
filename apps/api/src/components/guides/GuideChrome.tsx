import Image from 'next/image';
import Link from 'next/link';
import styles from './guides.module.css';

export function GuideFooter() {
  return (
    <footer className={styles.footer}>
      <Link href="/" className={styles.brand} aria-label="LittleLoop home">
        <Image src="/marketing/little-loop-logo.png" alt="LittleLoop" width={310} height={90} />
      </Link>
      <p>Parent-controlled video, without the endless feed.</p>
      <div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:hello@littleloopapp.com">Contact</a></div>
    </footer>
  );
}
