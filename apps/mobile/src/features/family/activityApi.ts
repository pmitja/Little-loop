import { api } from '@/lib/api';

export interface SharedActivity {
  todayMinutes: number;
  dailyLimitMinutes: number | null;
  weekByDay: { date: string; minutes: number }[];
  mostWatched: {
    title: string;
    channelTitle: string;
    thumbnailUrl: string;
    minutes: number;
  } | null;
  sessions: {
    id: string;
    startedAt: string;
    minutes: number;
    videosCount: number;
    endReason: string | null;
  }[];
}

export async function fetchSharedActivity(childProfileId: string): Promise<SharedActivity> {
  return api<SharedActivity>(
    `/activity?childProfileId=${encodeURIComponent(childProfileId)}&tzOffsetMinutes=${new Date().getTimezoneOffset()}`,
  );
}
