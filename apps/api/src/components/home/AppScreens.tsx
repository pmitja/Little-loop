import Image from 'next/image';
import type { ReactNode } from 'react';

/*
 * HTML recreations of the LittleLoop app screens, drawn on a 300px-wide phone.
 * They are decorative: each Phone carries one aria-label and hides its insides.
 *
 * Elements with an `a-*` class animate when their layer becomes active (see
 * MarketingAnimations). Without JavaScript or with reduced motion they simply
 * sit in their final state.
 */

const Chevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={dir === 'left' ? 'M15 5 8 12l7 7' : 'm9 5 7 7-7 7'} />
  </svg>
);

const Heart = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="heart">
    <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.7 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.9 1.3-1.8 2.9-2.9 4.9-2.9 3.5 0 5.4 3.5 4.3 6.6-1.7 4.8-9.2 9.4-9.2 9.4Z" />
  </svg>
);

const PlayTri = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="play-tri"><path d="M8 5.5v13l10.5-6.5L8 5.5Z" /></svg>
);

const Tick = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10.2 3.6 3.6L16 5.9" /></svg>
);

const Shield = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3 5 5.8v5.4c0 4.4 3 8.2 7 9.8 4-1.6 7-5.4 7-9.8V5.8L12 3Z" />
    <circle cx="12" cy="11" r="1.6" /><path d="M12 12.6v2.6" />
  </svg>
);

function StatusBar({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`status${dark ? ' status-dark' : ''}`}>
      <span>9:41</span>
      <span className="island" />
      <span className="battery"><i /></span>
    </div>
  );
}

function Char({ name, size }: { name: string; size: number }) {
  return <Image src={`/marketing/${name}.png`} alt="" width={size} height={size} className="char" />;
}

function Icon({ name, size }: { name: string; size: number }) {
  return <Image src={`/marketing/icon-${name}.png`} alt="" width={size} height={size} className="app-icon-tile" />;
}

/* Kid home: "Hi, Mia!" with the timer and the video to keep watching. */
export function KidHomeScreen() {
  return (
    <div className="scr scr-home">
      <StatusBar />
      <div className="home-hello a-rise">
        <span className="home-avatar"><Char name="fox" size={64} /></span>
        <strong>Hi, Mia!</strong>
      </div>
      <div className="home-timer a-rise" style={{ animationDelay: '.08s' }}>
        <Icon name="time" size={40} />
        <span className="timer-track"><i className="a-fill" /></span>
        <b>28 min</b>
      </div>
      <div className="home-card a-pop" style={{ animationDelay: '.18s' }}>
        <div className="home-thumb">
          <span className="pill-keep">KEEP WATCHING</span>
          <span className="round-heart"><Heart /></span>
          <span className="home-bunny a-bob"><Char name="bunny" size={110} /></span>
          <span className="big-play"><PlayTri /></span>
          <span className="thumb-progress"><i /></span>
        </div>
        <strong>Five Little Ducks</strong>
      </div>
      <div className="home-arrows">
        <span><Chevron dir="left" /></span>
        <span><Chevron dir="right" /></span>
      </div>
    </div>
  );
}

/* Player with the up-next queue: every entry was picked by a grown-up. */
export function PlayerScreen() {
  return (
    <div className="scr scr-player">
      <StatusBar dark />
      <div className="player-top">
        <span className="player-back"><Chevron dir="left" /></span>
        <span className="player-time"><Icon name="time" size={26} /> 28 min left</span>
      </div>
      <div className="player-video"><span className="a-bob"><Char name="bunny" size={112} /></span></div>
      <div className="player-title">
        <strong>Five Little Ducks</strong>
        <span className="round-heart"><Heart /></span>
      </div>
      <div className="player-bar"><i className="a-grow" /></div>
      <div className="player-times"><span>1:14</span><span>3:05</span></div>
      <small className="player-label">UP NEXT IN MIA&apos;S PLAYLIST</small>
      <div className="next-row next-row-picked a-slide" style={{ animationDelay: '.25s' }}>
        <span className="next-thumb" style={{ background: '#E2EEFB' }}><Char name="rocket" size={44} /></span>
        <span><strong>Wheels on the Bus</strong><em><Tick /> Picked by your grown-up</em></span>
      </div>
      <div className="next-row a-slide" style={{ animationDelay: '.4s' }}>
        <span className="next-thumb" style={{ background: '#ECE6F7' }}><Char name="star" size={40} /></span>
        <span><strong>Twinkle, Twinkle</strong><em><Tick /> Picked by your grown-up</em></span>
      </div>
    </div>
  );
}

