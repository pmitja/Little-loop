import type { Metadata } from 'next';

import { SITE_URL } from './site';
export { SITE_URL, APP_STORE_URL } from './site';

export type GuidePriority = 'P0' | 'P1' | 'P2';
export type GuideCluster = 'YouTube settings' | 'Devices' | 'Choosing a setup' | 'Family habits';

export interface GuideSource {
  title: string;
  url: string;
  publisher: string;
}

export interface GuideMeta {
  slug: string;
  title: string;
  description: string;
  primaryQuery: string;
  priority: GuidePriority;
  cluster: GuideCluster;
  publishedAt: string;
  verifiedAt: string;
  updatedAt?: string;
  relatedSlugs: string[];
  sources: GuideSource[];
}

const publishedAt = '2026-09-13';
const verifiedAt = '2026-09-13';

const sources = {
  sharing: {
    title: 'Block and share content on YouTube Kids',
    url: 'https://support.google.com/youtubekids/answer/7178746?hl=en',
    publisher: 'YouTube Help',
  },
  supervised: {
    title: 'Parental controls for supervised YouTube accounts',
    url: 'https://support.google.com/youtubekids/answer/13877231?hl=en',
    publisher: 'YouTube Help',
  },
  timer: {
    title: 'Limit screen time on YouTube Kids',
    url: 'https://support.google.com/youtubekids/answer/6130558?hl=en',
    publisher: 'YouTube Help',
  },
  controls: {
    title: 'Parental controls for YouTube Kids profiles',
    url: 'https://support.google.com/youtubekids/answer/6172308?hl=en',
    publisher: 'YouTube Help',
  },
  content: {
    title: 'What videos are available in YouTube Kids',
    url: 'https://support.google.com/youtubekids/answer/6172307?hl=en',
    publisher: 'YouTube Help',
  },
  options: {
    title: 'Understand YouTube and YouTube Kids options for your child',
    url: 'https://support.google.com/families/answer/10495678?hl=en',
    publisher: 'Google for Families',
  },
  familyLink: {
    title: "Manage your child's screen time",
    url: 'https://support.google.com/families/answer/7103340?hl=en',
    publisher: 'Google for Families',
  },
  appLimits: {
    title: "Set app time limits on your child's device",
    url: 'https://support.google.com/families/answer/15957417?hl=en',
    publisher: 'Google for Families',
  },
  guidedAccess: {
    title: 'Lock iPhone to one app with Guided Access',
    url: 'https://support.apple.com/guide/iphone/lock-iphone-to-one-app-with-guided-access-iph7fad0d10/ios',
    publisher: 'Apple Support',
  },
  screenTime: {
    title: "Set schedules with Screen Time on a family member's device",
    url: 'https://support.apple.com/guide/iphone/set-up-screen-time-for-a-family-member-iph7f15d92dd/ios',
    publisher: 'Apple Support',
  },
  healthyChildren: {
    title: 'Screen time and temper tantrums',
    url: 'https://www.healthychildren.org/English/family-life/Media/Pages/screen-time-and-temper-tantrums-helpful-tips-for-parents.aspx',
    publisher: 'American Academy of Pediatrics',
  },
  littleLoopTerms: {
    title: 'LittleLoop Terms of Use',
    url: `${SITE_URL}/terms`,
    publisher: 'LittleLoop',
  },
  safeTube: {
    title: 'SafeTube product information',
    url: 'https://www.playsafetube.com/',
    publisher: 'SafeTube',
  },
  whitelistVideo: {
    title: 'WhitelistVideo product information',
    url: 'https://whitelist.video/',
    publisher: 'WhitelistVideo',
  },
  pbs: {
    title: 'PBS KIDS Video',
    url: 'https://pbskids.org/apps/pbs-kids-video.html',
    publisher: 'PBS KIDS',
  },
  netflix: {
    title: 'How to create a profile for kids',
    url: 'https://help.netflix.com/en/node/114275',
    publisher: 'Netflix Help Center',
  },
} satisfies Record<string, GuideSource>;

function guide(meta: Omit<GuideMeta, 'publishedAt' | 'verifiedAt'>): GuideMeta {
  return { ...meta, publishedAt, verifiedAt };
}

