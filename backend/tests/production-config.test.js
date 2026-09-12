import { describe, expect, it } from '@jest/globals';
import { productionProblems } from '../config/env.js';

const RAW = {
  JWT_SECRET: 'a-properly-long-random-production-secret',
  MONGO_URI: 'mongodb+srv://user:pass@cluster.example.net/artisans-corner',
};

const config = (over = {}) => ({
  cloudinaryEnabled: true,
  stripeEnabled: true,
  allowMockPayments: false,
  demoDeployment: false,
  ...over,
});

describe('production configuration', () => {
  it('boots with Stripe, Cloudinary, a database and a real secret', () => {
    expect(productionProblems(config(), RAW)).toEqual([]);
  });

  it('refuses to boot without Stripe when no demo was declared', () => {
    const problems = productionProblems(config({ stripeEnabled: false }), RAW);
    expect(problems.join(' ')).toMatch(/STRIPE_SECRET_KEY/);
  });

  it('refuses simulated payments switched on by themselves', () => {
    const problems = productionProblems(
      config({ stripeEnabled: false, allowMockPayments: true }),
      RAW
    );
    expect(problems.join(' ')).toMatch(/ALLOW_MOCK_PAYMENTS must be false/);
  });

  it('refuses a demo declared without simulated payments to fall back on', () => {
    const problems = productionProblems(config({ stripeEnabled: false, demoDeployment: true }), RAW);
    expect(problems.join(' ')).toMatch(/STRIPE_SECRET_KEY/);
  });

  it('boots a labelled demo when both flags say so', () => {
    const problems = productionProblems(
      config({ stripeEnabled: false, allowMockPayments: true, demoDeployment: true }),
      RAW
    );
    expect(problems).toEqual([]);
  });

  it('asks for simulated payments to be turned off once Stripe exists', () => {
    const problems = productionProblems(
      config({ allowMockPayments: true, demoDeployment: true }),
      RAW
    );
    expect(problems.join(' ')).toMatch(/turn ALLOW_MOCK_PAYMENTS off/);
  });

  it('still demands everything a demo cannot do without', () => {
    const demo = config({ stripeEnabled: false, allowMockPayments: true, demoDeployment: true });

    expect(productionProblems(demo, { ...RAW, JWT_SECRET: 'short' }).join(' ')).toMatch(/JWT_SECRET/);
    expect(productionProblems(demo, { JWT_SECRET: RAW.JWT_SECRET }).join(' ')).toMatch(/MONGO_URI/);
    expect(
      productionProblems({ ...demo, cloudinaryEnabled: false }, RAW).join(' ')
    ).toMatch(/Cloudinary/);
  });
});
