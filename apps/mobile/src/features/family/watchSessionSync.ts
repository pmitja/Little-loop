import { api, apiConfigured } from '@/lib/api';
import { getInstallId } from '@/lib/userSync';
import type { WatchSession } from '@/stores/timerStore';

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
            endReason: session.endReason === 'bedtime' ? 'time_limit' : session.endReason,
          }),
        });
        synced.add(session.id);
      } finally {
        inFlight.delete(session.id);
      }
    }),
  );
}
