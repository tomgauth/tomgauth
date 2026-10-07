/**
 * Send an invoice (or an instalment plan billed by invoice) to a customer from the command line.
 *
 *   npm run invoice -- --email marie@example.com --name "Marie Dupont" --price dpap_90d_upfront --due 14
 *   npm run invoice -- --email marie@example.com --price dpap_90d_3x
 *
 * Options: --email (required), --price lookup key (required), --name, --due days (default 14),
 *          --country ISO code and --line, --city, --postal for the billing address (needed for automatic VAT),
 *          --vat EU VAT ID for business customers (reverse charge).
 */
import { parseArgs } from 'node:util';
import { loadConfig } from '../src/config.js';
import { createStripeClient } from '../src/stripe.js';
import { findPriceByLookupKey } from '../src/catalog.js';
import { resolveStripePrice } from '../src/checkout.js';
import { findOrCreateCustomer, createAndSendInvoice, createInstalmentPlanByInvoice } from '../src/invoices.js';

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string' },
    price: { type: 'string' },
    due: { type: 'string', default: '14' },
    country: { type: 'string' },
    line: { type: 'string' },
    city: { type: 'string' },
    postal: { type: 'string' },
    vat: { type: 'string' },
    memo: { type: 'string' },
  },
});

if (!values.email || !values.price) {
  console.error('Usage: npm run invoice -- --email <email> --price <lookup_key> [--name ...] [--due 14] [--country DE --line ... --city ... --postal ...] [--vat DE123456789]');
  process.exit(1);
}

const price = findPriceByLookupKey(values.price);
if (!price) {
  console.error(`Unknown lookup key ${values.price}`);
  process.exit(1);
}

const config = loadConfig();
const stripe = createStripeClient(config.secretKey);
const stripePrice = await resolveStripePrice(stripe, price.lookupKey);

const address = values.country
  ? { country: values.country, line1: values.line, city: values.city, postal_code: values.postal }
  : undefined;
if (!address && !config.kleinunternehmer) {
  console.warn('No --country given: Stripe Tax needs a billing address. The customer will be asked for it on the hosted invoice page.');
}

const customer = await findOrCreateCustomer(stripe, { email: values.email, name: values.name, address, taxId: values.vat });
console.log(`Customer ${customer.id} (${customer.email})`);

if (price.type === 'instalments') {
  const schedule = await createInstalmentPlanByInvoice(stripe, {
    customer,
    stripePrice,
    price,
    config,
    daysUntilDue: Number(values.due),
  });
  console.log(`Created instalment plan ${schedule.id}: ${price.instalments} monthly invoices, first one sent now.`);
} else {
  const invoice = await createAndSendInvoice(stripe, {
    customer,
    stripePrice,
    price,
    config,
    daysUntilDue: Number(values.due),
    memo: values.memo,
  });
  console.log(`Invoice ${invoice.number} sent to ${customer.email}`);
  console.log(`Hosted invoice page: ${invoice.hosted_invoice_url}`);
}
