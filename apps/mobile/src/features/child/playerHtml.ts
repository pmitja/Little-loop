/**
 * Local document hosting the YouTube IFrame Player API against youtube-nocookie
 * (PLAN §9). All chrome is disabled — native controls drive the player through
 * `llCommand` (injected JS) and events come back over ReactNativeWebView.postMessage.
 */

/** Loaded with `baseUrl: PLAYER_ORIGIN` so the embed gets a stable origin. */
export const PLAYER_ORIGIN = 'https://player.littleloopapp.com';

export type PlayerEvent =
  | { type: 'ready'; duration: number }
  | { type: 'state'; state: number }
  | { type: 'time'; current: number; duration: number }
  | { type: 'error'; code: number };

/** YT.PlayerState values we care about. */
export const YT_STATE = {
  ended: 0,
  playing: 1,
  paused: 2,
  buffering: 3,
} as const;

export function buildPlayerHtml(videoId: string): string {
  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  html, body { margin: 0; padding: 0; background: #000; height: 100%; overflow: hidden; }
  #player { position: absolute; inset: 0; width: 100%; height: 100%; }
</style>
</head>
<body>
<div id="player"></div>
<script>
  var player = null;
  function post(msg) {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  }
  var tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.body.appendChild(tag);
  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player('player', {
      host: 'https://www.youtube-nocookie.com',
      videoId: ${JSON.stringify(videoId)},
      width: '100%',
      height: '100%',
      playerVars: {
        playsinline: 1,
        autoplay: 1,
        rel: 0,
        controls: 0,
        modestbranding: 1,
        fs: 0,
        disablekb: 1,
        iv_load_policy: 3,
        origin: ${JSON.stringify(PLAYER_ORIGIN)}
      },
      events: {
        onReady: function () {
          post({ type: 'ready', duration: player.getDuration() || 0 });
          player.playVideo();
        },
        onStateChange: function (e) { post({ type: 'state', state: e.data }); },
        onError: function (e) { post({ type: 'error', code: e.data }); }
      }
    });
  };
  setInterval(function () {
    if (player && player.getCurrentTime) {
      post({ type: 'time', current: player.getCurrentTime() || 0, duration: player.getDuration() || 0 });
    }
  }, 500);
  // Command channel for the native controls; injected via webviewRef.injectJavaScript.
  window.llCommand = function (cmd, arg) {
    if (!player) return;
    if (cmd === 'play') player.playVideo();
    else if (cmd === 'pause') player.pauseVideo();
    else if (cmd === 'load') {
      if (arg && typeof arg === 'object') {
        player.loadVideoById({ videoId: arg.videoId, startSeconds: Number(arg.startSeconds) || 0 });
      } else {
        player.loadVideoById(arg);
      }
    }
    else if (cmd === 'seek') player.seekTo(Number(arg) || 0, true);
  };
</script>
</body>
</html>`;
}

/** Hosts the WebView may talk to for the embed to function; everything else is blocked. */
const ALLOWED_HOST_SUFFIXES = [
  'youtube-nocookie.com',
  'youtube.com',
  'ytimg.com',
  'googlevideo.com',
  'gstatic.com',
  'google.com',
  'doubleclick.net', // embeds may serve ads; blocking their frames breaks playback
  'littleloopapp.com',
];

export function isAllowedPlayerUrl(url: string): boolean {
  if (url === 'about:blank' || url.startsWith('data:')) return true;
  try {
    const host = new URL(url).hostname;
    return ALLOWED_HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`));
  } catch {
    return false;
  }
}
