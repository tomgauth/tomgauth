import Stripe from 'stripe';

export function createStripeClient(secretKey) {
  return new Stripe(secretKey, {
    appInfo: { name: 'solv-stripe', version: '0.1.0', url: 'https://www.solvlanguages.com' },
    maxNetworkRetries: 2,
  });
}
