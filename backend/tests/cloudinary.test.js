/**
 * Covers the brief's image-handling rule:
 *
 *   "You cannot store images directly in the database. Integrate Cloudinary or
 *    AWS S3. When a vendor uploads a photo, upload it to the cloud, get the
 *    URL, and save that URL in your database."
 *
 * The Cloudinary *client* is mocked so no network call is made, but everything
 * around it is real: multer parses a genuine multipart upload, the service
 * streams the bytes to the SDK, and the URL it hands back is what ends up on
 * the product. The assertions below are about where the bytes go and what the
 * database is left holding.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

// Must be set before config/env.js is read, so cloudinaryEnabled is true.
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key-123';
process.env.CLOUDINARY_API_SECRET = 'test-secret-shhh';

/** What the fake Cloudinary saw, reset before each test. */
const cloud = {
  uploads: [],
  bytesReceived: [],
  destroyed: [],
  failNext: false,
};

const cloudinaryMock = {
  uploader: {
    upload_stream: jest.fn((options, callback) => {
      cloud.uploads.push(options);
      return {
        end: (buffer) => {
          cloud.bytesReceived.push(buffer.length);
          if (cloud.failNext) {
            cloud.failNext = false;
            return callback(new Error('Cloudinary is down'));
          }
          const id = `${options.folder}/img_${cloud.uploads.length}`;
          return callback(null, {
            secure_url: `https://res.cloudinary.com/test-cloud/image/upload/v1/${id}.webp`,
            public_id: id,
          });
        },
      };
    }),
    destroy: jest.fn(async (publicId) => {
      cloud.destroyed.push(publicId);
      return { result: 'ok' };
    }),
  },
};

jest.unstable_mockModule('../config/cloudinary.js', () => ({ default: cloudinaryMock }));

const { startTestDb, stopTestDb, resetDb, api, registerBuyer, registerVendor, Product } =
  await import('./helpers.js');

beforeAll(startTestDb, 120000);
afterAll(stopTestDb);
beforeEach(async () => {
  await resetDb();
  cloud.uploads = [];
  cloud.bytesReceived = [];
  cloud.destroyed = [];
  cloud.failNext = false;
  jest.clearAllMocks();
});

