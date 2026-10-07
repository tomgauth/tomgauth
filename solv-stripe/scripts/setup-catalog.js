/**
 * Creates or updates the Stripe products and prices defined in src/catalog.js.
 * Safe to run repeatedly: products are matched on metadata.catalog_key, prices on lookup_key.
 * If an amount changed, a new price is created, the lookup key moves over, and the old price is archived.
 */
import { loadConfig } from '../src/config.js';
import { createStripeClient } from '../src/stripe.js';
import { PRODUCTS, CURRENCY, TAX_CODES, validateCatalog, formatAmount } from '../src/catalog.js';

const errors = validateCatalog();
if (errors.length) {
  console.error('Catalogue errors:\n - ' + errors.join('\n - '));
  process.exit(1);
}

const config = loadConfig();
const stripe = createStripeClient(config.secretKey);
if (config.livemode && !process.argv.includes('--live')) {
  console.error('You are using a LIVE secret key. Re-run with --live if you really mean it.');
  process.exit(1);
}

async function findProduct(catalogKey) {
  const result = await stripe.products.search({ query: `active:'true' AND metadata['catalog_key']:'${catalogKey}'`, limit: 1 });
  return result.data[0] || null;
}

async function ensureProduct(def) {
  const taxCode = config.kleinunternehmer ? TAX_CODES.nontaxable : def.taxCode;
  const payload = {
    name: def.name,
    description: def.description,
    tax_code: taxCode,
    statement_descriptor: def.statementDescriptor || undefined,
    metadata: { catalog_key: def.key, business: def.business },
  };
  const existing = await findProduct(def.key);
  if (existing) {
    const changed = existing.name !== payload.name || existing.description !== payload.description || existing.tax_code !== taxCode;
    if (changed) {
      await stripe.products.update(existing.id, payload);
      console.log(`  updated product ${existing.id}`);
    }
    return existing;
  }
  const created = await stripe.products.create(payload, { idempotencyKey: `product-${def.key}` });
  console.log(`  created product ${created.id}`);
  return created;
}

async function ensurePrice(product, def) {
  const recurring = def.type === 'instalments' ? { interval: 'month', interval_count: 1 } : undefined;
  const list = await stripe.prices.list({ lookup_keys: [def.lookupKey], limit: 1 });
  const existing = list.data[0];
  const matches =
    existing &&
    existing.active &&
    existing.unit_amount === def.amount &&
    existing.currency === CURRENCY &&
    existing.product === product.id &&
    (recurring ? existing.recurring?.interval === 'month' : !existing.recurring);
  if (matches) return existing;

  const created = await stripe.prices.create({
    product: product.id,
    currency: CURRENCY,
    unit_amount: def.amount,
    tax_behavior: 'inclusive',
    lookup_key: def.lookupKey,
    transfer_lookup_key: true,
    recurring,
    nickname: def.label,
    metadata: { lookup_key: def.lookupKey, instalments: def.type === 'instalments' ? String(def.instalments) : '1' },
  });
  if (existing) {
    await stripe.prices.update(existing.id, { active: false });
    console.log(`  replaced price ${existing.id} -> ${created.id}`);
  } else {
    console.log(`  created price ${created.id}`);
  }
  return created;
}

console.log(`Syncing catalogue to Stripe (${config.livemode ? 'LIVE' : 'test'} mode, Kleinunternehmer=${config.kleinunternehmer})`);
const rows = [];
for (const def of PRODUCTS) {
  console.log(`\n${def.name}`);
  const product = await ensureProduct(def);
  for (const priceDef of def.prices) {
    const price = await ensurePrice(product, priceDef);
    rows.push({
      lookup_key: priceDef.lookupKey,
      price_id: price.id,
      amount: formatAmount(priceDef.amount),
      billing: priceDef.type === 'instalments' ? `${priceDef.instalments} x monthly` : 'one-time',
    });
  }
}
console.log('\nDone. Prices available to the app:');
console.table(rows);
