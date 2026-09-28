import Image from 'next/image';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { MarketingAnimations } from '@/components/MarketingAnimations';
import {
  KidHomeScreen,
  LimitsSheet,
  PasteScreen,
  Phone,
  PinScreen,
  PlayerScreen,
  RequestNotification,
  RequestScreen,
  SafetyPill,
  TimesUpScreen,
} from '@/components/home/AppScreens';
import { APP_STORE_URL } from '@/content/site';
import './home.css';

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.littleloopapp.com' },
};

const Check = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10.2 3.6 3.6L16 5.9" /></svg>
);

const Arrow = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" /></svg>
);

const Chevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d={dir === 'left' ? 'M15 5 8 12l7 7' : 'm9 5 7 7-7 7'} /></svg>
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

const Tablet = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="3" /><path d="M11 18.5h2" /></svg>
);

const Bars = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V11M12 20V5M19 20v-6" /></svg>
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
      <a className="store-badge" href={APP_STORE_URL} aria-label="Download LittleLoop on the App Store">
        <Apple />
        <span><small>Download on the</small><strong>App Store</strong></span>
      </a>
      <span className="store-badge store-badge-disabled" aria-label="LittleLoop on Google Play, coming soon">
        <GooglePlay />
        <span><small>GET IT ON</small><strong>Google Play</strong></span>
      </span>
      <span className="store-coming-soon">Android coming soon</span>
    </div>
  );
}

const Brand = () => (
  <span className="brand" aria-label="LittleLoop home">
    <Image className="brand-logo" src="/marketing/little-loop-logo.png" alt="" width={310} height={90} />
  </span>
);

type Step = {
  id?: string;
  problem: string;
  title: ReactNode;
  body: string;
  label: string;
  screen: ReactNode;
  overlay?: ReactNode;
};

// Headlines and body copy were ranked with Jev (marketing/script-studio) for
// clarity, pull and brand fit. The problem lines match the App Store screenshots.
const STEPS: Step[] = [
  {
    problem: 'One video turns into twenty',
    title: <>Every &ldquo;up next&rdquo; is one you already checked.</>,
    body: 'Every video in the queue is one you added. Nothing sneaks in, and nothing plays on its own.',
    label: 'LittleLoop player: the up-next list shows only videos picked by a grown-up.',
    screen: <PlayerScreen />,
  },
  {
    problem: 'An evening of setup and settings',
    title: <>No settings maze. Paste a link and it&apos;s added.</>,
    body: 'Copy a video link and paste it in, or tap Share in YouTube. You see the preview, tap add, and it’s in their playlist.',
    label: 'Parent playlist screen: a pasted YouTube link shows a preview and an add button.',
    screen: <PasteScreen />,
  },
  {
    problem: '“Just one more!” arguments',
    title: <>&ldquo;One more&rdquo; becomes a request, not a fight.</>,
    body: 'Kids tap a heart when they want more. The request lands on your phone, and you choose Approve or Not now.',
    label: 'Child taps a heart for more ducks; the parent gets a notification to approve.',
    screen: <RequestScreen />,
    overlay: <RequestNotification />,
  },
  {
    problem: 'Screen time ends in tears',
    title: <>When time&apos;s up, the app is the bad guy. Not you.</>,
    body: 'Set a daily limit, a bedtime and school hours. When time runs out, LittleLoop says a friendly goodbye so you don’t have to.',
    label: 'All done for today screen, with daily time, bedtime and school hour settings.',
    screen: <TimesUpScreen />,
    overlay: <LimitsSheet />,
  },
  {
    id: 'safety',
    problem: 'Little fingers find the settings',
    title: <>Only your PIN gets them out of kid mode.</>,
    body: 'Leaving child mode takes your PIN or Face ID. Inside, there’s no search, no comments and no links out, and every button is sized for small hands.',
    label: 'Grown-ups only PIN screen for leaving child mode.',
    screen: <PinScreen />,
    overlay: <SafetyPill />,
  },
];

const PERKS = [
  'No search bar',
  'No suggestions',
  'No autoplay',
  'No comments',
  'Daily time limits',
  'Bedtime',
  'School hours',
  'PIN-locked exit',
  'Shared with caregivers',
];

