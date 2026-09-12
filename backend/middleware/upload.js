import multer from 'multer';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

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
