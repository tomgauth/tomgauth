/**
 * Creates a Customer Portal configuration suited to course packages and instalment plans:
 * customers can see invoices and update their payment method or billing details,
 * but cannot cancel or switch an instalment plan themselves.
 */
import { loadConfig } from '../src/config.js';
import { createStripeClient } from '../src/stripe.js';

const config = loadConfig();
const stripe = createStripeClient(config.secretKey);

const existing = await stripe.billingPortal.configurations.list({ limit: 100 });
const mine = existing.data.find((c) => c.metadata?.app === 'solv-stripe');

const payload = {
  business_profile: {
    headline: 'SOLV Languages & De Prof à Pro',
    privacy_policy_url: config.privacyUrl || undefined,
    terms_of_service_url: config.termsUrl || undefined,
  },
  features: {
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    customer_update: { enabled: true, allowed_updates: ['email', 'name', 'address', 'tax_id', 'phone'] },
    subscription_cancel: { enabled: false },
    subscription_update: { enabled: false },
  },
  default_return_url: `${config.appUrl}/`,
  metadata: { app: 'solv-stripe' },
};

const configuration = mine
  ? await stripe.billingPortal.configurations.update(mine.id, payload)
  : await stripe.billingPortal.configurations.create(payload);

console.log(`${mine ? 'Updated' : 'Created'} portal configuration ${configuration.id}`);
console.log(`Add this line to your .env:\n\nSTRIPE_PORTAL_CONFIG_ID=${configuration.id}\n`);
