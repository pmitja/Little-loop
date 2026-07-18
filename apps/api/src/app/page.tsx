import Image from 'next/image';
import { MarketingAnimations } from '@/components/MarketingAnimations';

const Check = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10.2 3.6 3.6L16 5.9" /></svg>
);

const Arrow = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" /></svg>
);

const Share = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 16V3m0 0L7.5 7.5M12 3l4.5 4.5M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
  </svg>
);

const Lock = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

const People = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="9" cy="8" r="3" /><path d="M3.5 19c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M16 5.5a3 3 0 0 1 0 5.8M16.5 14c2.3.5 3.6 2.1 4 5" />
  </svg>
);

const Clock = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);

const Play = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7 8 5-8 5V7Z" /></svg>
);

const Apple = () => (
  <svg className="store-logo apple-logo" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.05 12.54c-.03-2.73 2.23-4.06 2.33-4.12a5 5 0 0 0-3.94-2.13c-1.66-.18-3.28 1-4.12 1-.86 0-2.16-.98-3.56-.95a5.22 5.22 0 0 0-4.4 2.68c-1.91 3.3-.49 8.15 1.34 10.82.92 1.3 1.98 2.74 3.38 2.69 1.36-.06 1.87-.87 3.51-.87 1.63 0 2.11.87 3.53.84 1.47-.03 2.39-1.3 3.27-2.61a10.8 10.8 0 0 0 1.5-3.05 4.7 4.7 0 0 1-2.84-4.3ZM14.36 4.53A4.76 4.76 0 0 0 15.45 1a4.86 4.86 0 0 0-3.14 1.68 4.52 4.52 0 0 0-1.12 3.4 4.02 4.02 0 0 0 3.17-1.55Z" />
  </svg>
);

const GooglePlay = () => (
  <svg className="store-logo play-logo" viewBox="0 0 24 24" aria-hidden="true">
    <path className="play-blue" d="M3.6 2.1c-.38.4-.6 1-.6 1.75v16.3c0 .75.22 1.35.6 1.75L13.1 12 3.6 2.1Z" />
    <path className="play-green" d="m13.1 12 3.15-3.28L5.32 2.47A2.2 2.2 0 0 0 3.6 2.1L13.1 12Z" />
    <path className="play-yellow" d="m13.1 12-9.5 9.9c.45.47 1.15.56 1.72.24l10.94-6.25L13.1 12Z" />
    <path className="play-red" d="m20.18 10.96-3.92-2.24L13.1 12l3.16 3.89 3.92-2.24c1.1-.63 1.1-2.06 0-2.69Z" />
  </svg>
);

function StoreButtons({ centered = false }: { centered?: boolean }) {
  return (
    <div className={`store-buttons${centered ? ' store-buttons-centered' : ''}`}>
      <a className="store-badge" href="#early-access" aria-label="LittleLoop on the App Store — coming soon">
        <Apple />
        <span><small>Download on the</small><strong>App Store</strong></span>
      </a>
      <a className="store-badge" href="#early-access" aria-label="LittleLoop on Google Play — coming soon">
        <GooglePlay />
        <span><small>GET IT ON</small><strong>Google Play</strong></span>
      </a>
      <span className="store-coming-soon">Coming soon</span>
    </div>
  );
}

const Brand = () => (
  <span className="brand" aria-label="LittleLoop home">
    <Image
      className="brand-logo"
      src="/marketing/little-loop-logo.png"
      alt=""
      width={310}
      height={90}
      priority
    />
  </span>
);

function MiniVideo({ color, title, channel }: { color: string; title: string; channel: string }) {
  return (
    <div className="mini-video">
      <span className="mini-thumb" style={{ background: color }}><Play /></span>
      <span><strong>{title}</strong><small>{channel}</small></span>
      <span className="approved"><Check /> Approved</span>
    </div>
  );
}

