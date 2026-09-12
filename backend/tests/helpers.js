import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../app.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Store from '../models/Store.js';
import User from '../models/User.js';
import { CATEGORY_SEED } from '../config/categories.js';

let memoryServer;

export const app = createApp();

export async function startTestDb() {
  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri(), { dbName: 'artisans-test' });
}

export async function stopTestDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await memoryServer?.stop();
}

export async function resetDb() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
  await Category.insertMany(CATEGORY_SEED);
}

export const api = () => request(app);

export async function registerBuyer(overrides = {}) {
  const payload = {
    name: 'Test Buyer',
    email: `buyer${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: 'Password123',
    confirmPassword: 'Password123',
    ...overrides,
  };
  const res = await api().post('/api/auth/register').send(payload);
  return { ...res.body.data, password: payload.password, email: payload.email };
}

export async function registerVendor(storeName = 'Test Studio') {
  const account = await registerBuyer();
  const res = await api()
    .post('/api/vendors/onboard')
    .set('Authorization', `Bearer ${account.token}`)
    .send({
      name: storeName,
      description: 'A small test studio making carefully finished handmade things.',
    });
  const login = await api()
    .post('/api/auth/login')
    .send({ email: account.email, password: account.password });
  return { ...login.body.data, store: res.body.data.store };
}

export async function createProduct(token, overrides = {}) {
  const res = await api()
    .post('/api/products')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: overrides.name || `Test Vase ${Math.random().toString(36).slice(2, 6)}`,
      description: 'A carefully thrown stoneware test piece with a soft matte glaze finish.',
      price: 100,
      category: 'pottery',
      stock: 5,
      ...overrides,
    });
  return res.body.data?.product;
}

export { Product, Store, User };
