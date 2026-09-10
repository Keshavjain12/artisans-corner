import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cloudinary from '../config/cloudinary.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DIR = path.resolve(__dirname, '..', 'uploads');

/** Magic-byte signatures - a spoofed Content-Type alone is not trusted. */
const SIGNATURES = [
  { ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: 'gif', test: (b) => b.subarray(0, 3).toString('ascii') === 'GIF' },
  {
    ext: 'webp',
    test: (b) =>
      b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  { ext: 'avif', test: (b) => b.subarray(4, 8).toString('ascii') === 'ftyp' },
];

export function assertIsImage(file) {
  if (!file?.buffer?.length) throw ApiError.badRequest('The uploaded file is empty');
  if (file.size > env.upload.maxFileSizeBytes) {
    throw new ApiError(413, 'That image is larger than 5MB');
  }
  const match = SIGNATURES.find((sig) => sig.test(file.buffer));
  if (!match) throw ApiError.badRequest('That file does not look like a real image');
  return match.ext;
}

async function uploadToCloudinary(file, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        // Server-side normalisation keeps product imagery fast and consistent.
        transformation: [{ width: 1600, height: 1600, crop: 'limit' }, { quality: 'auto:good' }],
        format: 'webp',
      },
      (error, result) => {
        if (error) return reject(new ApiError(502, 'Image upload failed, please try again'));
        return resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(file.buffer);
  });
}

async function uploadToLocalDisk(file, ext) {
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  await fs.writeFile(path.join(LOCAL_DIR, name), file.buffer);
  return { url: `${env.serverUrl}/uploads/${name}`, publicId: `local:${name}` };
}

/**
 * Uploads one validated image and returns the URL to persist.
 * Cloudinary is used whenever it is configured; otherwise the file is written
 * to backend/uploads so the app stays usable in local development.
 */
export async function uploadImage(file, folder = 'artisans-corner/products') {
  const ext = assertIsImage(file);
  if (env.cloudinaryEnabled) return uploadToCloudinary(file, folder);
  return uploadToLocalDisk(file, ext);
}

export async function uploadMany(files = [], folder) {
  return Promise.all(files.map((file) => uploadImage(file, folder)));
}

/** Best-effort cleanup; a failed delete must never break the request. */
export async function destroyImage(publicId) {
  if (!publicId) return;
  try {
    if (publicId.startsWith('local:')) {
      await fs.unlink(path.join(LOCAL_DIR, publicId.slice(6)));
      return;
    }
    if (env.cloudinaryEnabled) await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.warn(`[upload] could not delete ${publicId}:`, error.message);
  }
}
