import { Platform } from 'react-native';
import * as Device from 'expo-device';
import type { ChildProfile, PlaylistVideo, VideoMeta } from '@littleloop/shared';
import { ApiError, apiRequest } from '@/lib/api';
import { getInstallId } from '@/lib/userSync';
import { useAppStore } from '@/stores/appStore';
import { useKidDeviceStore, type KidPairing } from '@/stores/kidDeviceStore';
import { usePlaylistStore } from '@/stores/playlistStore';
import { useRequestStore } from '@/stores/requestStore';
import { serverEndReason, useTimerStore, type SessionEndReason } from '@/stores/timerStore';
import { adoptServerRequests, type ServerRequest } from '@/features/family/requestSync';
import { clearKidToken, getKidToken, kidApi, setKidRevokedHandler, setKidToken } from './kidApi';

interface KidState {
  device: { id: string; name: string };
  childProfile: ChildProfile;
  playlist: {
    id: string;
    videos: { id: string; addedAt: string; video: VideoMeta }[];
  } | null;
  requests: ServerRequest[];
  secondsWatchedToday: number;
}

type PollResponse =
  | { status: 'pending'; expiresAt: string }
  | { status: 'expired' }
  | { status: 'paired'; device: { id: string; childProfileId: string; name: string } };

/**
 * Wipe everything this device knew about its child. Unpaired from a parent
 * phone (or child deleted) → back to the pairing screen; logged out here with
 * the PIN → back to sign-in, so the device can be used however the grown-up wants.
 */
export async function resetKidDevice(opts: { toSetup?: boolean } = {}): Promise<void> {
  const childId = useKidDeviceStore.getState().childProfileId;
  await clearKidToken();
  useTimerStore.getState().reconcile();
  if (childId) {
    usePlaylistStore.getState().removeChildData(childId);
    useRequestStore.getState().removeChildData(childId);
    useTimerStore.getState().removeChildData(childId);
  }
  useAppStore.getState().setChildProfiles([]);
  useKidDeviceStore.getState().reset(opts.toSetup ?? true);
}

/**
 * Log this kid device out with the parent PIN. The server checks the PIN (any
 * caregiver's) and unpairs the device; only then is local data wiped.
 */
export async function signOutKidDevice(pin: string): Promise<void> {
  await kidApi('/kid/sign-out', { method: 'POST', body: JSON.stringify({ pin }) });
  await resetKidDevice({ toSetup: false });
}

let resetting = false;
setKidRevokedHandler(() => {
  if (resetting || !useKidDeviceStore.getState().paired) return;
  resetting = true;
  void resetKidDevice().finally(() => {
    resetting = false;
  });
});

function deviceName(): string {
  const name = Device.deviceName ?? Device.modelName;
  if (name) return name.slice(0, 40);
  return Platform.OS === 'ios' ? 'iPhone or iPad' : 'Android device';
}

/** The link a parent phone's camera opens; +native-intent routes it to claiming. */
export function kidPairingLink(code: string): string {
  return `littleloop://pair?code=${code}`;
}

/** Open a pairing session; its secret is kept as the future device token. */
export async function startKidPairing(): Promise<KidPairing> {
  const { pairing } = await apiRequest<{
    pairing: KidPairing & { secret: string };
  }>(
    '/kid/pairing-sessions',
    {
      method: 'POST',
      body: JSON.stringify({
        installId: await getInstallId(),
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        deviceName: deviceName(),
      }),
    },
    {},
  );
  await setKidToken(pairing.secret);
  const open = { id: pairing.id, code: pairing.code, expiresAt: pairing.expiresAt };
  useKidDeviceStore.getState().setPairing(open);
  return open;
}

export type PairingStatus =
  | { status: 'pending' | 'expired' }
  | { status: 'paired'; device: { id: string; childProfileId: string } };

/**
 * One poll of the open pairing session. On 'paired' the stored secret is now
 * this device's token and the child's videos are pulled in; the switch into
 * kid mode waits for `activateKidDevice` so the grown-up sees the final step.
 */
