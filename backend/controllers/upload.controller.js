import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/apiResponse.js';
import { destroyImage, ownsImage, uploadMany } from '../services/upload.service.js';

/**
 * Vendors post raw files here; only the resulting hosted URL is ever stored on
 * the product. Cloudinary credentials stay on the server.
 */
export const uploadProductImages = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw ApiError.badRequest('Choose at least one image to upload');

  const uploaded = await uploadMany(req.files, 'artisans-corner/products', req.user._id);

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
  const [image] = await uploadMany(req.files.slice(0, 1), 'artisans-corner/stores', req.user._id);
  return sendSuccess(res, { statusCode: 201, message: 'Image uploaded', data: { image } });
});

/**
 * Deletion is restricted to images this account uploaded.
 *
 * A product's image URL exposes its public id to anyone who can view the page,
 * so without this any vendor could delete any other vendor's photographs.
 */
export const deleteUploadedImage = asyncHandler(async (req, res) => {
  const publicId = req.body.publicId || req.query.publicId;
  if (!publicId) throw ApiError.badRequest('publicId is required');

  if (!ownsImage(publicId, req.user._id, { isAdmin: req.user.role === 'admin' })) {
    throw ApiError.forbidden('That image was uploaded by another account');
  }

  await destroyImage(publicId);
  return sendSuccess(res, { message: 'Image removed' });
});
