import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { createStripeClient } from './stripe.js';
import { PRODUCTS, findPriceByLookupKey, formatAmount, validateCatalog } from './catalog.js';
import { buildCheckoutSessionParams, resolveStripePrice } from './checkout.js';
import { createWebhookHandler } from './webhooks.js';
import { createFileStore } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp({ config, stripe, store, logger = console }) {
  const app = express();
  const webhooks = createWebhookHandler({
    stripe,
    store,
    logger,
    notify: async (n) => logger.warn?.(`[notify:${n.type}] ${n.message}`),
  });

  // Webhooks need the raw body for signature verification, so this route is registered before any body parser.
  app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], config.webhookSecret);
    } catch (err) {
      logger.error?.(`[webhook] signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    try {
      await webhooks.handleEvent(event);
      res.json({ received: true });
    } catch (err) {
      // Non-2xx makes Stripe retry the event later (for up to 3 days).
      logger.error?.(`[webhook] handler failed for ${event.type} ${event.id}: ${err.stack || err.message}`);
      res.status(500).json({ error: 'handler failed' });
    }
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/healthz', (_req, res) => res.json({ ok: true, livemode: config.livemode }));

  // Catalogue page: lists every offer with a "Buy" button.
  app.get('/', async (_req, res, next) => {
    try {
      res.type('html').send(renderCatalogue(config));
    } catch (err) {
      next(err);
    }
  });

  // Create a Checkout Session and redirect the customer to Stripe.
  app.post('/checkout', async (req, res, next) => {
    try {
      const lookupKey = req.body.lookup_key || req.query.lookup_key;
      const price = findPriceByLookupKey(lookupKey);
      if (!price) return res.status(400).send('Unknown offer');
      const stripePrice = await resolveStripePrice(stripe, lookupKey);
      const params = buildCheckoutSessionParams({
        price,
        stripePriceId: stripePrice.id,
        config,
        customerEmail: req.body.email || undefined,
        locale: req.body.locale || 'auto',
      });
      const session = await stripe.checkout.sessions.create(params);
      res.redirect(303, session.url);
    } catch (err) {
      next(err);
    }
  });

  app.get('/success', async (req, res, next) => {
    try {
      const sessionId = req.query.session_id;
      if (!sessionId) return res.redirect('/');
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const pending = session.payment_status !== 'paid';
      res.type('html').send(
        page(
          'Merci / Thank you',
          `<h1>${pending ? 'Payment pending' : 'Thank you!'}</h1>
           <p>${pending
             ? 'Your payment is being processed (bank payments can take a few days). We will email you as soon as it is confirmed.'
             : `We have received your payment. A receipt was sent to <strong>${escapeHtml(session.customer_details?.email || '')}</strong>.`}</p>
           <form method="post" action="/portal">
             <input type="hidden" name="session_id" value="${escapeHtml(session.id)}">
             <button type="submit">Manage billing, invoices and payment method</button>
           </form>
           <p><a href="/">Back to offers</a></p>`,
        ),
      );
    } catch (err) {
      next(err);
    }
  });

  app.get('/cancel', (_req, res) => {
    res.type('html').send(page('Checkout cancelled', '<h1>No payment was taken.</h1><p><a href="/">Back to offers</a></p>'));
  });

  // Customer Portal: lets the customer download invoices and update their payment method.
  app.post('/portal', async (req, res, next) => {
    try {
      let customerId = req.body.customer_id;
      if (!customerId && req.body.session_id) {
        const session = await stripe.checkout.sessions.retrieve(req.body.session_id);
        customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      }
      if (!customerId) return res.status(400).send('customer_id or session_id required');
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${config.appUrl}/`,
        configuration: config.portalConfigurationId || undefined,
      });
      res.redirect(303, portal.url);
    } catch (err) {
      next(err);
    }
  });

  app.use((err, _req, res, _next) => {
    logger.error?.(err);
    res.status(500).type('html').send(page('Error', `<h1>Something went wrong</h1><pre>${escapeHtml(err.message)}</pre>`));
  });

  return app;
}

function renderCatalogue(config) {
  const sections = PRODUCTS.map((product) => {
    const options = product.prices
      .map(
        (price) => `
        <form method="post" action="/checkout" class="offer">
          <input type="hidden" name="lookup_key" value="${price.lookupKey}">
          <div>
            <strong>${escapeHtml(price.label)}</strong>
            <div class="price">${formatAmount(price.amount)}${price.type === 'instalments' ? ` &times; ${price.instalments}` : ''}</div>
            ${price.type === 'instalments' ? `<small>Total ${formatAmount(price.amount * price.instalments)}, charged monthly</small>` : ''}
          </div>
          <button type="submit">${price.type === 'instalments' ? 'Start instalments' : 'Pay now'}</button>
        </form>`,
      )
      .join('');
    return `<section>
      <p class="business">${escapeHtml(product.business)}</p>
      <h2>${escapeHtml(product.name)}</h2>
      <p>${escapeHtml(product.description)}</p>
      ${options}
    </section>`;
  });
  const vatNote = config.kleinunternehmer
    ? 'Prices are VAT free (§19 UStG).'
    : 'Prices include VAT where applicable. Business customers can enter a VAT ID at checkout.';
  return page('SOLV Languages & De Prof à Pro', `<h1>Our programmes</h1><p class="muted">${vatNote}</p>${sections.join('')}`);
}

function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><link rel="stylesheet" href="/style.css"></head><body><main>${body}</main></body></html>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const errors = validateCatalog();
  if (errors.length) {
    console.error('Catalogue errors:\n - ' + errors.join('\n - '));
    process.exit(1);
  }
  const config = loadConfig({ requireWebhookSecret: true });
  const stripe = createStripeClient(config.secretKey);
  const app = createApp({ config, stripe, store: createFileStore() });
  app.listen(config.port, () => {
    console.log(`solv-stripe listening on ${config.appUrl} (${config.livemode ? 'LIVE' : 'test'} mode)`);
    console.log(`Webhook endpoint: ${config.appUrl}/webhooks/stripe`);
  });
}
