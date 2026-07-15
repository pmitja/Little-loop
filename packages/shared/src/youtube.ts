/**
 * YouTube link parsing per PLAN §9: accept single-video URLs in all common
 * shapes, reject anything that isn't one video (playlists, channels, live,
 * search). Used by the app for instant client-side validation and by the API
 * as the authoritative parser.
 */

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

function isVideoId(value: string | null | undefined): value is string {
  return !!value && VIDEO_ID_RE.test(value);
}

/** Extract the 11-char video id from a pasted link, or null if it isn't a single-video URL. */
export function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const segments = parsed.pathname.split('/').filter(Boolean);

  if (host === 'youtu.be') {
    // https://youtu.be/{id}
    return segments.length >= 1 && isVideoId(segments[0]) ? segments[0] : null;
  }

  if (!YOUTUBE_HOSTS.has(host)) return null;

  const first = segments[0];

  // Not a single video: playlist page, channel, user, live listing, search.
  if (
    first === 'playlist' ||
    first === 'channel' ||
    first === 'user' ||
    first === 'c' ||
    first === 'results' ||
    first?.startsWith('@')
  ) {
    return null;
  }

  // https://youtube.com/watch?v={id} (also music.youtube.com)
  if (first === 'watch') {
    const v = parsed.searchParams.get('v');
    return isVideoId(v) ? v : null;
  }

  // https://youtube.com/shorts/{id}, /embed/{id}, /live/{id}, /v/{id}
  if ((first === 'shorts' || first === 'embed' || first === 'live' || first === 'v') && segments[1]) {
    return isVideoId(segments[1]) ? segments[1] : null;
  }

  return null;
}

const URL_IN_TEXT_RE = /https?:\/\/[^\s<>"']+/gi;

/**
 * Pull a video id out of shared text.
 *
 * extractYouTubeId needs the whole string to be one URL, which a paste always is
 * — but a share sheet hands over whatever the source app chose to put there, and
 * YouTube's includes the video title above the link. Scan for URLs instead of
 * demanding the text be one, so a real share still resolves.
 */
export function extractYouTubeIdFromText(text: string): string | null {
  const direct = extractYouTubeId(text);
  if (direct) return direct;
  for (const match of text.match(URL_IN_TEXT_RE) ?? []) {
    // Trailing punctuation belongs to the sentence, not the link.
    const id = extractYouTubeId(match.replace(/[.,)\]]+$/, ''));
    if (id) return id;
  }
  return null;
}

/** Canonical watch URL for a video id — what we hand to the preview endpoint. */
export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** Parse an ISO-8601 duration (YouTube contentDetails.duration) into seconds. */
export function parseIso8601Duration(duration: string): number | null {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration.trim());
  if (!match || (!match[1] && !match[2] && !match[3])) return null;
  const [, h, m, s] = match;
  return Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
}

/** 504 → "8:24"; 3915 → "1:05:15". */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/** 504 → "8 min 24 sec" (s09 subtitle). */
export function formatDurationLong(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  if (m === 0) return `${s} sec`;
  return s === 0 ? `${m} min` : `${m} min ${s} sec`;
}