/** A real 1x1 PNG, so the magic-byte check passes. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const uploadAs = (token, buffer = PNG, filename = 'swatch.png', contentType = 'image/png') =>
  api()
    .post('/api/uploads/products')
    .set('Authorization', `Bearer ${token}`)
    .attach('images', buffer, { filename, contentType });

describe('a vendor photo goes to the cloud, not the database', () => {
  it('streams the bytes to Cloudinary and returns the hosted URL', async () => {
    const vendor = await registerVendor('Upload Studio');

    const res = await uploadAs(vendor.token);

    expect(res.status).toBe(201);
    expect(cloudinaryMock.uploader.upload_stream).toHaveBeenCalledTimes(1);
    // The actual file bytes reached the SDK.
    expect(cloud.bytesReceived[0]).toBe(PNG.length);

    const [image] = res.body.data.images;
    expect(image.url).toBe(
      'https://res.cloudinary.com/test-cloud/image/upload/v1/artisans-corner/products/img_1.webp'
    );
    expect(image.publicId).toBe('artisans-corner/products/img_1');
    expect(res.body.data.storage).toBe('cloudinary');
  });

  it('uploads into a namespaced folder as an optimised image', async () => {
    const vendor = await registerVendor('Options Studio');
    await uploadAs(vendor.token);

    const options = cloud.uploads[0];
    expect(options.folder).toBe('artisans-corner/products');
    expect(options.resource_type).toBe('image');
    expect(options.format).toBe('webp');
    expect(options.transformation).toEqual(
      expect.arrayContaining([expect.objectContaining({ crop: 'limit' })])
    );
  });

  it('saves only the URL on the product - no image bytes in MongoDB', async () => {
    const vendor = await registerVendor('Storage Studio');
    const upload = await uploadAs(vendor.token);
    const [image] = upload.body.data.images;

    const created = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${vendor.token}`)
      .send({
        name: 'Cloud Hosted Vase',
        description: 'A stoneware vase whose photograph lives in the cloud, not in the database.',
        price: 60,
        category: 'pottery',
        stock: 3,
        images: [{ url: image.url, publicId: image.publicId, alt: 'vase' }],
      });

    expect(created.status).toBe(201);

    // Read the raw document, not the API response.
    const stored = await Product.findById(created.body.data.product._id).lean();
    expect(stored.images).toHaveLength(1);
    expect(stored.images[0].url).toMatch(/^https:\/\/res\.cloudinary\.com\//);
    expect(Object.keys(stored.images[0]).sort()).toEqual(['alt', 'publicId', 'url']);

    // Nothing in the document is binary or base64-encoded image data.
    const raw = JSON.stringify(stored);
    expect(raw).not.toContain('iVBORw0KGgo'); // the PNG's base64 signature
    expect(raw).not.toContain('data:image');
    expect(Buffer.isBuffer(stored.images[0].url)).toBe(false);
    expect(raw.length).toBeLessThan(4000);
  });

  it('accepts several photos for one product', async () => {
    const vendor = await registerVendor('Gallery Studio');

    const res = await api()
      .post('/api/uploads/products')
      .set('Authorization', `Bearer ${vendor.token}`)
      .attach('images', PNG, { filename: 'a.png', contentType: 'image/png' })
      .attach('images', PNG, { filename: 'b.png', contentType: 'image/png' })
      .attach('images', PNG, { filename: 'c.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.data.images).toHaveLength(3);
    expect(cloudinaryMock.uploader.upload_stream).toHaveBeenCalledTimes(3);
    expect(new Set(res.body.data.images.map((i) => i.publicId)).size).toBe(3);
  });

  it('removes the cloud copy when a never-sold product is deleted', async () => {
    const vendor = await registerVendor('Cleanup Studio');
    const upload = await uploadAs(vendor.token);
    const [image] = upload.body.data.images;

    const created = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${vendor.token}`)
      .send({
        name: 'Disposable Bowl',
        description: 'A bowl listed only so that deleting it can be observed in a test.',
        price: 20,
        category: 'pottery',
        stock: 1,
        images: [{ url: image.url, publicId: image.publicId, alt: '' }],
      });

    await api()
      .delete(`/api/products/${created.body.data.product._id}`)
      .set('Authorization', `Bearer ${vendor.token}`);

    expect(cloud.destroyed).toContain(image.publicId);
  });
});

describe('what never reaches Cloudinary', () => {
  it('rejects a file that only claims to be an image', async () => {
    const vendor = await registerVendor('Spoof Studio');

    const res = await uploadAs(vendor.token, Buffer.from('#!/bin/sh\nrm -rf /'), 'evil.png');

    expect(res.status).toBe(400);
    // The magic-byte check runs before any upload is attempted.
    expect(cloudinaryMock.uploader.upload_stream).not.toHaveBeenCalled();
  });

  it('rejects a disallowed content type', async () => {
    const vendor = await registerVendor('Mime Studio');

    const res = await api()
      .post('/api/uploads/products')
      .set('Authorization', `Bearer ${vendor.token}`)
      .attach('images', Buffer.from('hello'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
    expect(cloudinaryMock.uploader.upload_stream).not.toHaveBeenCalled();
  });

  it('refuses an anonymous upload', async () => {
    const res = await api().post('/api/uploads/products').attach('images', PNG, 'swatch.png');
    expect(res.status).toBe(401);
    expect(cloudinaryMock.uploader.upload_stream).not.toHaveBeenCalled();
  });

  it('refuses a buyer without a shop', async () => {
    const buyer = await registerBuyer();
    const res = await uploadAs(buyer.token);

    expect(res.status).toBe(403);
    expect(cloudinaryMock.uploader.upload_stream).not.toHaveBeenCalled();
  });

  it('surfaces a Cloudinary outage as a clean error, not a stack trace', async () => {
    const vendor = await registerVendor('Outage Studio');
    cloud.failNext = true;

    /* The server logs 5xx faults to the console, which is right in production
       and pure noise in a passing test run - so capture that log and assert on
       it, rather than printing a stack trace across otherwise green output. */
    const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
    let res;
    let loggedCalls = 0;
    try {
      res = await uploadAs(vendor.token);
      // Counted before restoring: mockRestore() also forgets the calls.
      loggedCalls = logged.mock.calls.length;
    } finally {
      logged.mockRestore();
    }

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/upload failed/i);
    // The fault is logged server-side...
    expect(loggedCalls).toBeGreaterThan(0);
    // ...and what the shopper would be shown is a sentence, not a stack.
    expect(res.body.message).not.toMatch(/upload\.service\.js/);
    /* The stack rides along as a development aid only: error.js drops it and
       genericises the message in production - see error-handler.test.js. */
    expect(res.body.error).toContain('upload.service.js');
  });
});

describe('Cloudinary credentials stay on the server', () => {
  it('never returns the API secret to the client', async () => {
    const vendor = await registerVendor('Secret Studio');
    const upload = await uploadAs(vendor.token);
    const config = await api().get('/api/payments/config');
    const health = await api().get('/api/health');

    const everything = JSON.stringify(upload.body) + JSON.stringify(config.body) + JSON.stringify(health.body);
    expect(everything).not.toContain('test-secret-shhh');
    expect(everything).not.toContain('test-key-123');
  });
});
