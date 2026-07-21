import {
  approvedChannels,
  pendingVideos,
  playlists,
  playlistVideos,
  videoMetadata,
  type Db,
} from '@littleloop/db';
import type { VideoMeta } from '@littleloop/shared';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { fetchChannelUploads, type ChannelUpload } from './youtube';

/** Never enqueue more than this per channel per run — quota + review-queue sanity. */
const MAX_UPLOADS_PER_PULL = 10;
/** How many recent uploads to scan, and how many suggestions to surface, on approval. */
const BACKFILL_SCAN = 30;
const BACKFILL_SUGGESTIONS = 12;

type ApprovedChannel = typeof approvedChannels.$inferSelect;

function toVideoMeta(u: ChannelUpload): VideoMeta {
  return {
    provider: 'youtube',
    providerVideoId: u.providerVideoId,
    title: u.title,
    channelTitle: u.channelTitle,
    durationSeconds: u.durationSeconds,
    thumbnailUrl: u.thumbnailUrl,
    embeddable: u.embeddable,
  };
}

/** Upsert metadata for a batch of uploads, returning providerVideoId → row id. */
export async function primeVideoMetadata(db: Db, uploads: ChannelUpload[]): Promise<Map<string, string>> {
  if (uploads.length === 0) return new Map();
  const now = new Date();
  const rows = await db
    .insert(videoMetadata)
    .values(
      uploads.map((u) => ({
        provider: 'youtube' as const,
        providerVideoId: u.providerVideoId,
        title: u.title,
        channelId: u.channelId,
        channelTitle: u.channelTitle,
        durationSeconds: u.durationSeconds,
        thumbnailUrl: u.thumbnailUrl,
        embeddable: u.embeddable,
        madeForKids: u.madeForKids,
        status: 'available' as const,
        lastCheckedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: [videoMetadata.provider, videoMetadata.providerVideoId],
      set: {
        title: sql`excluded.title`,
        channelId: sql`excluded.channel_id`,
        channelTitle: sql`excluded.channel_title`,
        durationSeconds: sql`excluded.duration_seconds`,
        thumbnailUrl: sql`excluded.thumbnail_url`,
        embeddable: sql`excluded.embeddable`,
        madeForKids: sql`excluded.made_for_kids`,
        status: 'available',
        lastCheckedAt: now,
      },
    })
    .returning({ id: videoMetadata.id, providerVideoId: videoMetadata.providerVideoId });
  return new Map(rows.map((r) => [r.providerVideoId, r.id]));
}

/**
 * Pull one approved channel's new uploads into the review queue. New uploads
 * become pending_videos (never live) so a parent still approves each. Skips
 * anything already live or already pending. Advances the published watermark.
 * Returns the number of newly-enqueued videos.
 */
export async function pullChannel(db: Db, channel: ApprovedChannel): Promise<number> {
  const now = new Date();
  const finish = (lastPublishedAt?: Date | null) =>
    db
      .update(approvedChannels)
      .set({ lastPulledAt: now, ...(lastPublishedAt !== undefined ? { lastPublishedAt } : {}) })
      .where(eq(approvedChannels.id, channel.id));

  if (!channel.uploadsPlaylistId) {
    await finish();
    return 0;
  }

  const uploads = (
    await fetchChannelUploads(channel.uploadsPlaylistId, channel.lastPublishedAt)
  ).slice(0, MAX_UPLOADS_PER_PULL);
  if (uploads.length === 0) {
    await finish();
    return 0;
  }

  const playlist = await db.query.playlists.findFirst({
    where: and(eq(playlists.childProfileId, channel.childProfileId), isNull(playlists.deletedAt)),
  });
  if (!playlist) {
    await finish();
    return 0;
  }

  const metaIdByVideo = await primeVideoMetadata(db, uploads);
  const metaIds = [...metaIdByVideo.values()];

  const [live, pending] = await Promise.all([
    db
      .select({ id: playlistVideos.videoMetadataId })
      .from(playlistVideos)
      .where(
        and(eq(playlistVideos.playlistId, playlist.id), inArray(playlistVideos.videoMetadataId, metaIds)),
      ),
    db
      .select({ id: pendingVideos.videoMetadataId })
      .from(pendingVideos)
      .where(
        and(eq(pendingVideos.playlistId, playlist.id), inArray(pendingVideos.videoMetadataId, metaIds)),
      ),
  ]);
  const existing = new Set([...live, ...pending].map((r) => r.id));

  const rows = uploads
    .map((u) => ({ upload: u, metaId: metaIdByVideo.get(u.providerVideoId) }))
    .filter(
      (r): r is { upload: ChannelUpload; metaId: string } =>
        Boolean(r.metaId) && !existing.has(r.metaId as string),
    )
    .map((r) => ({
      playlistId: playlist.id,
      videoMetadataId: r.metaId,
      approvedChannelId: channel.id,
      publishedAt: r.upload.publishedAt,
    }));

  if (rows.length > 0) {
    await db
      .insert(pendingVideos)
      .values(rows)
      .onConflictDoNothing({ target: [pendingVideos.playlistId, pendingVideos.videoMetadataId] });
  }

  const newestPublished = uploads.reduce<Date | null>(
    (max, u) => (u.publishedAt && (!max || u.publishedAt > max) ? u.publishedAt : max),
    channel.lastPublishedAt ?? null,
  );
  await finish(newestPublished);
  return rows.length;
}

/**
 * Backfill suggestions shown the moment a channel is approved: the channel's
 * recent uploads, most-viewed first, that aren't already in the playlist. Also
 * sets the published watermark so the cron won't later re-surface these as
 * pending — the parent picks from here instead. Returns client-ready VideoMeta.
 */
export async function backfillChannel(db: Db, channel: ApprovedChannel): Promise<VideoMeta[]> {
  const now = new Date();
  if (!channel.uploadsPlaylistId) {
    await db.update(approvedChannels).set({ lastPulledAt: now }).where(eq(approvedChannels.id, channel.id));
    return [];
  }

  const uploads = await fetchChannelUploads(channel.uploadsPlaylistId, null, BACKFILL_SCAN);
  const newestPublished = uploads.reduce<Date | null>(
    (max, u) => (u.publishedAt && (!max || u.publishedAt > max) ? u.publishedAt : max),
    channel.lastPublishedAt ?? null,
  );
  // Watermark past the backfill so future cron pulls only catch genuinely new uploads.
  await db
    .update(approvedChannels)
    .set({ lastPulledAt: now, lastPublishedAt: newestPublished })
    .where(eq(approvedChannels.id, channel.id));
  if (uploads.length === 0) return [];

  const top = [...uploads].sort((a, b) => b.viewCount - a.viewCount).slice(0, BACKFILL_SUGGESTIONS);
  await primeVideoMetadata(db, top);

  // Drop anything already live in the child's playlist.
  const playlist = await db.query.playlists.findFirst({
    where: and(eq(playlists.childProfileId, channel.childProfileId), isNull(playlists.deletedAt)),
    columns: { id: true },
  });
  if (!playlist) return top.map(toVideoMeta);

  const live = await db
    .select({ providerVideoId: videoMetadata.providerVideoId })
    .from(playlistVideos)
    .innerJoin(videoMetadata, eq(playlistVideos.videoMetadataId, videoMetadata.id))
    .where(eq(playlistVideos.playlistId, playlist.id));
  const liveIds = new Set(live.map((r) => r.providerVideoId));

  return top.filter((u) => !liveIds.has(u.providerVideoId)).map(toVideoMeta);
}
