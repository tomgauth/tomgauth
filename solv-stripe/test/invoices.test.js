import test from 'node:test';
import assert from 'node:assert/strict';
import { findOrCreateCustomer, createAndSendInvoice, createInstalmentPlanByInvoice } from '../src/invoices.js';
import { findPriceByLookupKey } from '../src/catalog.js';
import { fakeStripe, testConfig } from './helpers.js';

test('findOrCreateCustomer reuses an existing customer by email', async () => {
  const stripe = fakeStripe({ customersList: async () => ({ data: [{ id: 'cus_old', email: 'a@b.c' }] }) });
  const customer = await findOrCreateCustomer(stripe, { email: 'a@b.c' });
  assert.equal(customer.id, 'cus_old');
  assert.ok(!stripe.calls.some((c) => c.name === 'customers.create'));
});

test('findOrCreateCustomer creates a customer with address and VAT id', async () => {
  const stripe = fakeStripe();
  const customer = await findOrCreateCustomer(stripe, { email: 'new@b.c', name: 'New', address: { country: 'FR', line1: '1 rue', city: 'Paris', postal_code: '75001' }, taxId: 'FR12345678901' });
  assert.equal(customer.id, 'cus_new');
  const create = stripe.calls.find((c) => c.name === 'customers.create');
  assert.deepEqual(create.args[0].tax, { validate_location: 'immediately' });
  const taxId = stripe.calls.find((c) => c.name === 'customers.createTaxId');
  assert.deepEqual(taxId.args, ['cus_new', { type: 'eu_vat', value: 'FR12345678901' }]);
});

test('createAndSendInvoice creates, adds the line, finalizes and sends', async () => {
  const stripe = fakeStripe();
  const price = findPriceByLookupKey('solv_coaching_12w_upfront');
  const invoice = await createAndSendInvoice(stripe, { customer: { id: 'cus_1' }, stripePrice: { id: 'price_1', type: 'one_time' }, price, config: testConfig, daysUntilDue: 10 });
  assert.equal(invoice.number, 'INV-1');
  const names = stripe.calls.map((c) => c.name);
  assert.deepEqual(names, ['invoices.create', 'invoiceItems.create', 'invoices.finalizeInvoice', 'invoices.sendInvoice']);
  const created = stripe.calls[0].args[0];
  assert.equal(created.collection_method, 'send_invoice');
  assert.equal(created.days_until_due, 10);
  assert.equal(created.automatic_tax.enabled, true);
  assert.equal(created.payment_settings.payment_method_options.customer_balance.bank_transfer.type, 'eu_bank_transfer');
  assert.deepEqual(stripe.calls[1].args[0], { customer: 'cus_1', invoice: 'in_1', pricing: { price: 'price_1' }, quantity: 1 });
});

test('createAndSendInvoice refuses recurring prices', async () => {
  const price = findPriceByLookupKey('dpap_90d_3x');
  await assert.rejects(
    () => createAndSendInvoice(fakeStripe(), { customer: { id: 'c' }, stripePrice: { id: 'p', type: 'recurring' }, price, config: testConfig }),
    /one-time price/,
  );
});

test('instalment plan by invoice creates a send_invoice schedule with N iterations', async () => {
  const stripe = fakeStripe({ scheduleCreate: async (p) => ({ id: 'sub_sched_x', ...p }) });
  const price = findPriceByLookupKey('dpap_90d_6x');
  const schedule = await createInstalmentPlanByInvoice(stripe, { customer: { id: 'cus_1' }, stripePrice: { id: 'price_6x', type: 'recurring' }, price, config: { ...testConfig, kleinunternehmer: true } });
  assert.equal(schedule.end_behavior, 'cancel');
  assert.equal(schedule.phases[0].iterations, 6);
  assert.equal(schedule.default_settings.collection_method, 'send_invoice');
  assert.equal(schedule.default_settings.automatic_tax.enabled, false);
});
