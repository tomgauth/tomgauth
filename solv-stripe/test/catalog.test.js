import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS, TAX_CODES, validateCatalog, findPriceByLookupKey, allPrices, formatAmount } from '../src/catalog.js';

test('the shipped catalogue is valid', () => {
  assert.deepEqual(validateCatalog(PRODUCTS), []);
});

test('every product uses a verified Stripe tax code', () => {
  const known = new Set(Object.values(TAX_CODES));
  for (const product of PRODUCTS) assert.ok(known.has(product.taxCode), `${product.key} uses unknown tax code ${product.taxCode}`);
});

test('validation catches duplicate lookup keys and bad instalments', () => {
  const broken = [
    { key: 'a', name: 'A', business: 'X', taxCode: 'txcd_20060045', prices: [
      { lookupKey: 'dup', amount: 100, type: 'one_time' },
      { lookupKey: 'dup', amount: 100, type: 'instalments', instalments: 1 },
    ] },
  ];
  const errors = validateCatalog(broken);
  assert.ok(errors.some((e) => e.includes('Duplicate or missing lookup key')));
  assert.ok(errors.some((e) => e.includes('instalments >= 2')));
});

test('lookup keys resolve to prices with their product attached', () => {
  const price = findPriceByLookupKey('dpap_90d_3x');
  assert.equal(price.instalments, 3);
  assert.equal(price.product.key, 'dpap_90_days');
  assert.equal(findPriceByLookupKey('nope'), null);
  assert.equal(allPrices().length, PRODUCTS.reduce((n, p) => n + p.prices.length, 0));
});

test('amounts format as euros', () => {
  assert.match(formatAmount(149000), /1\.490,00/);
});
