import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/apiResponse.js';
import { destroyImage, uploadMany } from '../services/upload.service.js';

/**
 * Vendors post raw files here; only the resulting hosted URL is ever stored on
 * the product. Cloudinary credentials stay on the server.
 */
export const uploadProductImages = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw ApiError.badRequest('Choose at least one image to upload');

  const uploaded = await uploadMany(req.files, 'artisans-corner/products');

  return sendSuccess(res, {
    statusCode: 201,
    message: `${uploaded.length} image(s) uploaded`,
    data: {
      images: uploaded.map((image, index) => ({
        url: image.url,
        publicId: image.publicId,
        alt: req.files[index]?.originalname?.replace(/\.[^.]+$/, '') || '',
      })),
      storage: env.cloudinaryEnabled ? 'cloudinary' : 'local-disk',
    },
  });
});

export const uploadStoreImage = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw ApiError.badRequest('Choose an image to upload');
  const [image] = await uploadMany(req.files.slice(0, 1), 'artisans-corner/stores');
  return sendSuccess(res, { statusCode: 201, message: 'Image uploaded', data: { image } });
});

export const deleteUploadedImage = asyncHandler(async (req, res) => {
  const publicId = req.body.publicId || req.query.publicId;
  if (!publicId) throw ApiError.badRequest('publicId is required');
  await destroyImage(publicId);
  return sendSuccess(res, { message: 'Image removed' });
});