/* Parent playlist: paste a link, see the preview, add it. */
export function PasteScreen() {
  return (
    <div className="scr scr-paste">
      <StatusBar />
      <strong className="paste-title">Mia&apos;s playlist</strong>
      <small className="paste-meta">6 live · 1 waiting</small>
      <div className="paste-box">
        <div className="paste-head">
          <Icon name="add-video" size={40} />
          <span><strong>Paste a YouTube link</strong><em>or share from the YouTube app</em></span>
        </div>
        <div className="paste-input"><span className="a-type">youtube.com/watch?v=q1Xk…</span><i className="caret" /></div>
        <div className="paste-preview a-pop" style={{ animationDelay: '1.35s' }}>
          <span className="next-thumb" style={{ background: '#DDF1E1' }}><Char name="dino" size={44} /></span>
          <span><strong>Dino Dance Party</strong><em>Sing-Along Studio · 2:41</em></span>
          <span className="ok-dot a-pop" style={{ animationDelay: '1.6s' }}><Tick /></span>
        </div>
        <div className="paste-button a-press" style={{ animationDelay: '1.9s' }}>Add to Mia&apos;s playlist</div>
      </div>
      <strong className="paste-sub">Live for Mia</strong>
      <div className="paste-list">
        <div><span className="next-thumb" style={{ background: '#FDE3DC' }}><Char name="bunny" size={36} /></span><span><strong>Five Little Ducks</strong><em>3:05 · watched 4 times</em></span></div>
        <div><span className="next-thumb" style={{ background: '#E2EEFB' }}><Char name="rocket" size={36} /></span><span><strong>Wheels on the Bus</strong><em>2:48 · watched 2 times</em></span></div>
      </div>
    </div>
  );
}

/* Kid "Want more?" hearts. Pairs with RequestNotification. */
export function RequestScreen() {
  return (
    <div className="scr scr-request">
      <StatusBar />
      <strong className="req-title">Want more?</strong>
      <small className="req-sub">Tap a heart. We&apos;ll tell your grown-up.</small>
      <div className="req-card">
        <span className="req-char" style={{ background: '#FDE3DC' }}><Char name="bunny" size={62} /></span>
        <strong>More ducks</strong>
        <span className="req-heart req-heart-on a-tap"><Heart /></span>
      </div>
      <div className="req-card">
        <span className="req-char" style={{ background: '#E2EEFB' }}><Char name="rocket" size={62} /></span>
        <strong>More buses</strong>
        <span className="req-heart"><Heart /></span>
      </div>
      <div className="req-card">
        <span className="req-char" style={{ background: '#ECE6F7' }}><Char name="star" size={56} /></span>
        <strong>More stars</strong>
        <span className="req-heart"><Heart /></span>
      </div>
    </div>
  );
}

export function RequestNotification() {
  return (
    <div className="notif a-drop" style={{ animationDelay: '.75s' }}>
      <div className="notif-row">
        <Image className="notif-icon" src="/marketing/app-icon.png" alt="" width={44} height={44} />
        <span><strong>Mia asked for more ducks</strong><em>2 new videos from Sing-Along Studio</em></span>
        <small>now</small>
      </div>
      <div className="notif-actions">
        <span className="notif-approve"><Tick /> Approve</span>
        <span className="notif-later">Not now</span>
      </div>
    </div>
  );
}

/* Friendly end-of-day screen. Pairs with LimitsSheet. */
export function TimesUpScreen() {
  return (
    <div className="scr scr-done">
      <StatusBar />
      <div className="done-halo a-pop"><span className="a-bob"><Char name="star" size={120} /></span></div>
      <strong className="done-title">All done for today, Mia!</strong>
      <small className="done-sub">The videos will be waiting for you tomorrow.</small>
    </div>
  );
}

export function LimitsSheet() {
  return (
    <div className="sheet a-sheet" style={{ animationDelay: '.5s' }}>
      <div><Icon name="time" size={36} /><strong>Daily time</strong><b>45 min</b></div>
      <div><Icon name="weekend" size={36} /><strong>Bedtime</strong><b>7:30 PM</b></div>
      <div><Icon name="school" size={36} /><strong>School hours</strong><b>8 AM – 3 PM</b></div>
    </div>
  );
}

/* PIN gate to leave child mode. Pairs with SafetyPill. */
export function PinScreen() {
  return (
    <div className="scr scr-pin">
      <StatusBar />
      <span className="pin-art a-pop"><Image src="/marketing/pin-safe.png" alt="" width={120} height={120} /></span>
      <strong className="pin-title">Grown-ups only</strong>
      <small className="pin-sub">Enter your PIN to leave Child Mode</small>
      <div className="pin-dots">
        <i className="a-dot" style={{ animationDelay: '.45s' }} />
        <i className="a-dot" style={{ animationDelay: '.75s' }} />
        <i />
        <i />
      </div>
      <div className="pin-pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => <span key={n}>{n}</span>)}
      </div>
    </div>
  );
}

export function SafetyPill() {
  return (
    <div className="safety-pill a-rise" style={{ animationDelay: '.6s' }}>
      <span><Shield /></span>
      No search · No comments · No links out
    </div>
  );
}

/**
 * A phone frame. `layers` are stacked screens; only the active one shows.
 * `overlays` (same order) sit outside the screen so they can overhang the frame.
 */
export function Phone({
  label,
  layers,
  overlays = [],
  active = 0,
  className = '',
}: {
  label: string;
  layers: ReactNode[];
  overlays?: ReactNode[];
  active?: number;
  className?: string;
}) {
  return (
    <div className={`device ${className}`} role="img" aria-label={label}>
      <div className="device-inner" aria-hidden="true">
        <div className="phone-frame">
          <div className="phone-screen">
            {layers.map((layer, i) => (
              <div key={i} className={`layer${i === active ? ' is-active' : ''}`} data-layer={i}>{layer}</div>
            ))}
          </div>
        </div>
        {overlays.map((overlay, i) =>
          overlay ? (
            <div key={i} className={`overlay layer${i === active ? ' is-active' : ''}`} data-layer={i}>{overlay}</div>
          ) : null,
        )}
      </div>
    </div>
  );
}
