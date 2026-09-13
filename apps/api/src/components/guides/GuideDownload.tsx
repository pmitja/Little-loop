import Image from 'next/image';
import { APP_STORE_URL } from '@/content/site';
import styles from './guides.module.css';

export function GuideDownload() {
  return (
    <aside className={styles.download} aria-label="Download LittleLoop">
      <div className={styles.downloadIntro}>
        <Image src="/marketing/star.png" alt="" width={92} height={92} />
        <h2>Your videos.<br /><span>Their LittleLoop.</span></h2>
      </div>
      <p>Choose the videos first. Give your child a player with no open search or recommendation feed.</p>
      <a className="button" href={APP_STORE_URL}>Download app</a>
      <p className={styles.availability}>For iPhone and iPad. Android coming soon.</p>
      <p className={styles.downloadNote}>Parents review and add the content. Playback uses the official YouTube embed, so ads may appear. LittleLoop is not affiliated with Google or YouTube.</p>
    </aside>
  );
}
