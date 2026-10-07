/**
 * Invoicing for customers who prefer to pay by bank transfer or want a formal invoice first.
 *
 * - One-time invoice: send_invoice with a due date; the customer pays on the Stripe-hosted invoice page
 *   by card, SEPA Direct Debit or bank transfer (Stripe gives each customer a virtual IBAN and reconciles automatically).
 * - Instalments by invoice: a subscription schedule with N monthly phases, each invoice sent by email.
 */

const INVOICE_PAYMENT_SETTINGS = {
  payment_method_types: ['card', 'sepa_debit', 'customer_balance'],
  payment_method_options: {
    customer_balance: {
      funding_type: 'bank_transfer',
      bank_transfer: { type: 'eu_bank_transfer', eu_bank_transfer: { country: 'DE' } },
    },
  },
};

export async function findOrCreateCustomer(stripe, { email, name, address, taxId }) {
  if (!email) throw new Error('email is required');
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length) return existing.data[0];
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    address: address || undefined,
    preferred_locales: ['fr', 'en', 'de'],
    // Lets Stripe Tax calculate from the address when one is provided.
    tax: address ? { validate_location: 'immediately' } : undefined,
  });
  if (taxId) {
    await stripe.customers.createTaxId(customer.id, { type: 'eu_vat', value: taxId });
  }
  return customer;
}

export async function createAndSendInvoice(stripe, { customer, stripePrice, price, config, daysUntilDue = 14, memo }) {
  if (stripePrice.type !== 'one_time') {
    throw new Error('createAndSendInvoice expects a one-time price. Use createInstalmentPlanByInvoice for instalments.');
  }
  const taxEnabled = !config.kleinunternehmer;
  const invoice = await stripe.invoices.create(
    {
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: daysUntilDue,
      automatic_tax: { enabled: taxEnabled },
      pending_invoice_items_behavior: 'exclude',
      // Bank transfer must be enabled in Dashboard > Settings > Payment methods before this can be used.
      payment_settings: config.invoiceBankTransfer ? INVOICE_PAYMENT_SETTINGS : undefined,
      description: memo || price.product.name,
      footer: config.kleinunternehmer ? 'Gemäß §19 UStG wird keine Umsatzsteuer berechnet.' : undefined,
      metadata: { catalog_key: price.product.key, lookup_key: price.lookupKey, business: price.product.business },
    },
    { idempotencyKey: `invoice-${customer.id}-${price.lookupKey}-${Date.now()}` },
  );
  await stripe.invoiceItems.create({
    customer: customer.id,
    invoice: invoice.id,
    pricing: { price: stripePrice.id },
    quantity: 1,
  });
  await stripe.invoices.finalizeInvoice(invoice.id);
  const sent = await stripe.invoices.sendInvoice(invoice.id);
  return sent;
}

export async function createInstalmentPlanByInvoice(stripe, { customer, stripePrice, price, config, daysUntilDue = 7 }) {
  if (price.type !== 'instalments') throw new Error('createInstalmentPlanByInvoice expects an instalment price.');
  const taxEnabled = !config.kleinunternehmer;
  const schedule = await stripe.subscriptionSchedules.create(
    {
      customer: customer.id,
      start_date: 'now',
      end_behavior: 'cancel',
      default_settings: {
        collection_method: 'send_invoice',
        invoice_settings: { days_until_due: daysUntilDue },
        automatic_tax: { enabled: taxEnabled },
        description: `${price.product.name} (${price.instalments} monthly instalments)`,
      },
      phases: [
        {
          items: [{ price: stripePrice.id, quantity: 1 }],
          iterations: price.instalments,
          metadata: { instalments: String(price.instalments) },
        },
      ],
      metadata: { catalog_key: price.product.key, lookup_key: price.lookupKey, instalments: String(price.instalments) },
    },
    { idempotencyKey: `instalment-plan-${customer.id}-${price.lookupKey}-${Date.now()}` },
  );
  return schedule;
}
