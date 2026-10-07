import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureInstalmentSchedule } from '../src/instalments.js';
import { fakeStripe } from './helpers.js';

const quiet = { info() {} };

test('wraps a fresh subscription in a schedule that cancels after N iterations', async () => {
  const stripe = fakeStripe({
    subscriptionRetrieve: async () => ({ id: 'sub_1', schedule: null }),
    scheduleCreate: async () => ({
      id: 'sub_sched_1',
      metadata: {},
      phases: [{ start_date: 1700000000, end_date: 1702592000, items: [{ price: 'price_m', quantity: 1 }], automatic_tax: { enabled: true }, collection_method: 'charge_automatically', metadata: {} }],
    }),
  });
  const { schedule, created } = await ensureInstalmentSchedule(stripe, 'sub_1', 3, { logger: quiet });
  assert.equal(created, true);
  const createCall = stripe.calls.find((c) => c.name === 'subscriptionSchedules.create');
  assert.deepEqual(createCall.args[0], { from_subscription: 'sub_1' });
  assert.equal(createCall.args[1].idempotencyKey, 'instalments-create-sub_1');
  const updateCall = stripe.calls.find((c) => c.name === 'subscriptionSchedules.update');
  assert.equal(updateCall.args[0], 'sub_sched_1');
  const params = updateCall.args[1];
  assert.equal(params.end_behavior, 'cancel');
  assert.equal(params.phases.length, 1);
  assert.equal(params.phases[0].iterations, 3);
  assert.equal(params.phases[0].start_date, 1700000000);
  assert.equal(params.phases[0].end_date, undefined, 'iterations and end_date are mutually exclusive');
  assert.deepEqual(params.phases[0].items, [{ price: 'price_m', quantity: 1 }]);
  assert.deepEqual(params.phases[0].automatic_tax, { enabled: true });
  assert.equal(params.metadata.instalments, '3');
  assert.equal(schedule.id, 'sub_sched_1');
});

test('is idempotent when the schedule was already configured', async () => {
  const stripe = fakeStripe({
    subscriptionRetrieve: async () => ({ id: 'sub_1', schedule: 'sub_sched_1' }),
    scheduleRetrieve: async () => ({ id: 'sub_sched_1', metadata: { instalments: '3' }, phases: [] }),
  });
  const { created } = await ensureInstalmentSchedule(stripe, 'sub_1', 3, { logger: quiet });
  assert.equal(created, false);
  assert.ok(!stripe.calls.some((c) => c.name.startsWith('subscriptionSchedules.create')));
  assert.ok(!stripe.calls.some((c) => c.name.startsWith('subscriptionSchedules.update')));
});

test('rejects nonsensical instalment counts', async () => {
  await assert.rejects(() => ensureInstalmentSchedule(fakeStripe(), 'sub_1', 1), /integer >= 2/);
  await assert.rejects(() => ensureInstalmentSchedule(fakeStripe(), 'sub_1', 'three'), /integer >= 2/);
});
