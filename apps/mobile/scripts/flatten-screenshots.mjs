/**
 * App Store Connect rejects screenshots that carry an alpha channel, even when
 * nothing in the image is actually transparent — exporters add one by default.
 *
 * Usage: node scripts/flatten-screenshots.mjs <folder> [--bg '#F4F1EB']
 *
 * Reads every PNG in <folder>, composites it over an opaque background, and
 * writes the result to <folder>/flattened/. Dimensions are untouched, so the
 * files still match the 6.9" slot they were captured for.
 */
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [folder, ...rest] = process.argv.slice(2);
if (!folder) {
  console.error('Usage: node scripts/flatten-screenshots.mjs <folder> [--bg "#RRGGBB"]');
  process.exit(1);
}

const bgIndex = rest.indexOf('--bg');
const background = bgIndex === -1 ? '#FFFFFF' : rest[bgIndex + 1];

const outDir = path.join(folder, 'flattened');
await mkdir(outDir, { recursive: true });

const files = (await readdir(folder)).filter((f) => /\.png$/i.test(f)).sort();
if (files.length === 0) {
  console.error(`No PNGs found in ${folder}`);
  process.exit(1);
}

for (const file of files) {
  const input = path.join(folder, file);
  const output = path.join(outDir, file);
  const before = await sharp(input).metadata();
  await sharp(input)
    .flatten({ background })
    .png({ compressionLevel: 9 })
    .toFile(output);
  const after = await sharp(output).metadata();
  console.log(
    `${file}  ${before.width}x${before.height}  alpha ${before.hasAlpha ? 'yes' : 'no'} → ${after.hasAlpha ? 'yes' : 'no'}`,
  );
}

console.log(`\n${files.length} file(s) written to ${outDir}`);
