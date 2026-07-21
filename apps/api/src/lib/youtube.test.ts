import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchChannelUploads, parseIsoDuration, resolveChannel } from './youtube';

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
      channelId: 'UC_channel',
      channelTitle: 'Kids Channel',
      liveBroadcastContent: 'none',
      thumbnails: { high: { url: `https://i.ytimg.com/vi/${id}/hq.jpg` } },
      ...(overrides.snippet as object),
    },
    contentDetails: { duration: 'PT2M', ...(overrides.contentDetails as object) },
    status: { embeddable: true, privacyStatus: 'public', madeForKids: true, ...(overrides.status as object) },
  };
}

describe('resolveChannel', () => {
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

  it('returns title + uploads playlist', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          { id: 'UC_abc', snippet: { title: 'Ms Rachel' }, contentDetails: { relatedPlaylists: { uploads: 'UU_abc' } } },
        ],
      }),
    });
    await expect(resolveChannel('UC_abc')).resolves.toEqual({
      channelId: 'UC_abc',
      channelTitle: 'Ms Rachel',
      uploadsPlaylistId: 'UU_abc',
    });
  });

  it('404s when the channel is missing', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ items: [] }) });
    await expect(resolveChannel('UC_none')).rejects.toMatchObject({ status: 404 });
  });
});

describe('fetchChannelUploads', () => {
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

  it('lists playable uploads, filtering unplayable ones, newest first', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            { contentDetails: { videoId: 'aaaaaaaaaaa', videoPublishedAt: '2026-01-02T00:00:00Z' } },
            { contentDetails: { videoId: 'bbbbbbbbbbb', videoPublishedAt: '2026-01-03T00:00:00Z' } },
            { contentDetails: { videoId: 'ccccccccccc', videoPublishedAt: '2026-01-04T00:00:00Z' } },
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
            videoItem('ccccccccccc'),
          ],
        }),
      });

    const results = await fetchChannelUploads('UU_abc');
    expect(results.map((r) => r.providerVideoId)).toEqual(['ccccccccccc', 'aaaaaaaaaaa']);
    expect(results[0].publishedAt).toBeInstanceOf(Date);
  });

  it('skips the videos.list call when everything is at/before the watermark', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        items: [{ contentDetails: { videoId: 'aaaaaaaaaaa', videoPublishedAt: '2026-01-01T00:00:00Z' } }],
      }),
    });
    await expect(fetchChannelUploads('UU_abc', new Date('2026-01-01T00:00:00Z'))).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
