/**
 * The product catalogue for both businesses.
 *
 * Amounts are in cents (EUR). Consumer prices in the EU are shown VAT inclusive,
 * so every price uses tax_behavior "inclusive": Stripe Tax works out the VAT part
 * from the customer's billing address and the product tax code.
 *
 * Edit the amounts here, then run `npm run setup:catalog`. Lookup keys are stable
 * identifiers: changing an amount creates a new Price and moves the lookup key over.
 */

// Verified against Stripe's product tax code list (GET /v1/tax_codes).
export const TAX_CODES = {
  // "Training Services - Live Virtual": live web based education sessions or workshops.
  liveVirtualTraining: 'txcd_20060045',
  // "Tutoring": personal or small group teaching. Alternative for 1:1 lessons.
  tutoring: 'txcd_20060059',
  // "Nontaxable": used when KLEINUNTERNEHMER=true (no VAT charged under §19 UStG).
  nontaxable: 'txcd_00000000',
};

export const CURRENCY = 'eur';

export const PRODUCTS = [
  {
    key: 'solv_french_coaching_programme',
    business: 'SOLV Languages',
    name: 'SOLV Languages: French Coaching Programme (12 weeks)',
    description:
      'Live online French coaching for English-speaking professionals and expatriates, delivered by video with a dedicated teacher.',
    statementDescriptor: 'SOLV LANGUAGES',
    taxCode: TAX_CODES.liveVirtualTraining,
    prices: [
      { lookupKey: 'solv_coaching_12w_upfront', label: 'Pay upfront', amount: 149000, type: 'one_time' },
      { lookupKey: 'solv_coaching_12w_3x', label: '3 monthly instalments', amount: 52000, type: 'instalments', instalments: 3 },
    ],
  },
  {
    key: 'solv_french_lesson_pack_10',
    business: 'SOLV Languages',
    name: 'SOLV Languages: 10 private French lessons',
    description: 'A pack of ten 60-minute live online French lessons with a SOLV teacher.',
    statementDescriptor: 'SOLV LANGUAGES',
    taxCode: TAX_CODES.tutoring,
    prices: [
      { lookupKey: 'solv_lessons_10_upfront', label: 'Pay upfront', amount: 59000, type: 'one_time' },
    ],
  },
  {
    key: 'dpap_90_days',
    business: 'De Prof à Pro',
    name: 'De Prof à Pro: Accompagnement 90 jours',
    description:
      'Programme de coaching de groupe en ligne sur 90 jours pour les professeurs de français indépendants qui veulent créer et développer leur activité en ligne.',
    statementDescriptor: '2PAP ACCOMPAGNEMENT',
    taxCode: TAX_CODES.liveVirtualTraining,
    prices: [
      { lookupKey: 'dpap_90d_upfront', label: 'Paiement en une fois', amount: 150000, type: 'one_time' },
      { lookupKey: 'dpap_90d_3x', label: '3 mensualités', amount: 52500, type: 'instalments', instalments: 3 },
      { lookupKey: 'dpap_90d_6x', label: '6 mensualités', amount: 27000, type: 'instalments', instalments: 6 },
    ],
  },
];

export function allPrices() {
  return PRODUCTS.flatMap((product) => product.prices.map((price) => ({ ...price, product })));
}

export function findPriceByLookupKey(lookupKey) {
  return allPrices().find((price) => price.lookupKey === lookupKey) || null;
}

export function validateCatalog(products = PRODUCTS) {
  const errors = [];
  const seenProductKeys = new Set();
  const seenLookupKeys = new Set();
  for (const product of products) {
    if (!product.key || seenProductKeys.has(product.key)) errors.push(`Duplicate or missing product key: ${product.key}`);
    seenProductKeys.add(product.key);
    if (!product.name) errors.push(`Product ${product.key} has no name`);
    if (!product.taxCode || !/^txcd_\d{8}$/.test(product.taxCode)) errors.push(`Product ${product.key} has an invalid tax code`);
    if (product.statementDescriptor && product.statementDescriptor.length > 22) {
      errors.push(`Product ${product.key} statement descriptor must be 22 characters or fewer`);
    }
    if (!product.prices?.length) errors.push(`Product ${product.key} has no prices`);
    for (const price of product.prices || []) {
      if (!price.lookupKey || seenLookupKeys.has(price.lookupKey)) errors.push(`Duplicate or missing lookup key: ${price.lookupKey}`);
      seenLookupKeys.add(price.lookupKey);
      if (!Number.isInteger(price.amount) || price.amount <= 0) errors.push(`Price ${price.lookupKey} must have a positive integer amount in cents`);
      if (!['one_time', 'instalments'].includes(price.type)) errors.push(`Price ${price.lookupKey} has unknown type ${price.type}`);
      if (price.type === 'instalments' && (!Number.isInteger(price.instalments) || price.instalments < 2)) {
        errors.push(`Price ${price.lookupKey} must define instalments >= 2`);
      }
    }
  }
  return errors;
}

export function formatAmount(amount, currency = CURRENCY, locale = 'de-DE') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);
}