export default function MarketingPage() {
  return (
    <main>
      <MarketingAnimations />
      <a className="skip-link" href="#content">Skip to content</a>

      <header className="site-header">
        <a href="#top" className="brand-link"><Brand /></a>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#family">For families</a>
          <a href="#safety">Safety</a>
        </nav>
        <a className="button button-small" href="#early-access">Get early access <Arrow /></a>
      </header>

      <section className="hero" id="top">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="hero-copy" id="content">
          <div className="eyebrow"><span className="status-dot" /> Built for little watchers. Controlled by you.</div>
          <h1>They tap.<br /><span>You choose</span> what comes next.</h1>
          <p className="hero-lede">
            Kids can click through videos faster than you can check them. LittleLoop replaces the
            endless feed with one calm playlist made entirely by you.
          </p>
          <div className="hero-actions">
            <a className="button" href="#how-it-works">See how it works <Arrow /></a>
            <a className="text-link" href="#safety"><span className="icon-circle"><Lock /></span> Why parents feel in control</a>
          </div>
          <StoreButtons />
          <div className="trust-row" aria-label="LittleLoop benefits">
            <span><Check /> No child search</span>
            <span><Check /> Parent PIN</span>
            <span><Check /> Your approved videos only</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="Preview of the LittleLoop parent app">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="float-note note-approved"><span><Check /></span><strong>6 videos</strong><small>chosen by you</small></div>
          <div className="float-note note-time"><span><Clock /></span><strong>25 min left</strong><small>for Mia today</small></div>
          <div className="phone">
            <div className="phone-speaker" />
            <div className="phone-screen">
              <div className="phone-top"><span>9:41</span><span>LittleLoop</span><span className="tiny-lock"><Lock /></span></div>
              <div className="profile-row">
                <span className="avatar"><Image src="/marketing/fox.png" alt="" width={64} height={64} priority /></span>
                <span><small>READY TO WATCH</small><strong>Mia&apos;s loop</strong><em>6 approved videos</em></span>
              </div>
              <div className="limit-card">
                <span className="limit-icon"><Clock /></span>
                <span><small>TODAY&apos;S TIME</small><strong>25 minutes left</strong></span>
                <span className="limit-pill">45 min</span>
              </div>
              <div className="phone-label"><strong>Approved for Mia</strong><span>See all</span></div>
              <MiniVideo color="linear-gradient(135deg,#BFE8F1,#67C9DD)" title="Tiny trains & big bridges" channel="Curious Kids" />
              <MiniVideo color="linear-gradient(135deg,#FFE9A3,#FFC93E)" title="Why do stars twinkle?" channel="Little Explorers" />
              <MiniVideo color="linear-gradient(135deg,#DDEFCF,#78C982)" title="A very sleepy bear" channel="Storytime" />
              <div className="child-mode-button"><Play /> Start child mode</div>
            </div>
          </div>
          <Image className="hero-bear" src="/marketing/bear.png" alt="LittleLoop bear character" width={190} height={190} priority />
        </div>
      </section>

      <section className="pain-section" id="safety">
        <div className="section-kicker light">THE REAL PROBLEM</div>
        <div className="pain-heading" data-reveal>
          <h2>You can&apos;t preview an<br /><span>endless feed.</span></h2>
          <p>
            YouTube Kids offers a huge world of video. But recommendations are still recommendations —
            not your personal choices. And most parents don&apos;t have time to verify every possible next tap.
          </p>
        </div>
        <div className="contrast-grid" data-stagger>
          <article className="contrast-card contrast-before" data-stagger-item>
            <div className="contrast-top"><span className="contrast-icon"><Play /></span><span>OPEN VIDEO FEED</span></div>
            <h3>“What did they click now?”</h3>
            <div className="feed-stack">
              <span className="feed-card feed-one" /><span className="feed-card feed-two" /><span className="feed-card feed-three" />
              <span className="feed-question">?</span>
            </div>
            <ul>
              <li><span>×</span> New suggestions keep appearing</li>
              <li><span>×</span> Every next tap needs another check</li>
              <li><span>×</span> “One more” can keep going</li>
            </ul>
          </article>
          <article className="contrast-card contrast-after" data-stagger-item>
            <div className="contrast-top"><span className="contrast-icon"><Lock /></span><span>THE LITTLELOOP WAY</span></div>
            <h3>“I chose every video here.”</h3>
            <div className="loop-stack">
              <span className="loop-video loop-blue"><Check /></span>
              <span className="loop-video loop-yellow"><Check /></span>
              <span className="loop-video loop-green"><Check /></span>
              <span className="loop-end"><Lock /></span>
            </div>
            <ul>
              <li><Check /> Only videos you added</li>
              <li><Check /> No search, comments or wandering</li>
              <li><Check /> Stops when their time is up</li>
            </ul>
          </article>
        </div>
        <p className="safety-note" data-reveal>LittleLoop is a parent-controlled player for approved video links. Videos play through an embedded approved source.</p>
      </section>

      <section className="steps-section" id="how-it-works">
        <div className="center-heading" data-reveal>
          <div className="section-kicker">SO SIMPLE IT BECOMES A HABIT</div>
          <h2>Find it once. Share it.<br />It&apos;s in their loop.</h2>
          <p>No copying long links. No rebuilding playlists. Just use the share button you already know.</p>
        </div>
        <div className="steps" data-stagger>
          <article className="step-card" data-stagger-item>
            <div className="step-number">1</div>
            <div className="step-visual browser-card">
              <div className="browser-bar"><i /><i /><i /></div>
              <div className="video-scene"><Play /></div>
              <span className="mock-button"><Share /> Share</span>
            </div>
            <h3>Find a video you trust</h3>
            <p>Preview it in the app you already use. When it feels right, tap Share.</p>
          </article>
          <article className="step-card featured-step" data-stagger-item>
            <div className="step-number">2</div>
            <div className="step-visual share-sheet">
              <span className="sheet-handle" />
              <strong>Share to…</strong>
              <div className="app-row">
                <span className="other-app" /><span className="other-app" />
                <span className="littleloop-app"><Image className="share-app-icon" src="/marketing/app-icon.png" alt="" width={54} height={54} /><small>LittleLoop</small></span>
                <span className="other-app" />
              </div>
            </div>
            <h3>Share it to LittleLoop</h3>
            <p>LittleLoop opens the video preview, ready for your quick approval.</p>
          </article>
          <article className="step-card" data-stagger-item>
            <div className="step-number">3</div>
            <div className="step-visual child-picker">
              <small>ADD TO A LOOP</small>
              <div><span className="picker-avatar fox"><Image src="/marketing/fox.png" alt="" width={56} height={56} /></span><strong>Mia</strong><Check /></div>
              <div><span className="picker-avatar dino"><Image src="/marketing/dino.png" alt="" width={56} height={56} /></span><strong>Leo</strong><span className="empty-check" /></div>
              <span className="mock-button">Add approved video</span>
            </div>
            <h3>Choose who can watch</h3>
            <p>Add it to one child or several. Their loops stay separate and personal.</p>
          </article>
        </div>
      </section>

      <section className="features-section" id="family">
        <div className="features-heading" data-reveal>
          <div><div className="section-kicker">ONE FAMILY. ONE CALMER SYSTEM.</div><h2>Control that fits real family life.</h2></div>
          <p>Different kids need different rules. And caring for them is rarely a one-person job.</p>
        </div>
        <div className="feature-grid" data-stagger>
          <article className="feature-card family-card" data-stagger-item>
            <span className="feature-icon coral"><People /></span>
            <h3>Caregivers stay in sync</h3>
            <p>Invite a partner, grandparent or babysitter. Everyone can add approved videos and see the same family setup.</p>
            <div className="caregiver-visual">
              <span className="caregiver main"><Image src="/marketing/bear.png" alt="" width={72} height={72} /><i>YOU</i></span>
              <span className="connection-line"><i /><i /><i /></span>
              <span className="caregiver"><Image src="/marketing/fox.png" alt="" width={72} height={72} /></span>
              <span className="caregiver"><Image src="/marketing/bunny.png" alt="" width={72} height={72} /></span>
              <span className="invite-badge"><Check /> Family updated</span>
            </div>
          </article>
          <article className="feature-card profiles-card" data-stagger-item>
            <span className="feature-icon sky"><Clock /></span>
            <h3>A limit for each child</h3>
            <p>Give Mia 30 minutes and Leo 45. Each profile gets its own videos, timer and watch activity.</p>
            <div className="profile-limits">
              <div><span className="picker-avatar fox"><Image src="/marketing/fox.png" alt="" width={52} height={52} /></span><span><strong>Mia</strong><small>30 minutes daily</small></span><em>30m</em></div>
              <div><span className="picker-avatar dino"><Image src="/marketing/dino.png" alt="" width={52} height={52} /></span><span><strong>Leo</strong><small>45 minutes daily</small></span><em>45m</em></div>
              <div><span className="picker-avatar bunny"><Image src="/marketing/bunny.png" alt="" width={52} height={52} /></span><span><strong>Nora</strong><small>20 minutes daily</small></span><em>20m</em></div>
            </div>
          </article>
          <article className="feature-card lock-card" data-stagger-item>
            <span className="feature-icon yellow"><Lock /></span>
            <h3>A child mode that stays child mode</h3>
            <p>No search bar. No links out. No settings to change. Leaving the loop takes your parent PIN.</p>
            <div className="pin-visual"><span>•</span><span>•</span><span>•</span><span>•</span><i><Lock /></i></div>
          </article>
          <article className="feature-card activity-card" data-stagger-item>
            <span className="feature-icon green"><Play /></span>
            <h3>See what actually played</h3>
            <p>A simple activity view shows what they watched and how much of today&apos;s time they used.</p>
            <div className="activity-bars"><span style={{ height: '42%' }} /><span style={{ height: '65%' }} /><span style={{ height: '34%' }} /><span style={{ height: '82%' }} /><span style={{ height: '55%' }} /><span className="today" style={{ height: '72%' }} /><i>Today</i></div>
          </article>
        </div>
      </section>

      <section className="promise-section" data-reveal>
        <Image src="/marketing/star.png" alt="LittleLoop star character" width={160} height={160} />
        <div>
          <div className="section-kicker">THE LITTLELOOP PROMISE</div>
          <blockquote>“If it&apos;s not in the loop,<br />they can&apos;t tap into it.”</blockquote>
          <p>A small, understandable world of video — made by the person who knows them best.</p>
        </div>
        <div className="promise-list">
          <span><Check /> Parent-approved videos</span><span><Check /> Separate child profiles</span><span><Check /> Daily time limits</span><span><Check /> Shared caregiver access</span>
        </div>
      </section>

      <section className="final-cta" id="early-access">
        <div className="final-cloud cloud-one" /><div className="final-cloud cloud-two" />
        <Image className="cta-character" src="/marketing/rocket.png" alt="LittleLoop rocket character" width={220} height={220} />
        <div className="section-kicker">COMING SOON</div>
        <h2>Less wondering.<br />More <span>“I chose that.”</span></h2>
        <p>LittleLoop is getting ready for families who want a calmer, more intentional way to watch.</p>
        <StoreButtons centered />
        <a className="early-access-link" href="mailto:hello@littleloopapp.com?subject=LittleLoop%20early%20access">Or ask for early access <Arrow /></a>
        <small>For parents and caregivers · iOS &amp; Android</small>
      </section>

      <footer>
        <a href="#top" className="brand-link"><Brand /></a>
        <p>Small loops. Big peace of mind.</p>
        <div><a href="/privacy">Privacy</a><a href="mailto:hello@littleloopapp.com">Contact</a><span>© 2026 LittleLoop</span></div>
      </footer>
    </main>
  );
}
