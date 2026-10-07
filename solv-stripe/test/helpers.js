/** A tiny fake of the Stripe SDK surface the app uses, recording every call. */
export function fakeStripe(overrides = {}) {
  const calls = [];
  const record = (name, impl) => async (...args) => {
    calls.push({ name, args });
    return impl ? impl(...args) : {};
  };
  const stripe = {
    calls,
    prices: { list: record('prices.list', overrides.pricesList || (async () => ({ data: [{ id: 'price_123' }] }))) },
    checkout: { sessions: { create: record('checkout.sessions.create', overrides.sessionCreate), retrieve: record('checkout.sessions.retrieve', overrides.sessionRetrieve) } },
    subscriptions: { retrieve: record('subscriptions.retrieve', overrides.subscriptionRetrieve) },
    subscriptionSchedules: {
      create: record('subscriptionSchedules.create', overrides.scheduleCreate),
      update: record('subscriptionSchedules.update', overrides.scheduleUpdate || (async (id, params) => ({ id, ...params }))),
      retrieve: record('subscriptionSchedules.retrieve', overrides.scheduleRetrieve),
    },
    customers: {
      list: record('customers.list', overrides.customersList || (async () => ({ data: [] }))),
      create: record('customers.create', overrides.customerCreate || (async (p) => ({ id: 'cus_new', ...p }))),
      createTaxId: record('customers.createTaxId'),
    },
    invoices: {
      create: record('invoices.create', overrides.invoiceCreate || (async (p) => ({ id: 'in_1', ...p }))),
      finalizeInvoice: record('invoices.finalizeInvoice', async (id) => ({ id, status: 'open' })),
      sendInvoice: record('invoices.sendInvoice', async (id) => ({ id, number: 'INV-1', hosted_invoice_url: 'https://invoice.stripe.com/x' })),
    },
    invoiceItems: { create: record('invoiceItems.create') },
    billingPortal: { sessions: { create: record('billingPortal.sessions.create', async () => ({ url: 'https://billing.stripe.com/p' })) } },
  };
  return stripe;
}

export const testConfig = {
  appUrl: 'https://pay.example.com',
  kleinunternehmer: false,
  termsUrl: 'https://www.solvlanguages.com/terms',
  invoiceBankTransfer: true,
};
