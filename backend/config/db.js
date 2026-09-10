import mongoose from 'mongoose';
import env from './env.js';

mongoose.set('strictQuery', true);

/* NOTE: `sanitizeFilter` is deliberately NOT enabled globally - it rewrites
   every legitimate operator (including our own $in/$gte queries) into $eq.
   Injection is handled instead by express-mongo-sanitize on the request and
   by zod validation before any value reaches a query. */

export async function connectDB(uri = env.mongoUri) {
  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    autoIndex: !env.isProd,
  });
  console.log(`[db] connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
}

export async function disconnectDB() {
  await mongoose.connection.close();
}
