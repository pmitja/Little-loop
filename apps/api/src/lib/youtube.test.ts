import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from './http';
import { parseIsoDuration, searchVideos } from './youtube';

describe('parseIsoDuration', () => {
  it('parses typical video durations', () => {
    expect(parseIsoDuration('PT8M24S')).toBe(504);
    expect(parseIsoDuration('PT1H2M30S')).toBe(3750);
    expect(parseIsoDuration('PT45S')).toBe(45);
    expect(parseIsoDuration('PT2M')).toBe(120);
    expect(parseIsoDuration('PT3H')).toBe(10800);
  });

  it('parses day-length durations', () => {
    expect(parseIsoDuration('P1DT2H')).toBe(93600);
  });

  it('rejects nonsense', () => {
    expect(parseIsoDuration('')).toBeNull();
    expect(parseIsoDuration('PT')).toBeNull();
    expect(parseIsoDuration('8:24')).toBeNull();
    expect(parseIsoDuration('P0D')).toBeNull();
  });
});

function videoItem(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    snippet: {
      title: `Video ${id}`,
      channelTitle: 'Kids Channel',
      liveBroadcastContent: 'none',
      thumbnails: { high: { url: `https://i.ytimg.com/vi/${id}/hq.jpg` } },
      ...(overrides.snippet as object),
    },
    contentDetails: { duration: 'PT2M', ...(overrides.contentDetails as object) },
    status: {
      embeddable: true,
      privacyStatus: 'public',
      madeForKids: true,
      ...(overrides.status as object),
    },
  };
}

describe('searchVideos', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv('YOUTUBE_API_KEY', 'test-key');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('searches, then resolves details, filtering unplayable videos', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            { id: { videoId: 'aaaaaaaaaaa' } },
            { id: { videoId: 'bbbbbbbbbbb' } },
            { id: { videoId: 'ccccccccccc' } },
            { id: { videoId: 'ddddddddddd' } },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            videoItem('aaaaaaaaaaa'),
            videoItem('bbbbbbbbbbb', { status: { embeddable: false } }),
            videoItem('ccccccccccc', { snippet: { liveBroadcastContent: 'live' } }),
            videoItem('ddddddddddd', {
              contentDetails: { duration: 'PT2M', contentRating: { ytRating: 'ytAgeRestricted' } },
            }),
          ],
        }),
      });

    const results = await searchVideos('peppa pig');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      providerVideoId: 'aaaaaaaaaaa',
      title: 'Video aaaaaaaaaaa',
      channelTitle: 'Kids Channel',
      durationSeconds: 120,
      embeddable: true,
      madeForKids: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const searchUrl = fetchMock.mock.calls[0][0] as string;
    expect(searchUrl).toContain('safeSearch=strict');
    expect(searchUrl).toContain('videoEmbeddable=true');
    expect(searchUrl).toContain('q=peppa%20pig');
  });

  it('returns [] without a details call when search finds nothing', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    });
    await expect(searchVideos('zzzz')).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps quota exhaustion to a 503 contract error', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) });
    await expect(searchVideos('peppa pig')).rejects.toMatchObject(
      new HttpError(503, 'QUOTA_EXCEEDED', 'Video search is temporarily unavailable'),
    );
  });
});