export const GUIDES: GuideMeta[] = [
  guide({
    slug: 'control-what-child-watches-on-youtube',
    title: 'How to control what your child watches on YouTube, every realistic option',
    description: 'A practical comparison of YouTube Kids settings, device controls, approved-only players and simple ways to supervise viewing without another app.',
    primaryQuery: 'how to control what my child watches on youtube', priority: 'P0', cluster: 'Choosing a setup',
    relatedSlugs: ['stop-youtube-autoplay-for-kids', 'youtube-kids-approved-content-only', 'apps-to-control-what-kids-watch'],
    sources: [sources.controls, sources.content, sources.options],
  }),
  guide({
    slug: 'stop-youtube-autoplay-for-kids',
    title: 'How to stop YouTube autoplay for kids, and what it does not fix',
    description: 'Turn off autoplay so a child cannot switch it back on, then deal separately with search, recommendations and daily viewing time.',
    primaryQuery: 'how to stop youtube autoplay for kids', priority: 'P0', cluster: 'YouTube settings',
    relatedSlugs: ['stop-youtube-recommendations-for-kids', 'youtube-time-limit-for-kids', 'turn-off-youtube-kids-search'],
    sources: [sources.controls, sources.options],
  }),
  guide({
    slug: 'youtube-time-limit-for-kids',
    title: 'How to set a YouTube time limit that actually stops playback',
    description: 'Compare the YouTube Kids timer, Apple Screen Time, Google Family Link and playlist limits so the stopping point matches your family rule.',
    primaryQuery: 'youtube time limit for kids', priority: 'P0', cluster: 'Family habits',
    relatedSlugs: ['stop-youtube-autoplay-for-kids', 'end-screen-time-without-tantrum', 'control-youtube-on-android'],
    sources: [sources.timer, sources.familyLink, sources.appLimits, sources.screenTime],
  }),
  guide({
    slug: 'youtube-kids-approved-content-only',
    title: 'How to use Approved Content Only on YouTube Kids',
    description: 'Set up YouTube Kids so your child sees only videos, channels and collections you choose, with the important limits explained.',
    primaryQuery: 'youtube kids approved content only', priority: 'P0', cluster: 'YouTube settings',
    relatedSlugs: ['approved-content-only-not-working', 'block-videos-and-channels-on-youtube-kids', 'share-youtube-video-with-child'],
    sources: [sources.controls, sources.content],
  }),
  guide({
    slug: 'block-videos-and-channels-on-youtube-kids',
    title: 'How to block videos and channels on YouTube Kids',
    description: 'Block one video or an entire channel, understand where the block applies and know when an approved-only list is less work.',
    primaryQuery: 'how to block youtube channels for kids', priority: 'P0', cluster: 'YouTube settings',
    relatedSlugs: ['youtube-kids-approved-content-only', 'turn-off-youtube-kids-search', 'approved-content-only-not-working'],
    sources: [sources.sharing, sources.controls, sources.content],
  }),
  guide({
    slug: 'turn-off-youtube-kids-search',
    title: 'How to turn off YouTube Kids search, and what remains visible',
    description: 'Disable search from the parent settings and understand why recommendations and verified channels may still appear afterward.',
    primaryQuery: 'how to turn off search on youtube kids', priority: 'P0', cluster: 'YouTube settings',
    relatedSlugs: ['youtube-kids-approved-content-only', 'stop-youtube-recommendations-for-kids', 'control-what-child-watches-on-youtube'],
    sources: [sources.controls, sources.content],
  }),
  guide({
    slug: 'apps-to-control-what-kids-watch',
    title: 'Apps that let parents control what their children watch',
    description: 'An honest guide to filters, monitoring tools and approved-only video players, including what each type controls and what it leaves open.',
    primaryQuery: 'app to control what my kid watches', priority: 'P0', cluster: 'Choosing a setup',
    relatedSlugs: ['control-what-child-watches-on-youtube', 'youtube-kids-alternatives', 'safe-youtube-without-youtube-kids'],
    sources: [sources.options, sources.safeTube, sources.whitelistVideo, sources.littleLoopTerms],
  }),
  guide({
    slug: 'stop-youtube-recommendations-for-kids',
    title: 'How to stop unwanted YouTube recommendations for your child',
    description: 'Pause history, reset recommendations and choose a stricter content model when changing the recommendation signals is not enough.',
    primaryQuery: 'how to stop youtube recommendations for kids', priority: 'P0', cluster: 'YouTube settings',
    relatedSlugs: ['reset-youtube-kids-recommendations', 'stop-youtube-autoplay-for-kids', 'youtube-kids-approved-content-only'],
    sources: [sources.controls, sources.content],
  }),
  guide({
    slug: 'see-child-youtube-watch-history',
    title: "How to see your child's YouTube watch history",
    description: "Find the child's recent YouTube viewing, learn which device you need and understand the gaps that history cannot answer.",
    primaryQuery: 'how to see what my child watches on youtube', priority: 'P1', cluster: 'YouTube settings',
    relatedSlugs: ['reset-youtube-kids-recommendations', 'control-what-child-watches-on-youtube', 'apps-to-control-what-kids-watch'],
    sources: [sources.supervised, sources.options, sources.controls],
  }),
  guide({
    slug: 'reset-youtube-kids-recommendations',
    title: 'How to reset YouTube Kids recommendations and pause history',
    description: 'Clear old watch and search signals, pause new history and decide whether recommendations should remain part of the experience.',
    primaryQuery: 'reset youtube kids recommendations', priority: 'P1', cluster: 'YouTube settings',
    relatedSlugs: ['stop-youtube-recommendations-for-kids', 'see-child-youtube-watch-history', 'turn-off-youtube-kids-search'],
    sources: [sources.controls, sources.content],
  }),
  guide({
    slug: 'share-youtube-video-with-child',
    title: "How to share a YouTube video with a child's YouTube Kids profile",
    description: 'Send a video or channel from a linked parent account to YouTube Kids, then check what the child can open from their profile.',
    primaryQuery: 'share youtube video to youtube kids', priority: 'P1', cluster: 'YouTube settings',
    relatedSlugs: ['youtube-kids-approved-content-only', 'parent-curated-youtube-playlist', 'approved-content-only-not-working'],
    sources: [sources.sharing, sources.controls, sources.content],
  }),
  guide({
    slug: 'youtube-family-link-parental-controls',
    title: 'What Family Link can and cannot control on YouTube',
    description: 'A plain account of Family Link content levels, autoplay, history and screen-time controls, plus the limits parents often discover later.',
    primaryQuery: 'youtube family link parental controls', priority: 'P1', cluster: 'Devices',
    relatedSlugs: ['control-youtube-on-android', 'youtube-kids-vs-supervised-account', 'youtube-time-limit-for-kids'],
    sources: [sources.options, sources.familyLink, sources.appLimits],
  }),
  guide({
    slug: 'youtube-kids-vs-supervised-account',
    title: 'YouTube Kids vs a supervised YouTube account',
    description: 'Compare catalog size, age settings, search, blocking and parent control before moving a child from YouTube Kids to regular YouTube.',
    primaryQuery: 'youtube kids vs supervised account', priority: 'P1', cluster: 'Choosing a setup',
    relatedSlugs: ['youtube-family-link-parental-controls', 'youtube-kids-alternatives', 'safe-youtube-without-youtube-kids'],
    sources: [sources.options, sources.controls, sources.content],
  }),
  guide({
    slug: 'block-youtube-shorts-for-kids',
    title: 'How to block or limit YouTube Shorts for kids',
    description: 'Learn which YouTube experiences expose Shorts, which controls only reduce them and which setups remove the Shorts feed entirely.',
    primaryQuery: 'how to block youtube shorts for kids', priority: 'P1', cluster: 'YouTube settings',
    relatedSlugs: ['safe-youtube-without-youtube-kids', 'apps-to-control-what-kids-watch', 'youtube-kids-vs-supervised-account'],
    sources: [sources.supervised, sources.sharing, sources.options],
  }),
  guide({
    slug: 'make-youtube-safer-on-iphone-ipad',
    title: 'How to make YouTube safer on an iPhone or iPad',
    description: 'Combine the right YouTube account, Apple Screen Time and Guided Access instead of expecting one switch to control content and device use.',
    primaryQuery: 'make youtube safe for kids on iphone', priority: 'P1', cluster: 'Devices',
    relatedSlugs: ['lock-ipad-to-one-app-for-child', 'youtube-time-limit-for-kids', 'control-what-child-watches-on-youtube'],
    sources: [sources.controls, sources.screenTime, sources.guidedAccess],
  }),
  guide({
    slug: 'control-youtube-on-android',
    title: 'How to control YouTube on Android with Family Link',
    description: 'Set content levels, app limits and downtime on Android, then decide whether the available YouTube controls are specific enough.',
    primaryQuery: 'make youtube safe for kids on android', priority: 'P1', cluster: 'Devices',
    relatedSlugs: ['youtube-family-link-parental-controls', 'youtube-time-limit-for-kids', 'youtube-kids-vs-supervised-account'],
    sources: [sources.options, sources.familyLink, sources.appLimits],
  }),
  guide({
    slug: 'lock-youtube-on-smart-tv-for-kids',
    title: 'How to lock YouTube on a smart TV with a parent code',
    description: 'Protect adult profiles, guest viewing and account changes on the television, then add a separate rule for what children may watch.',
    primaryQuery: 'lock youtube on smart tv for kids', priority: 'P1', cluster: 'Devices',
    relatedSlugs: ['control-what-child-watches-on-youtube', 'youtube-time-limit-for-kids', 'no-app-ways-to-control-what-child-watches'],
    sources: [sources.controls, sources.options],
  }),
  guide({
    slug: 'approved-content-only-not-working',
    title: 'Approved Content Only missing or not working, fixes and alternatives',
    description: 'Check the profile, account link, app and device when Approved Content Only is missing, empty or behaving differently than expected.',
    primaryQuery: 'youtube kids approved content only not working', priority: 'P2', cluster: 'YouTube settings',
    relatedSlugs: ['youtube-kids-approved-content-only', 'share-youtube-video-with-child', 'youtube-kids-alternatives'],
    sources: [sources.controls, sources.content, sources.options],
  }),
  guide({
    slug: 'is-youtube-kids-safe',
    title: 'Is YouTube Kids safe? What its filters actually do',
    description: 'A measured look at YouTube Kids filters, age bands, parent approval, search, ads and the decisions that still remain with families.',
    primaryQuery: 'is youtube kids safe', priority: 'P2', cluster: 'Choosing a setup',
    relatedSlugs: ['youtube-kids-approved-content-only', 'youtube-kids-alternatives', 'control-what-child-watches-on-youtube'],
    sources: [sources.content, sources.controls, sources.options],
  }),
  guide({
    slug: 'safe-youtube-without-youtube-kids',
    title: 'How to make YouTube safer without using YouTube Kids',
    description: 'Compare supervised YouTube, shared-screen viewing, device limits and approved-only players for children who do not use YouTube Kids.',
    primaryQuery: 'safe youtube for kids without youtube kids', priority: 'P2', cluster: 'Choosing a setup',
    relatedSlugs: ['youtube-kids-vs-supervised-account', 'block-youtube-shorts-for-kids', 'no-app-ways-to-control-what-child-watches'],
    sources: [sources.options, sources.guidedAccess, sources.whitelistVideo],
  }),
  guide({
    slug: 'ad-free-youtube-for-kids',
    title: 'Ad-free YouTube for kids, what is and is not possible',
    description: 'Separate YouTube-served ads from sponsorships inside videos and compare Premium, other video libraries and approved-only players honestly.',
    primaryQuery: 'ad free youtube for kids', priority: 'P2', cluster: 'Choosing a setup',
    relatedSlugs: ['youtube-kids-alternatives', 'is-youtube-kids-safe', 'apps-to-control-what-kids-watch'],
    sources: [sources.controls, sources.content, sources.littleLoopTerms],
  }),
  guide({
    slug: 'parent-curated-youtube-playlist',
    title: 'How to build a parent-curated YouTube playlist for your child',
    description: 'Choose a small set of videos, order it around a clear stopping point and avoid treating a normal YouTube playlist as a child lock.',
    primaryQuery: 'parent curated youtube playlist for kids', priority: 'P2', cluster: 'Family habits',
    relatedSlugs: ['share-youtube-video-with-child', 'stop-youtube-autoplay-for-kids', 'no-app-ways-to-control-what-child-watches'],
    sources: [sources.controls, sources.content, sources.littleLoopTerms],
  }),
  guide({
    slug: 'lock-ipad-to-one-app-for-child',
    title: 'How to keep a child inside one video app with Guided Access',
    description: 'Use Guided Access to keep an iPhone or iPad in one app, set a time limit and understand why app locking does not select safe videos.',
    primaryQuery: 'lock ipad to one app for child', priority: 'P2', cluster: 'Devices',
    relatedSlugs: ['make-youtube-safer-on-iphone-ipad', 'youtube-time-limit-for-kids', 'control-what-child-watches-on-youtube'],
    sources: [sources.guidedAccess, sources.screenTime],
  }),
  guide({
    slug: 'end-screen-time-without-tantrum',
    title: 'How to end screen time without turning off a video halfway through',
    description: 'Use visible stopping points, short warnings and calm follow-through to make the end of a viewing session less arbitrary for a child.',
    primaryQuery: 'end screen time without tantrum', priority: 'P2', cluster: 'Family habits',
    relatedSlugs: ['youtube-time-limit-for-kids', 'parent-curated-youtube-playlist', 'stop-youtube-autoplay-for-kids'],
    sources: [sources.healthyChildren, sources.familyLink, sources.screenTime],
  }),
  guide({
    slug: 'youtube-kids-alternatives',
    title: 'YouTube Kids alternatives, apps, streaming libraries and no-app options',
    description: 'A candid comparison of YouTube Kids alternatives, including approved-only players, fixed libraries, device controls and parent-led viewing.',
    primaryQuery: 'youtube kids alternative', priority: 'P2', cluster: 'Choosing a setup',
    relatedSlugs: ['apps-to-control-what-kids-watch', 'safe-youtube-without-youtube-kids', 'no-app-ways-to-control-what-child-watches'],
    sources: [sources.options, sources.safeTube, sources.whitelistVideo, sources.pbs, sources.netflix, sources.littleLoopTerms],
  }),
  guide({
    slug: 'no-app-ways-to-control-what-child-watches',
    title: 'No-app ways to control what your child watches',
    description: 'Use a shared screen, one preselected video and a physical handoff rule when another parental-control app would add more work than value.',
    primaryQuery: 'control what child watches without app', priority: 'P2', cluster: 'Family habits',
    relatedSlugs: ['control-what-child-watches-on-youtube', 'parent-curated-youtube-playlist', 'youtube-kids-alternatives'],
    sources: [sources.controls, sources.guidedAccess, sources.healthyChildren],
  }),
];

