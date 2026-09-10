import multer from 'multer';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

/**
 * Files are held in memory only long enough to stream them to Cloudinary.
 * Type and size are checked here *and* the extension is re-checked in the
 * upload service, so a spoofed mime type cannot smuggle a non-image through.
 */
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (!env.upload.allowedMimeTypes.includes(file.mimetype)) {
    return cb(ApiError.badRequest('Only JPG, PNG, WEBP, AVIF or GIF images are allowed'));
  }
  return cb(null, true);
};

export const uploadImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.upload.maxFileSizeBytes,
    files: env.upload.maxFilesPerRequest,
  },
});

export default uploadImages;
