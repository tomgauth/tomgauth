import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

function bool(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes'].includes(value.toLowerCase());
}

export function loadConfig({ requireWebhookSecret = false } = {}) {
  const secretKey = required('STRIPE_SECRET_KEY');
  if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_') && !secretKey.startsWith('rk_')) {
    throw new Error('STRIPE_SECRET_KEY does not look like a Stripe secret key.');
  }
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  if (requireWebhookSecret && !webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is required to run the server (run `stripe listen` locally).');
  }
  return {
    secretKey,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret,
    appUrl: (process.env.APP_URL || 'http://localhost:4242').replace(/\/$/, ''),
    port: Number(process.env.PORT || 4242),
    termsUrl: process.env.TERMS_URL || '',
    privacyUrl: process.env.PRIVACY_URL || '',
    // German small-business VAT exemption (§19 UStG). When true, no tax is calculated or shown.
    kleinunternehmer: bool('KLEINUNTERNEHMER', false),
    portalConfigurationId: process.env.STRIPE_PORTAL_CONFIG_ID || '',
    // Offer SEPA bank transfer (virtual IBAN) on invoices. Enable "Bank transfers" in Dashboard > Payment methods first.
    invoiceBankTransfer: bool('INVOICE_BANK_TRANSFER', false),
    livemode: secretKey.startsWith('sk_live_'),
  };
}
