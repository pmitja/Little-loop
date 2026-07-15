import { describe, expect, it } from 'vitest';
import {
  extractYouTubeId,
  extractYouTubeIdFromText,
  formatDuration,
  formatDurationLong,
  parseIso8601Duration,
} from './youtube';

const ID = 'dQw4w9WgXcQ';

describe('extractYouTubeId', () => {
  const valid: [string, string][] = [
    [`https://www.youtube.com/watch?v=${ID}`, ID],
    [`https://youtube.com/watch?v=${ID}`, ID],
    [`http://youtube.com/watch?v=${ID}`, ID],
    [`https://m.youtube.com/watch?v=${ID}`, ID],
    [`https://music.youtube.com/watch?v=${ID}&si=abc`, ID],
    [`https://www.youtube.com/watch?v=${ID}&t=42s`, ID],
    [`https://www.youtube.com/watch?list=PLx&v=${ID}`, ID], // video within a playlist context
    [`https://youtu.be/${ID}`, ID],
    [`https://youtu.be/${ID}?si=xyz&t=10`, ID],
    [`youtu.be/${ID}`, ID], // no protocol
    [`www.youtube.com/watch?v=${ID}`, ID],
    [`https://www.youtube.com/shorts/${ID}`, ID],
    [`https://youtube.com/shorts/${ID}?feature=share`, ID],
    [`https://www.youtube.com/embed/${ID}`, ID],
    [`https://www.youtube-nocookie.com/embed/${ID}?rel=0`, ID],
    [`https://www.youtube.com/live/${ID}`, ID],
    [`https://www.youtube.com/v/${ID}`, ID],
    [`  https://youtu.be/${ID}  `, ID], // surrounding whitespace
    [`https://youtu.be/a-b_c1D2e3F`, 'a-b_c1D2e3F'], // dashes/underscores in id
  ];

  it.each(valid)('extracts from %s', (url, expected) => {
    expect(extractYouTubeId(url)).toBe(expected);
  });

  const invalid: string[] = [
    '',
    '   ',
    'not a url',
    'https://example.com/watch?v=dQw4w9WgXcQ', // wrong host
    'https://vimeo.com/12345',
    'https://www.youtube.com/', // no path
    'https://www.youtube.com/watch', // missing v param
    'https://www.youtube.com/watch?v=', // empty v
    'https://www.youtube.com/watch?v=tooShort', // bad id length
    'https://www.youtube.com/watch?v=waaaaaaaaaaaaayTooLong',
    'https://www.youtube.com/playlist?list=PLabcdef', // playlist page
    'https://www.youtube.com/channel/UCabcdefgh', // channel
    'https://www.youtube.com/@somecreator', // handle
    'https://www.youtube.com/c/SomeChannel',
    'https://www.youtube.com/user/SomeUser',
    'https://www.youtube.com/results?search_query=kids',
    'https://youtu.be/', // bare short link
    'https://www.youtube.com/shorts/', // shorts without id
    'https://fakeyoutube.com/watch?v=dQw4w9WgXcQ', // lookalike host
  ];

  it.each(invalid)('rejects %s', (url) => {
    expect(extractYouTubeId(url)).toBeNull();
  });
});

describe('parseIso8601Duration', () => {
  it.each([
    ['PT8M24S', 504],
    ['PT1H5M15S', 3915],
    ['PT45S', 45],
    ['PT2H', 7200],
    ['PT12M', 720],
  ] as [string, number][])('parses %s', (input, expected) => {
    expect(parseIso8601Duration(input)).toBe(expected);
  });

  it.each(['', 'PT', '8:24', 'P1D'])('rejects %s', (input) => {
    expect(parseIso8601Duration(input)).toBeNull();
  });
});

describe('formatDuration', () => {
  it.each([
    [504, '8:24'],
    [3915, '1:05:15'],
    [45, '0:45'],
    [600, '10:00'],
  ] as [number, string][])('formats %d', (input, expected) => {
    expect(formatDuration(input)).toBe(expected);
  });
});

describe('formatDurationLong', () => {
  it.each([
    [504, '8 min 24 sec'],
    [45, '45 sec'],
    [720, '12 min'],
  ] as [number, string][])('formats %d', (input, expected) => {
    expect(formatDurationLong(input)).toBe(expected);
  });
});

describe('extractYouTubeIdFromText', () => {
  it('reads a bare link, the way a paste arrives', () => {
    expect(extractYouTubeIdFromText('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('finds the link inside what a share sheet actually sends', () => {
    // YouTube's Android share puts the title above the link.
    const shared = 'Peppa Pig - Muddy Puddles\nhttps://youtu.be/dQw4w9WgXcQ?si=AbC123';
    expect(extractYouTubeIdFromText(shared)).toBe('dQw4w9WgXcQ');
  });

  it('handles a link wrapped in a sentence', () => {
    expect(
      extractYouTubeIdFromText('watch this (https://www.youtube.com/watch?v=dQw4w9WgXcQ).'),
    ).toBe('dQw4w9WgXcQ');
  });

  it('rejects shared text with no video in it', () => {
    expect(extractYouTubeIdFromText('check out https://example.com/hello')).toBeNull();
    expect(extractYouTubeIdFromText('just some words')).toBeNull();
    // A channel is not a video, and must not become one.
    expect(extractYouTubeIdFromText('https://www.youtube.com/@SomeChannel')).toBeNull();
  });
});
