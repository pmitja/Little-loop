import type { ChildProfile, PlaylistVideo, VideoMeta } from '@littleloop/shared';
import { api, ApiError, apiConfigured } from '@/lib/api';
import { usePlaylistStore, type AddVideoResult } from '@/stores/playlistStore';

interface ServerPlaylist {
  id: string;
  childProfileId: string;
}

interface ServerPlaylistVideo {
  id: string;
  addedAt?: string;
  video: VideoMeta;
}

export async function syncFamilyPlaylists(profiles: ChildProfile[]): Promise<void> {
  if (!apiConfigured() || profiles.length === 0) return;
  await Promise.all(
    profiles.map(async (profile) => {
      const { playlists } = await api<{ playlists: ServerPlaylist[] }>(
        `/playlists?childProfileId=${encodeURIComponent(profile.id)}`,
      );
      const playlist = playlists[0];
      if (!playlist) return;
      const { videos } = await api<{ videos: ServerPlaylistVideo[] }>(
        `/playlists/${playlist.id}/videos`,
      );
      const serverVideos: PlaylistVideo[] = videos.map((entry) => ({
        id: entry.id,
        addedAt: entry.addedAt ?? new Date().toISOString(),
        status: 'live',
        video: entry.video,
      }));
      const serverProviderIds = new Set(
        serverVideos.map((entry) => entry.video.providerVideoId),
      );

      // Review entries currently live only in the persisted device store. A
      // server refresh must therefore merge them into the approved server
      // playlist instead of replacing the whole local list. Drop a review
      // entry if that same video is now on the server (it was approved on
      // another path/device) so the merge cannot create a duplicate.
      const localReviewVideos = (
        usePlaylistStore.getState().videosByChild[profile.id] ?? []
      ).filter(
        (entry) =>
          entry.status === 'review' &&
          !serverProviderIds.has(entry.video.providerVideoId),
      );
      usePlaylistStore.getState().setServerPlaylist(
        profile.id,
        playlist.id,
        [...serverVideos, ...localReviewVideos],
      );
    }),
  );
}

export async function commitApprovedVideo(
  childProfileId: string,
  video: VideoMeta,
  localEntryId?: string,
): Promise<AddVideoResult> {
  const store = usePlaylistStore.getState();
  if (!apiConfigured()) {
    if (localEntryId) {
      store.setVideoStatus(childProfileId, localEntryId, 'live');
      return 'added';
    }
    return store.addVideo(childProfileId, video, 'live');
  }
  let playlistId = store.playlistIdByChild[childProfileId];
  if (!playlistId) {
    const { playlists } = await api<{ playlists: ServerPlaylist[] }>(
      `/playlists?childProfileId=${encodeURIComponent(childProfileId)}`,
    );
    playlistId = playlists[0]?.id;
    if (playlistId) {
      store.setServerPlaylist(
        childProfileId,
        playlistId,
        store.videosByChild[childProfileId] ?? [],
      );
    }
  }
  if (!playlistId) return 'limit';
  try {
    const { playlistVideo } = await api<{
      playlistVideo: { id: string; video: VideoMeta };
    }>(`/playlists/${playlistId}/videos`, {
      method: 'POST',
      body: JSON.stringify({ providerVideoId: video.providerVideoId }),
    });
    const current = usePlaylistStore.getState().videosByChild[childProfileId] ?? [];
    usePlaylistStore.getState().setServerPlaylist(
      childProfileId,
      playlistId,
      [
        ...current.filter(
          (entry) =>
            entry.id !== localEntryId &&
            entry.video.providerVideoId !== playlistVideo.video.providerVideoId,
        ),
        {
          id: playlistVideo.id,
          video: playlistVideo.video,
          addedAt: new Date().toISOString(),
          status: 'live',
        },
      ],
    );
    return 'added';
  } catch (error) {
    if (error instanceof ApiError && error.code === 'DUPLICATE_VIDEO') return 'duplicate';
    if (error instanceof ApiError && error.code === 'LIMIT_REACHED') return 'limit';
    throw error;
  }
}

export async function removeSharedVideo(
  childProfileId: string,
  entry: PlaylistVideo,
): Promise<void> {
  const store = usePlaylistStore.getState();
  const playlistId = store.playlistIdByChild[childProfileId];
  if (apiConfigured() && playlistId && (entry.status ?? 'live') === 'live') {
    await api(`/playlists/${playlistId}/videos/${entry.id}`, { method: 'DELETE' });
  }
  store.removeVideo(childProfileId, entry.id);
}

export async function reorderSharedVideos(
  childProfileId: string,
  ordered: PlaylistVideo[],
): Promise<void> {
  const store = usePlaylistStore.getState();
  store.reorderVideos(childProfileId, ordered.map((entry) => entry.id));
  const playlistId = store.playlistIdByChild[childProfileId];
  const liveIds = ordered
    .filter((entry) => (entry.status ?? 'live') === 'live')
    .map((entry) => entry.id);
  if (apiConfigured() && playlistId && liveIds.length > 0) {
    await api(`/playlists/${playlistId}/videos/order`, {
      method: 'PUT',
      body: JSON.stringify({ orderedIds: liveIds }),
    });
  }
}
