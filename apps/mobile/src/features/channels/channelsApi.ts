import type { VideoMeta } from '@littleloop/shared';
import { api, ApiError, apiConfigured } from '@/lib/api';

export interface ApprovedChannel {
  id: string;
  channelId: string;
  channelTitle: string;
  lastPulledAt: string | null;
}

export interface PendingVideo {
  id: string;
  publishedAt: string | null;
  channelTitle: string;
  video: VideoMeta;
}

/** Approve a whole channel; returns recent uploads (most-viewed first) to add now. */
export async function approveChannel(childProfileId: string, providerVideoId: string) {
  return api<{ channel: ApprovedChannel; suggestions: VideoMeta[] }>('/channels', {
    method: 'POST',
    body: JSON.stringify({ childProfileId, providerVideoId }),
  });
}

export function channelApprovalErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Check your connection and try again.';

  switch (error.code) {
    case 'PREMIUM_REQUIRED':
      return 'Your subscription is still syncing. Wait a moment and try again.';
    case 'VIDEO_UNAVAILABLE':
      return 'We couldn’t identify this video’s channel. Try another video from the same channel.';
    case 'QUOTA_EXCEEDED':
    case 'PROVIDER_ERROR':
      return 'YouTube is temporarily unavailable. Please try again later.';
    case 'UNAUTHENTICATED':
      return 'Your session has expired. Sign in again and retry.';
    default:
      return error.status === 0
        ? 'Check your connection and try again.'
        : 'The server couldn’t approve this channel. Please try again.';
  }
}

export async function listChannels(childProfileId: string): Promise<ApprovedChannel[]> {
  if (!apiConfigured()) return [];
  const { channels } = await api<{ channels: ApprovedChannel[] }>(
    `/channels?childProfileId=${encodeURIComponent(childProfileId)}`,
  );
  return channels;
}

export async function removeChannel(channelId: string): Promise<void> {
  await api(`/channels/${channelId}`, { method: 'DELETE' });
}

export async function listPendingVideos(childProfileId: string): Promise<PendingVideo[]> {
  if (!apiConfigured()) return [];
  const { pending } = await api<{ pending: PendingVideo[] }>(
    `/pending-videos?childProfileId=${encodeURIComponent(childProfileId)}`,
  );
  return pending;
}

export async function approvePending(pendingId: string) {
  return api<{ approved: boolean; video: VideoMeta }>(`/pending-videos/${pendingId}`, {
    method: 'POST',
  });
}

export async function rejectPending(pendingId: string): Promise<void> {
  await api(`/pending-videos/${pendingId}`, { method: 'DELETE' });
}
