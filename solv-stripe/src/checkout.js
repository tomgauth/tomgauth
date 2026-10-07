/**
 * Builds the parameters for a Stripe-hosted Checkout Session.
 *
 * - One-time prices use mode "payment" and ask Stripe to issue an invoice (German customers like a Rechnung).
 * - Instalment prices use mode "subscription"; the webhook then turns the subscription into a
 *   subscription schedule that cancels itself after N payments (see instalments.js).
 * - Stripe Tax is on, the billing address is required (needed for VAT), and VAT IDs can be entered
 *   so a business customer in another EU country gets the reverse charge.
 * - Payment methods are not hard-coded: enable cards, SEPA Direct Debit, Link, Apple Pay and Google Pay
 *   in Dashboard > Settings > Payment methods and Checkout shows the right ones per customer.
 */
export function buildCheckoutSessionParams({ price, stripePriceId, config, customerEmail, locale = 'auto' }) {
  if (!price) throw new Error('price is required');
  if (!stripePriceId) throw new Error('stripePriceId is required');
  const product = price.product;
  const isInstalments = price.type === 'instalments';
  const taxEnabled = !config.kleinunternehmer;

  const metadata = {
    catalog_key: product.key,
    lookup_key: price.lookupKey,
    business: product.business,
    instalments: isInstalments ? String(price.instalments) : '1',
  };

  const params = {
    mode: isInstalments ? 'subscription' : 'payment',
    line_items: [{ price: stripePriceId, quantity: 1 }],
    success_url: `${config.appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.appUrl}/cancel`,
    locale,
    automatic_tax: { enabled: taxEnabled },
    billing_address_collection: 'required',
    tax_id_collection: { enabled: taxEnabled },
    allow_promotion_codes: true,
    metadata,
  };

  if (customerEmail) params.customer_email = customerEmail;

  if (config.termsUrl) {
    // Requires the Terms of Service URL to be set in Dashboard > Settings > Business > Public details.
    params.consent_collection = { terms_of_service: 'required' };
    params.custom_text = {
      terms_of_service_acceptance: {
        message: `I agree to the [terms of service](${config.termsUrl}).`,
      },
    };
  }

  if (isInstalments) {
    params.subscription_data = {
      description: `${product.name} (${price.instalments} monthly instalments)`,
      metadata,
    };
    // Lets SEPA Direct Debit (and other delayed methods) be used for the recurring instalments.
    params.payment_method_collection = 'always';
  } else {
    params.customer_creation = 'always';
    params.payment_intent_data = {
      description: product.name,
      statement_descriptor_suffix: undefined,
      metadata,
    };
    params.invoice_creation = {
      enabled: true,
      invoice_data: {
        description: product.name,
        metadata,
        footer: config.kleinunternehmer
          ? 'Gemäß §19 UStG wird keine Umsatzsteuer berechnet.'
          : undefined,
      },
    };
  }

  return stripUndefined(params);
}

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)]),
    );
  }
  return value;
}

/** Resolve a catalogue lookup key to the live Stripe Price id. */
export async function resolveStripePrice(stripe, lookupKey) {
  const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (!prices.data.length) {
    throw new Error(`No active Stripe price with lookup key "${lookupKey}". Run: npm run setup:catalog`);
  }
  return prices.data[0];
}
