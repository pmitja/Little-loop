import { api, apiConfigured } from '@/lib/api';
import { getInstallId } from '@/lib/userSync';
import { serverEndReason, useTimerStore, type WatchSession } from '@/stores/timerStore';
import { isKidDevice } from '@/stores/kidDeviceStore';
import { reportKidSession } from '@/features/kid/kidSync';

const inFlight = new Set<string>();
const synced = new Set<string>();

export async function syncCompletedWatchSessions(sessions: WatchSession[]): Promise<void> {
  if (!apiConfigured()) return;
  const completed = sessions.filter(
    (session) => session.endedAt && !inFlight.has(session.id) && !synced.has(session.id),
  );
  await Promise.all(
    completed.map(async (session) => {
      inFlight.add(session.id);
      try {
        if (isKidDevice()) {
          // Empty stretches (app opened, nothing played) aren't worth a write.
          if (session.seconds > 0) await reportKidSession(session);
          synced.add(session.id);
          return;
        }
        const { sessionId } = await api<{ sessionId: string }>('/watch-sessions', {
          method: 'POST',
          body: JSON.stringify({
            childProfileId: session.childProfileId,
            clientSessionId: session.id,
            startedAt: session.startedAt,
            installId: await getInstallId(),
            tzOffsetMinutes: new Date().getTimezoneOffset(),
          }),
        });
        await api(`/watch-sessions/${sessionId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            totalSeconds: session.seconds,
            providerVideoIds: session.videoIds,
            endReason: session.endReason ? serverEndReason(session.endReason) : session.endReason,
          }),
        });
        synced.add(session.id);
      } finally {
        inFlight.delete(session.id);
      }
    }),
  );
}

const openedOnServer = new Set<string>();

/**
 * Parent phone: register a just-started child-mode session and adopt the
 * server's total for today, so time already watched on the child's own device
 * counts against the same daily limit here. Best-effort — offline keeps the
 * local count. Idempotent via clientSessionId, so the end-of-session sync
 * later finds this same row.
 */
export async function openActiveWatchSession(session: WatchSession): Promise<void> {
  if (!apiConfigured() || openedOnServer.has(session.id)) return;
  openedOnServer.add(session.id);
  try {
    const { secondsWatchedToday } = await api<{ secondsWatchedToday: number }>(
      '/watch-sessions',
      {
        method: 'POST',
        body: JSON.stringify({
          childProfileId: session.childProfileId,
          clientSessionId: session.id,
          startedAt: session.startedAt,
          installId: await getInstallId(),
          tzOffsetMinutes: new Date().getTimezoneOffset(),
        }),
      },
    );
    useTimerStore.getState().adoptServerSeconds(session.childProfileId, secondsWatchedToday);
  } catch {
    openedOnServer.delete(session.id);
  }
}
