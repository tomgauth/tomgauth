import test from 'node:test';
import assert from 'node:assert/strict';
import { createWebhookHandler, WEBHOOK_EVENTS } from '../src/webhooks.js';
import { createMemoryStore } from '../src/store.js';
import { fakeStripe } from './helpers.js';

const quiet = { info() {}, warn() {}, error() {} };

function session(overrides = {}) {
  return {
    id: 'cs_1',
    mode: 'payment',
    payment_status: 'paid',
    customer: 'cus_1',
    customer_details: { email: 'eleve@example.com', name: 'Élève', address: { country: 'FR' } },
    amount_total: 150000,
    currency: 'eur',
    metadata: { catalog_key: 'dpap_90_days', lookup_key: 'dpap_90d_upfront', instalments: '1' },
    ...overrides,
  };
}

test('paid one-time checkout is recorded and notified', async () => {
  const store = createMemoryStore();
  const notifications = [];
  const handler = createWebhookHandler({ stripe: fakeStripe(), store, logger: quiet, notify: async (n) => notifications.push(n) });
  const result = await handler.handleEvent({ id: 'evt_1', type: 'checkout.session.completed', data: { object: session() } });
  assert.equal(result.handled, true);
  assert.equal(store.records.length, 1);
  assert.equal(store.records[0].email, 'eleve@example.com');
  assert.equal(store.records[0].lookupKey, 'dpap_90d_upfront');
  assert.equal(notifications[0].type, 'purchase');
});

test('duplicate deliveries of the same event are ignored', async () => {
  const store = createMemoryStore();
  const handler = createWebhookHandler({ stripe: fakeStripe(), store, logger: quiet });
  const event = { id: 'evt_dup', type: 'checkout.session.completed', data: { object: session() } };
  await handler.handleEvent(event);
  const second = await handler.handleEvent(event);
  assert.equal(second.duplicate, true);
  assert.equal(store.records.length, 1);
});

test('unpaid (delayed) checkout waits for async_payment_succeeded', async () => {
  const store = createMemoryStore();
  const handler = createWebhookHandler({ stripe: fakeStripe(), store, logger: quiet });
  await handler.handleEvent({ id: 'evt_a', type: 'checkout.session.completed', data: { object: session({ payment_status: 'unpaid' }) } });
  assert.equal(store.records.length, 0);
  await handler.handleEvent({ id: 'evt_b', type: 'checkout.session.async_payment_succeeded', data: { object: session({ payment_status: 'paid' }) } });
  assert.equal(store.records.length, 1);
});

test('instalment checkout turns the subscription into a self-cancelling schedule', async () => {
  const stripe = fakeStripe({
    subscriptionRetrieve: async () => ({ id: 'sub_9', schedule: null }),
    scheduleCreate: async () => ({ id: 'sub_sched_9', metadata: {}, phases: [{ start_date: 1, items: [{ price: 'price_m', quantity: 1 }], metadata: {} }] }),
  });
  const store = createMemoryStore();
  const handler = createWebhookHandler({ stripe, store, logger: quiet });
  await handler.handleEvent({
    id: 'evt_sub',
    type: 'checkout.session.completed',
    data: { object: session({ mode: 'subscription', subscription: 'sub_9', metadata: { catalog_key: 'dpap_90_days', lookup_key: 'dpap_90d_3x', instalments: '3' } }) },
  });
  const update = stripe.calls.find((c) => c.name === 'subscriptionSchedules.update');
  assert.equal(update.args[1].phases[0].iterations, 3);
  assert.equal(store.records[0].instalments, 3);
  assert.equal(store.records[0].subscriptionId, 'sub_9');
});

test('invoice.paid records the payment and reads the subscription from the new parent field', async () => {
  const store = createMemoryStore();
  const handler = createWebhookHandler({ stripe: fakeStripe(), store, logger: quiet });
  await handler.handleEvent({
    id: 'evt_inv',
    type: 'invoice.paid',
    data: { object: { id: 'in_1', customer: 'cus_1', customer_email: 'x@y.z', amount_paid: 52500, currency: 'eur', billing_reason: 'subscription_cycle', parent: { subscription_details: { subscription: 'sub_9' } } } },
  });
  assert.equal(store.records[0].subscriptionId, 'sub_9');
  assert.equal(store.records[0].amountPaid, 52500);
});

test('failures are surfaced through notify', async () => {
  const notifications = [];
  const handler = createWebhookHandler({ stripe: fakeStripe(), store: createMemoryStore(), logger: quiet, notify: async (n) => notifications.push(n) });
  await handler.handleEvent({ id: 'e1', type: 'invoice.payment_failed', data: { object: { id: 'in_2', customer_email: 'x@y.z', attempt_count: 1, hosted_invoice_url: 'https://inv' } } });
  await handler.handleEvent({ id: 'e2', type: 'checkout.session.async_payment_failed', data: { object: session() } });
  assert.deepEqual(notifications.map((n) => n.type), ['invoice_payment_failed', 'payment_failed']);
});

test('unknown events are acknowledged but not handled', async () => {
  const handler = createWebhookHandler({ stripe: fakeStripe(), store: createMemoryStore(), logger: quiet });
  const result = await handler.handleEvent({ id: 'e3', type: 'charge.refunded', data: { object: {} } });
  assert.equal(result.handled, false);
  assert.ok(WEBHOOK_EVENTS.includes('checkout.session.completed'));
});
