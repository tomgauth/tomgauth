import { ensureInstalmentSchedule } from './instalments.js';

/**
 * Webhook handling.
 *
 * Fulfilment is driven by webhooks, never by the success page: the customer may close the browser,
 * and SEPA / bank transfer payments complete hours or days later.
 *
 * Events this integration listens to (select them when creating the endpoint):
 *   checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed,
 *   invoice.paid, invoice.payment_failed, customer.subscription.deleted
 */
export const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'invoice.paid',
  'invoice.payment_failed',
  'customer.subscription.deleted',
];

export function createWebhookHandler({ stripe, store, logger = console, notify = async () => {} }) {
  // Stripe may deliver the same event more than once. Keep processed ids (use a database in production).
  const processed = new Set();

  async function fulfilCheckout(session) {
    await store.recordPurchase({
      kind: 'checkout',
      sessionId: session.id,
      mode: session.mode,
      customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      email: session.customer_details?.email,
      name: session.customer_details?.name,
      country: session.customer_details?.address?.country,
      amountTotal: session.amount_total,
      currency: session.currency,
      catalogKey: session.metadata?.catalog_key,
      lookupKey: session.metadata?.lookup_key,
      instalments: Number(session.metadata?.instalments || 1),
      subscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
      invoiceId: typeof session.invoice === 'string' ? session.invoice : session.invoice?.id,
      at: new Date().toISOString(),
    });
    await notify({
      type: 'purchase',
      message: `New purchase: ${session.metadata?.lookup_key} by ${session.customer_details?.email}`,
      session,
    });
  }

  async function handleEvent(event) {
    if (processed.has(event.id)) {
      logger.info?.(`[webhook] duplicate event ${event.id} ignored`);
      return { handled: false, duplicate: true };
    }
    processed.add(event.id);
    const object = event.data.object;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = object;
        const instalments = Number(session.metadata?.instalments || 1);
        if (session.mode === 'subscription' && instalments > 1 && session.subscription) {
          const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          await ensureInstalmentSchedule(stripe, subscriptionId, instalments, { logger });
        }
        if (session.payment_status === 'paid') {
          await fulfilCheckout(session);
        } else {
          // Delayed payment method (SEPA Direct Debit, bank transfer). Wait for async_payment_succeeded.
          logger.info?.(`[webhook] session ${session.id} completed, payment pending (${session.payment_status})`);
        }
        return { handled: true };
      }
      case 'checkout.session.async_payment_succeeded': {
        await fulfilCheckout(object);
        return { handled: true };
      }
      case 'checkout.session.async_payment_failed': {
        await notify({
          type: 'payment_failed',
          message: `Delayed payment failed for session ${object.id} (${object.customer_details?.email}). Ask the customer to try again.`,
          session: object,
        });
        return { handled: true };
      }
      case 'invoice.paid': {
        const invoice = object;
        await store.recordPurchase({
          kind: 'invoice',
          invoiceId: invoice.id,
          customerId: typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id,
          email: invoice.customer_email,
          amountPaid: invoice.amount_paid,
          currency: invoice.currency,
          subscriptionId: subscriptionIdOf(invoice),
          billingReason: invoice.billing_reason,
          hostedInvoiceUrl: invoice.hosted_invoice_url,
          at: new Date().toISOString(),
        });
        return { handled: true };
      }
      case 'invoice.payment_failed': {
        const invoice = object;
        await notify({
          type: 'invoice_payment_failed',
          message: `Invoice ${invoice.number || invoice.id} for ${invoice.customer_email} failed (attempt ${invoice.attempt_count}). Stripe Smart Retries will retry; the customer can pay at ${invoice.hosted_invoice_url}`,
          invoice,
        });
        return { handled: true };
      }
      case 'customer.subscription.deleted': {
        const subscription = object;
        const instalments = subscription.metadata?.instalments;
        logger.info?.(
          `[webhook] subscription ${subscription.id} ended` + (instalments ? ` (instalment plan of ${instalments} finished or cancelled)` : ''),
        );
        return { handled: true };
      }
      default:
        logger.info?.(`[webhook] unhandled event type ${event.type}`);
        return { handled: false };
    }
  }

  return { handleEvent, processed };
}

function subscriptionIdOf(invoice) {
  // API 2025+ moved `invoice.subscription` to `invoice.parent.subscription_details.subscription`.
  const parent = invoice.parent?.subscription_details?.subscription;
  const legacy = invoice.subscription;
  const value = parent || legacy;
  return typeof value === 'string' ? value : value?.id;
}