export function getGuide(slug: string): GuideMeta {
  const item = GUIDES.find((guideItem) => guideItem.slug === slug);
  if (!item) throw new Error(`Unknown guide: ${slug}`);
  return item;
}

export function getGuideMetadata(slug: string): Metadata {
  const item = getGuide(slug);
  const url = `${SITE_URL}/guides/${item.slug}`;
  const image = `${SITE_URL}/guides/og/${item.slug}`;
  return {
    title: item.title,
    description: item.description,
    alternates: { canonical: url },
    authors: [{ name: 'LittleLoop team', url: SITE_URL }],
    openGraph: {
      title: item.title,
      description: item.description,
      type: 'article',
      url,
      siteName: 'LittleLoop',
      publishedTime: item.publishedAt,
      modifiedTime: item.updatedAt ?? item.publishedAt,
      authors: ['LittleLoop team'],
      images: [{ url: image, width: 1200, height: 630, alt: item.title }],
    },
    twitter: { card: 'summary_large_image', title: item.title, description: item.description, images: [image] },
  };
}

export function guidesByCluster() {
  return (['YouTube settings', 'Devices', 'Choosing a setup', 'Family habits'] as const).map((cluster) => ({
    cluster,
    guides: GUIDES.filter((item) => item.cluster === cluster),
  }));
}
