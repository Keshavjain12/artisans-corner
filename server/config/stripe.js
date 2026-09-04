import Stripe from 'stripe';
import env from './env.js';

const stripe = env.stripeEnabled
  ? new Stripe(env.stripe.secretKey, { apiVersion: '2024-12-18.acacia' })
  : null;

export default stripe;
