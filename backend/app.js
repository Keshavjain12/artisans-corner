import path from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';

import env from './config/env.js';
import { handleWebhook } from './controllers/payment.controller.js';
import ApiError from './utils/ApiError.js';
import { errorHandler, notFound } from './middleware/error.js';
import { apiLimiter } from './middleware/rateLimit.js';
import routes from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    })
  );

  const allowList = new Set(env.clientUrls);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowList.has(origin.replace(/\/$/, ''))) return callback(null, true);
        return callback(ApiError.forbidden('This origin is not allowed to call the API'));
      },
      credentials: true,
    })
  );

  app.post(
    '/api/payments/webhook',
    express.raw({ type: 'application/json' }),
    handleWebhook
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(compression());
  app.use(hpp());
  app.use(mongoSanitize());

  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));

  app.use('/api', apiLimiter, routes);

  app.get('/', (_req, res) =>
    res.json({
      success: true,
      message: 'Artisan\u2019s Corner API',
      data: { docs: '/api/health', version: '1.0.0' },
    })
  );

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
