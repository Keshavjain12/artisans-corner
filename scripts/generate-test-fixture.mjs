/**
 * Regenerates the image the browser suite uploads.
 *
 *   node scripts/generate-test-fixture.mjs
 *
 * Kept as a committed fixture so e2e/helpers.js can read it synchronously -
 * Playwright's loader does not allow top-level await in a helper module.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const out = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'e2e',
  'fixtures',
  'test-upload.png'
);

const overlay = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
     <circle cx="400" cy="430" r="200" fill="#8F5739" opacity="0.85"/>
     <rect x="250" y="180" width="300" height="60" rx="30" fill="#A96F4C"/>
     <text x="400" y="720" text-anchor="middle" font-family="serif"
           font-size="46" fill="#74452E">test upload</text>
   </svg>`
);

const info = await sharp({
  create: { width: 800, height: 800, channels: 3, background: '#E7CFC1' },
})
  .composite([{ input: overlay, top: 0, left: 0 }])
  .png()
  .toFile(out);

console.log(`wrote ${path.relative(process.cwd(), out)} (${info.width}x${info.height}, ${info.size} bytes)`);
