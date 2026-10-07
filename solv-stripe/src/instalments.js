/**
 * Instalment plans.
 *
 * Checkout creates an ordinary monthly subscription. To stop it after N payments we wrap it in a
 * subscription schedule with `iterations: N` and `end_behavior: "cancel"`, which is Stripe's
 * documented pattern for instalment plans (docs.stripe.com/billing/subscriptions/subscription-schedules#installment-plans).
 * The schedule manages the subscription's cancel_at date; nothing else is needed.
 */
export async function ensureInstalmentSchedule(stripe, subscriptionId, instalments, { logger = console } = {}) {
  const count = Number(instalments);
  if (!Number.isInteger(count) || count < 2) {
    throw new Error(`instalments must be an integer >= 2, got ${instalments}`);
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  if (subscription.schedule) {
    const existingId = typeof subscription.schedule === 'string' ? subscription.schedule : subscription.schedule.id;
    const existing = await stripe.subscriptionSchedules.retrieve(existingId);
    if (existing.metadata?.instalments) {
      logger.info?.(`[instalments] subscription ${subscriptionId} already has schedule ${existingId}, skipping`);
      return { schedule: existing, created: false };
    }
    return { schedule: await applyInstalmentPhases(stripe, existing, count), created: false };
  }

  const schedule = await stripe.subscriptionSchedules.create(
    { from_subscription: subscriptionId },
    { idempotencyKey: `instalments-create-${subscriptionId}` },
  );
  const updated = await applyInstalmentPhases(stripe, schedule, count);
  logger.info?.(`[instalments] subscription ${subscriptionId}: schedule ${updated.id} set to ${count} payments then cancel`);
  return { schedule: updated, created: true };
}

async function applyInstalmentPhases(stripe, schedule, count) {
  const phase = schedule.phases?.[0];
  if (!phase) throw new Error(`Schedule ${schedule.id} has no phases`);

  const newPhase = {
    start_date: phase.start_date,
    iterations: count,
    proration_behavior: 'none',
    items: phase.items.map((item) => ({
      price: typeof item.price === 'string' ? item.price : item.price.id,
      quantity: item.quantity ?? 1,
    })),
    metadata: { ...(phase.metadata || {}), instalments: String(count) },
  };
  // Updating phases unsets anything omitted, so carry over what the subscription already had.
  if (phase.automatic_tax) newPhase.automatic_tax = { enabled: Boolean(phase.automatic_tax.enabled) };
  if (phase.collection_method) newPhase.collection_method = phase.collection_method;
  if (phase.collection_method === 'send_invoice' && phase.invoice_settings?.days_until_due) {
    newPhase.invoice_settings = { days_until_due: phase.invoice_settings.days_until_due };
  }

  return stripe.subscriptionSchedules.update(
    schedule.id,
    {
      end_behavior: 'cancel',
      phases: [newPhase],
      metadata: { ...(schedule.metadata || {}), instalments: String(count) },
    },
    { idempotencyKey: `instalments-update-${schedule.id}-${count}` },
  );
}