export async function pollKidPairing(pairingId: string): Promise<PairingStatus> {
  const secret = getKidToken();
  if (!secret) return { status: 'expired' };
  let result: PollResponse;
  try {
    result = await apiRequest<PollResponse>(`/kid/pairing-sessions/${pairingId}`, undefined, {
      Authorization: `Bearer ${secret}`,
    });
  } catch (error) {
    if (error instanceof ApiError && error.code === 'PAIRING_NOT_FOUND') {
      return { status: 'expired' };
    }
    throw error;
  }
  if (result.status !== 'paired') return { status: result.status };
  await syncKidState();
  return { status: 'paired', device: result.device };
}

/** Hand the device over: from here on this install only runs kid mode. */
export function activateKidDevice(device: { id: string; childProfileId: string }): void {
  const childProfileId = useKidDeviceStore.getState().childProfileId ?? device.childProfileId;
  useKidDeviceStore.getState().setPaired({ id: device.id, childProfileId });
}

/**
 * Pull the child's profile, rules, playlist, requests and today's shared total
 * into the same stores the child screens already read.
 */
export async function syncKidState(): Promise<void> {
  let state: KidState;
  try {
    state = await kidApi<KidState>(
      `/kid/state?tzOffsetMinutes=${new Date().getTimezoneOffset()}`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.code === 'PREMIUM_REQUIRED') {
      useKidDeviceStore.getState().setPremiumBlocked(true);
      return;
    }
    throw error;
  }

  const child = state.childProfile;
  const previousChild = useKidDeviceStore.getState().childProfileId;
  if (previousChild && previousChild !== child.id) {
    // A parent moved this device to a different child: drop the old child's data.
    useTimerStore.getState().reconcile();
    usePlaylistStore.getState().removeChildData(previousChild);
    useRequestStore.getState().removeChildData(previousChild);
  }

  // Polled every minute: only write what changed, so the child screens don't
  // re-render (or the list jump) on every sync.
  const app = useAppStore.getState();
  if (JSON.stringify(app.childProfiles) !== JSON.stringify([child])) {
    app.setChildProfiles([child]);
  }
  if (app.activeChildProfileId !== child.id) app.setActiveChildProfileId(child.id);
  if (state.playlist) {
    const videos: PlaylistVideo[] = state.playlist.videos.map((entry) => ({
      id: entry.id,
      addedAt: entry.addedAt,
      status: 'live',
      video: entry.video,
    }));
    const playlists = usePlaylistStore.getState();
    const unchanged =
      playlists.playlistIdByChild[child.id] === state.playlist.id &&
      JSON.stringify(playlists.videosByChild[child.id] ?? []) === JSON.stringify(videos);
    if (!unchanged) playlists.setServerPlaylist(child.id, state.playlist.id, videos);
  }
  adoptServerRequests(child.id, state.requests);
  useTimerStore.getState().adoptServerSeconds(child.id, state.secondsWatchedToday);

  const kid = useKidDeviceStore.getState();
  if (previousChild !== child.id) kid.setChildProfileId(child.id);
  if (kid.premiumBlocked) kid.setPremiumBlocked(false);
}

// ── sync scheduling ────────────────────────────────────────────────────────

let lastSyncAt = 0;
let inFlight: Promise<void> | null = null;

/**
 * Sync only when the last one is older than `maxAgeMs`. Every trigger (launch,
 * foreground, leaving the player, idle timer) goes through here, so bursts of
 * events cost one request, not several.
 */
export function syncKidStateIfStale(maxAgeMs: number): Promise<void> {
  if (inFlight) return inFlight;
  if (Date.now() - lastSyncAt < maxAgeMs) return Promise.resolve();
  inFlight = syncKidState()
    .then(() => {
      lastSyncAt = Date.now();
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

// ── watch time ─────────────────────────────────────────────────────────────

/**
 * Report one finished viewing stretch — a single write. The device counts and
 * enforces time itself; the server only needs the total afterwards (Activity,
 * and today's total shared with the family's other devices).
 */
export async function reportKidSession(session: {
  id: string;
  startedAt: string;
  seconds: number;
  videoIds: string[];
  endReason: SessionEndReason | null;
  endedAt: string | null;
}): Promise<void> {
  if (!session.endedAt) return;
  await kidApi('/kid/watch-sessions', {
    method: 'POST',
    body: JSON.stringify({
      clientSessionId: session.id,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      totalSeconds: session.seconds,
      providerVideoIds: session.videoIds.slice(0, 200),
      endReason: session.endReason ? serverEndReason(session.endReason) : 'unknown',
    }),
  });
}