export default function MarketingPage() {
  return (
    <main>
      <MarketingAnimations />

      <section className="hero" id="top">
        <div className="hero-blob hero-blob-one" />
        <div className="hero-blob hero-blob-two" />
        <div className="hero-copy">
          <div className="eyebrow">A video player for kids, run by you</div>
          <h1>
            No autoplay.<br /> No rabbit holes.<br /> <span className="hl">Just your playlist.</span>
          </h1>
          <p className="hero-lede">
            Paste in the videos you&apos;ve checked. Your child gets a simple player that plays those and
            nothing else, until their time is up.
          </p>
          <div className="hero-actions">
            <a className="button" href={APP_STORE_URL}>Download on the App Store <Arrow /></a>
            <a className="text-link" href="#how-it-works">See how it works</a>
          </div>
          <div className="trust-row" aria-label="LittleLoop benefits">
            <span><Check /> No search</span>
            <span><Check /> No suggestions</span>
            <span><Check /> Parent PIN</span>
          </div>
        </div>

        <div className="hero-visual">
          <Image className="hero-char hero-star" src="/marketing/star.png" alt="" width={140} height={140} priority />
          <Image className="hero-char hero-rocket" src="/marketing/rocket.png" alt="" width={130} height={130} priority />
          <div className="chip chip-picked"><span><Check /></span><strong>Picked by you</strong></div>
          <div className="chip chip-time"><span><Clock /></span><strong>28 min left today</strong></div>
          <Phone
            className="hero-device"
            label="LittleLoop kid home screen: Hi, Mia! with 28 minutes left and Five Little Ducks ready to keep watching."
            layers={[<KidHomeScreen key="home" />]}
          />
        </div>
      </section>

      <div className="perk-band" aria-label="What LittleLoop includes">
        <div className="perk-track">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1 ? true : undefined}>
              {PERKS.map((perk) => <li key={perk}>{perk}</li>)}
            </ul>
          ))}
        </div>
      </div>

      <section className="story" id="how-it-works" data-step="0">
        <div className="story-intro" data-reveal>
          <div className="section-kicker">How it works</div>
          <h2>Five <span className="nowrap">screen-time</span> headaches. Five quiet fixes.</h2>
        </div>

        <div className="story-nav">
          <div className="story-nav-dots">
            {STEPS.map((step, i) => (
              <button
                key={i}
                type="button"
                data-go={i}
                aria-label={`Step ${i + 1}: ${step.problem}`}
                aria-current={i === 0 ? 'step' : undefined}
              />
            ))}
          </div>
          <div className="story-nav-arrows">
            <button type="button" data-dir="-1" aria-label="Previous step"><Chevron dir="left" /></button>
            <button type="button" data-dir="1" aria-label="Next step"><Chevron dir="right" /></button>
          </div>
        </div>

        <div className="story-body">
          <ol className="story-steps">
            {STEPS.map((step, i) => (
              <li className="story-step" id={step.id} data-step={i} key={i}>
                <div className="story-text">
                  <span className="story-num">{String(i + 1).padStart(2, '0')}</span>
                  <p className="problem">{step.problem}</p>
                  <h3>{step.title}</h3>
                  <p className="story-body-copy">{step.body}</p>
                </div>
                <Phone className="step-device" label={step.label} layers={[step.screen]} overlays={[step.overlay]} />
              </li>
            ))}
          </ol>

          <div className="story-stage" aria-hidden="true">
            <div className="story-sticky">
              <Phone
                className="stage-device"
                label="LittleLoop app screens"
                layers={STEPS.map((step) => step.screen)}
                overlays={STEPS.map((step) => step.overlay)}
              />
              <div className="story-dots">
                {STEPS.map((_, i) => <i key={i} data-dot={i} className={i === 0 ? 'is-active' : ''} />)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="family" id="family">
        <div className="family-heading" data-reveal>
          <div className="section-kicker">For the whole family</div>
          <h2>Grandma, the sitter and you, all on the same page.</h2>
          <p>Different kids need different rules. And caring for them is rarely a one-person job.</p>
        </div>
        <div className="family-grid" data-stagger>
          <article className="fam-card fam-caregivers" data-stagger-item>
            <span className="fam-icon coral"><People /></span>
            <h3>Caregivers stay in sync</h3>
            <p>Invite a partner, grandparent or babysitter. Everyone can add approved videos and sees the same family setup.</p>
            <div className="caregiver-visual">
              <span className="caregiver main"><Image src="/marketing/bear.png" alt="" width={84} height={84} /><i>YOU</i></span>
              <span className="connection-line"><i /><i /><i /></span>
              <span className="caregiver"><Image src="/marketing/fox.png" alt="" width={70} height={70} /></span>
              <span className="caregiver"><Image src="/marketing/bunny.png" alt="" width={70} height={70} /></span>
            </div>
          </article>
          <article className="fam-card fam-limits" data-stagger-item>
            <span className="fam-icon sky"><Clock /></span>
            <h3>A limit for each child</h3>
            <p>Give Mia 30 minutes and Leo 45. Each child gets their own playlist, timer and watch history.</p>
            <div className="profile-limits">
              <div><span className="picker-avatar fox"><Image src="/marketing/fox.png" alt="" width={44} height={44} /></span><strong>Mia</strong><em>30 min</em></div>
              <div><span className="picker-avatar dino"><Image src="/marketing/dino.png" alt="" width={44} height={44} /></span><strong>Leo</strong><em>45 min</em></div>
            </div>
          </article>
          <article className="fam-card fam-device" data-stagger-item>
            <span className="fam-icon yellow"><Tablet /></span>
            <h3>Their tablet, run from your phone</h3>
            <p>Pair your child&apos;s own phone or tablet. It opens in kid mode, and you manage everything from yours.</p>
            <div className="pair-visual">
              <span className="pair-tablet">
                <span className="pair-screen">
                  <span className="pair-avatar"><Image src="/marketing/fox.png" alt="" width={40} height={40} /></span>
                  <strong>Mia&apos;s tablet</strong>
                  <small><Lock /> Kid mode</small>
                </span>
              </span>
              <span className="connection-line"><i /><i /><i /><i /></span>
              <span className="pair-phone"><span><Check /></span></span>
            </div>
          </article>
          <article className="fam-card fam-activity" data-stagger-item>
            <span className="fam-icon green"><Bars /></span>
            <h3>See what actually played</h3>
            <p>A simple activity view shows what they watched and how much of today&apos;s time they used.</p>
            <div className="activity-bars"><span style={{ height: '42%' }} /><span style={{ height: '65%' }} /><span style={{ height: '34%' }} /><span style={{ height: '82%' }} /><span style={{ height: '55%' }} /><span className="today" style={{ height: '72%' }} /></div>
            <div className="activity-days" aria-hidden="true"><i>Mon</i><i>Tue</i><i>Wed</i><i>Thu</i><i>Fri</i><i>Today</i></div>
          </article>
        </div>
        <p className="safety-note" data-reveal>
          <Lock /> LittleLoop plays approved videos through YouTube&apos;s embedded player. It isn&apos;t affiliated with YouTube or Google.
        </p>
      </section>

      <section className="final-cta" id="early-access">
        <Image className="cta-char cta-bunny" src="/marketing/bunny.png" alt="" width={170} height={170} />
        <Image className="cta-char cta-dino" src="/marketing/dino.png" alt="" width={150} height={150} />
        <div className="section-kicker">Available on the App Store</div>
        <h2>Pick five videos.<br /> Set a timer. Hand it over.</h2>
        <p>Tonight, they watch only what you picked.</p>
        <StoreButtons centered />
        <small>For iPhone and iPad</small>
      </section>

      <footer>
        <a href="#top" className="brand-link"><Brand /></a>
        <p>Small loops. Big peace of mind.</p>
        <div><a href="/guides">Guides</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="mailto:hello@littleloopapp.com">Contact</a><span>© 2026 LittleLoop</span></div>
      </footer>
    </main>
  );
}
