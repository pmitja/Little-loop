import { approvedChannels } from '@littleloop/db';
import { videoMetaSchema } from '@littleloop/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { getEntitlement } from '@/lib/entitlement';
import { handle, HttpError, json, parseBody } from '@/lib/http';
import { requireChildProfile } from '@/lib/ownership';
import { getOrFetchVideo } from '@/lib/video-cache';
import { resolveChannel } from '@/lib/youtube';
import { backfillChannel } from '@/lib/channel-pull';

function childIdFromQuery(req: Request): string {
  const childProfileId = new URL(req.url).searchParams.get('childProfileId');
  if (!childProfileId) throw new HttpError(422, 'INVALID_QUERY', 'childProfileId is required');
  return childProfileId;
}

/** Approved channels for one child (PLAN §12 — Premium). */
export const GET = handle(async (req) => {
  const { db, user } = await requireAuth(req);
  const childProfileId = childIdFromQuery(req);
  await requireChildProfile(db, user!.id, childProfileId);

  const rows = await db.query.approvedChannels.findMany({
    where: and(
      eq(approvedChannels.childProfileId, childProfileId),
      isNull(approvedChannels.deletedAt),
    ),
    orderBy: (t, { asc }) => [asc(t.channelTitle)],
  });
  return json({
    channels: rows.map((r) => ({
      id: r.id,
      channelId: r.channelId,
      channelTitle: r.channelTitle,
      lastPulledAt: r.lastPulledAt?.toISOString() ?? null,
    })),
  });
});

const approveSchema = videoMetaSchema.pick({ providerVideoId: true }).extend({
  childProfileId: z.string().uuid(),
});

/**
 * Approve a whole channel for a child. Premium-only: it consumes YouTube quota
 * on every nightly pull. We derive the channel from one of its videos, then
 * return recent uploads (most-viewed first) so the parent can add some right
 * away; future uploads flow into the review queue via the nightly cron.
 */
export const POST = handle(async (req) => {
  const { db, user } = await requireAuth(req, { limitPerMinute: 20 });
  const { childProfileId, providerVideoId } = await parseBody(req, approveSchema);
  await requireChildProfile(db, user!.id, childProfileId);

  const { isPremium } = await getEntitlement(db, user!.id);
  if (!isPremium) {
    throw new HttpError(402, 'PREMIUM_REQUIRED', 'Upgrade to approve whole channels');
  }

  const video = await getOrFetchVideo(db, providerVideoId);
  if (!video.channelId) {
    throw new HttpError(422, 'VIDEO_UNAVAILABLE', "Couldn't identify this video's channel");
  }
  const channel = await resolveChannel(video.channelId);

  const [row] = await db
    .insert(approvedChannels)
    .values({
      childProfileId,
      provider: 'youtube',
      channelId: channel.channelId,
      channelTitle: channel.channelTitle,
      uploadsPlaylistId: channel.uploadsPlaylistId,
      addedByUserId: user!.id,
    })
    .onConflictDoUpdate({
      target: [approvedChannels.childProfileId, approvedChannels.provider, approvedChannels.channelId],
      set: {
        channelTitle: channel.channelTitle,
        uploadsPlaylistId: channel.uploadsPlaylistId,
        deletedAt: null,
      },
    })
    .returning();

  const suggestions = await backfillChannel(db, row).catch(() => []);

  return json(
    {
      channel: { id: row.id, channelId: row.channelId, channelTitle: row.channelTitle },
      suggestions,
    },
    201,
  );
});
