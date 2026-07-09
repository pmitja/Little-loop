import { childProfiles, playlists, type Db } from '@littleloop/db';
import { and, eq, isNull } from 'drizzle-orm';
import { HttpError } from './http';

/** 404 (not 403) on foreign resources — don't leak existence. */
export async function requireChildProfile(db: Db, userId: string, childProfileId: string) {
  const row = await db.query.childProfiles.findFirst({
    where: and(
      eq(childProfiles.id, childProfileId),
      eq(childProfiles.userId, userId),
      isNull(childProfiles.deletedAt),
    ),
  });
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Child profile not found');
  return row;
}

export async function requirePlaylist(db: Db, userId: string, playlistId: string) {
  const row = await db.query.playlists.findFirst({
    where: and(eq(playlists.id, playlistId), isNull(playlists.deletedAt)),
  });
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Playlist not found');
  await requireChildProfile(db, userId, row.childProfileId);
  return row;
}
