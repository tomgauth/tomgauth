import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCheckoutSessionParams, resolveStripePrice } from '../src/checkout.js';
import { findPriceByLookupKey } from '../src/catalog.js';
import { fakeStripe, testConfig } from './helpers.js';

test('one-time price builds a payment-mode session with tax, invoice and terms', () => {
  const price = findPriceByLookupKey('dpap_90d_upfront');
  const params = buildCheckoutSessionParams({ price, stripePriceId: 'price_abc', config: testConfig, customerEmail: 'a@b.c' });
  assert.equal(params.mode, 'payment');
  assert.deepEqual(params.line_items, [{ price: 'price_abc', quantity: 1 }]);
  assert.equal(params.automatic_tax.enabled, true);
  assert.equal(params.tax_id_collection.enabled, true);
  assert.equal(params.billing_address_collection, 'required');
  assert.equal(params.customer_creation, 'always');
  assert.equal(params.customer_email, 'a@b.c');
  assert.equal(params.invoice_creation.enabled, true);
  assert.equal(params.consent_collection.terms_of_service, 'required');
  assert.equal(params.metadata.instalments, '1');
  assert.ok(params.success_url.startsWith('https://pay.example.com/success?session_id='));
  assert.equal(params.subscription_data, undefined);
  assert.ok(!JSON.stringify(params).includes('undefined'));
});

test('instalment price builds a subscription-mode session carrying the instalment count', () => {
  const price = findPriceByLookupKey('dpap_90d_6x');
  const params = buildCheckoutSessionParams({ price, stripePriceId: 'price_sub', config: testConfig });
  assert.equal(params.mode, 'subscription');
  assert.equal(params.metadata.instalments, '6');
  assert.equal(params.subscription_data.metadata.instalments, '6');
  assert.equal(params.customer_creation, undefined);
  assert.equal(params.invoice_creation, undefined);
  assert.equal(params.customer_email, undefined);
});

test('Kleinunternehmer mode turns tax off and adds the §19 footer', () => {
  const price = findPriceByLookupKey('solv_lessons_10_upfront');
  const params = buildCheckoutSessionParams({ price, stripePriceId: 'price_x', config: { ...testConfig, kleinunternehmer: true, termsUrl: '' } });
  assert.equal(params.automatic_tax.enabled, false);
  assert.equal(params.tax_id_collection.enabled, false);
  assert.equal(params.consent_collection, undefined);
  assert.match(params.invoice_creation.invoice_data.footer, /§19 UStG/);
});

test('resolveStripePrice fails loudly when the catalogue was not synced', async () => {
  const stripe = fakeStripe({ pricesList: async () => ({ data: [] }) });
  await assert.rejects(() => resolveStripePrice(stripe, 'dpap_90d_upfront'), /npm run setup:catalog/);
  const ok = fakeStripe();
  const price = await resolveStripePrice(ok, 'dpap_90d_upfront');
  assert.equal(price.id, 'price_123');
  assert.deepEqual(ok.calls[0].args[0], { lookup_keys: ['dpap_90d_upfront'], active: true, limit: 1 });
});
