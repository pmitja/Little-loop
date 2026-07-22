import type { ChildProfile } from '@littleloop/shared';
import { api, apiConfigured } from '@/lib/api';
import { useRequestStore, type WatchRequest } from '@/stores/requestStore';

interface ServerRequest {
  id: string;
  childProfileId: string;
  kind: WatchRequest['kind'];
  channelTitle?: string;
  thumbnailUrl?: string;
  sampleVideoId?: string;
  status: WatchRequest['status'];
  createdAt: string;
}

interface RaiseOptions {
  channelTitle?: string;
  thumbnailUrl?: string;
  sampleVideoId?: string;
}

/** The coalescing key: one pending 'more' per child, one pending row per channel. */
function coalesceKey(req: Pick<WatchRequest, 'kind' | 'channelTitle'>): string {
  return req.kind === 'more' ? 'more' : `channel:${req.channelTitle ?? ''}`;
}

function toStoreRequest(req: ServerRequest): WatchRequest {
  return {
    id: req.id,
    childProfileId: req.childProfileId,
    kind: req.kind,
    channelTitle: req.channelTitle,
    thumbnailUrl: req.thumbnailUrl,
    sampleVideoId: req.sampleVideoId,
    createdAt: req.createdAt,
    status: req.status,
  };
}

/**
 * Pull each child's shared request queue and merge it into the local store so
 * every caregiver's device sees the same "want more" cards (the playlist syncs
 * the same way). Server pending rows are the truth; local pending requests that
 * haven't reached the server yet (raised offline) are kept, deduped by the same
 * coalescing key so the merge can't create a visible duplicate.
 */
export async function syncFamilyRequests(profiles: ChildProfile[]): Promise<void> {
  if (!apiConfigured() || profiles.length === 0) return;
  await Promise.all(
    profiles.map(async (profile) => {
      const { requests } = await api<{ requests: ServerRequest[] }>(
        `/requests?childProfileId=${encodeURIComponent(profile.id)}`,
      );
      const serverRequests = requests.map(toStoreRequest);
      const serverKeys = new Set(serverRequests.map(coalesceKey));
      const localUnsynced = (
        useRequestStore.getState().requestsByChild[profile.id] ?? []
      ).filter((r) => r.status === 'pending' && !serverKeys.has(coalesceKey(r)));
      useRequestStore
        .getState()
        .setServerRequests(profile.id, [...serverRequests, ...localUnsynced]);
    }),
  );
}

/** POST a request to the shared queue; failures are swallowed (offline stays local-only). */
async function pushRequest(
  childProfileId: string,
  kind: WatchRequest['kind'],
  opts: RaiseOptions,
): Promise<void> {
  if (!apiConfigured()) return;
  try {
    await api('/requests', {
      method: 'POST',
      body: JSON.stringify({ childProfileId, kind, ...opts }),
    });
  } catch {
    // Best-effort: the local optimistic copy is already in the store; the next
    // syncFamilyRequests reconciles.
  }
}

/** Raise a request locally (optimistic) and share it to the family queue. */
export function raiseRequestAndSync(
  childProfileId: string,
  kind: WatchRequest['kind'],
  opts: RaiseOptions = {},
): void {
  useRequestStore.getState().addRequest(childProfileId, kind, opts);
  void pushRequest(childProfileId, kind, opts);
}

/**
 * Toggle a heart. On a new like this raises the same shared 'channel' request
 * the parent approves; un-liking only clears the local heart (matching prior
 * behaviour — a raised request isn't retracted). Returns the new liked state.
 */
export function toggleLikeAndSync(
  childProfileId: string,
  video: { providerVideoId: string; channelTitle?: string; thumbnailUrl?: string },
): boolean {
  const nowLiked = useRequestStore.getState().toggleLike(childProfileId, video);
  if (nowLiked) {
    void pushRequest(childProfileId, 'channel', {
      channelTitle: video.channelTitle,
      thumbnailUrl: video.thumbnailUrl,
      sampleVideoId: video.providerVideoId,
    });
  }
  return nowLiked;
}

/** Resolve a request locally and on the shared queue (dismiss / channel approved). */
export function resolveSharedRequest(childProfileId: string, requestId: string): void {
  useRequestStore.getState().resolveRequest(childProfileId, requestId);
  if (!apiConfigured()) return;
  // Locally-only requests (offline, never pushed) 404 here — harmless.
  void api(`/requests/${requestId}`, { method: 'DELETE' }).catch(() => {});
}
