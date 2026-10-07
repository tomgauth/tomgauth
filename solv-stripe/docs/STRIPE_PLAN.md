# Stripe integration plan

Generated on 2026-10-07 with Stripe's `stripe_implementation_planner` (guide `iguide_61VXHVjEXV81JEib441I3qljwif3u`, status: accepted) from this business context:

> Self-employed language educator (Freiberufler) in Berlin running SOLV Languages (live online French courses and coaching for English-speaking professionals and expatriates) and De Prof à Pro (90-day online group coaching for independent French teachers). B2C customers mainly in Europe, paying upfront or in instalments. Online services only. Needs Payments, Invoicing and Tax.

## Decisions taken in the planner's decision trees

| Tree | Path | Outcome |
| --- | --- | --- |
| Boost conversion and revenue | Stripe only > web browser > not Managed Payments (live human-delivered services are ineligible) > standard checkout > needs a checkout integration > **out-of-the-box hosted** | **Stripe-hosted Checkout** (`integration_shape: hosted / checkout_studio / web`) |
| Invoicing: create | invoices are also sent by the business > system creates them on a business event | **Invoicing API** called from `scripts/create-invoice.js` (Dashboard invoicing stays available for one-offs) |
| Invoicing: customise | branding | **Invoice branding** in Dashboard > Settings > Branding; add Steuernummer / USt-IdNr. to the invoice footer template |
| Invoicing: collect | no saved payment method > Stripe hosts the payment UI | **Hosted Invoice Page** (cards, SEPA Direct Debit, bank transfer, 3DS handled by Stripe) |
| Invoicing: reconcile | bank transfers yes > no external system | **Dashboard** is the source of truth; export CSV for the accountant. Bank transfers reconcile automatically via virtual IBANs |
| Subscriptions: pricing | no seats, no volume tiers | **Flat rate** monthly prices for instalments |
| Subscriptions: billing | no free access | **Pay up front** |
| Subscriptions: lifecycle | customers self-manage payment method and invoices, no custom UI | **Customer Portal** (cancellation and plan switching disabled for instalment plans) |
| Subscriptions: revenue recovery | automatic, no custom logic | **Smart Retries + automated emails** (Dashboard settings, no code) |
| Tax | not Managed Payments > collecting VAT today | **Stripe Tax with collection** (`automatic_tax` on Checkout and invoices, VAT ID collection for reverse charge) |

Instalment plans are not a separate planner node. They follow Stripe's documented installment-plan pattern: a subscription schedule with `iterations: N` and `end_behavior: "cancel"` (https://docs.stripe.com/billing/subscriptions/subscription-schedules#installment-plans), applied by the webhook after Checkout.

## Blueprints returned by the planner

1. **Accept a one-time payment with Checkout**: product and price > Checkout Session (mode `payment`) > `checkout.session.completed` webhook. Implemented in `src/checkout.js`, `src/server.js`, `src/webhooks.js`.
2. **Invoice payment with hosted page**: product and customer > invoice with `collection_method: send_invoice` and `days_until_due` > invoice item > send > customer pays on `hosted_invoice_url`. Implemented in `src/invoices.js` and `scripts/create-invoice.js`.
3. **Customer Portal integration**: portal configuration > portal session per authenticated customer > `customer.subscription.updated/deleted`, `payment_method.attached/detached` webhooks. Implemented in `scripts/setup-portal.js` and `POST /portal`.

## Key documentation links from the plan

- Stripe-hosted Checkout: https://docs.stripe.com/payments/accept-a-payment?payment-ui=checkout&ui=stripe-hosted
- Collect taxes in Checkout: https://docs.stripe.com/payments/checkout/taxes
- Tax IDs in Checkout (reverse charge): https://docs.stripe.com/tax/checkout/tax-ids
- Hosted invoices via API: https://docs.stripe.com/invoicing/integration
- Hosted Invoice Page: https://docs.stripe.com/invoicing/hosted-invoice-page
- Bank transfer reconciliation: https://docs.stripe.com/invoicing/bank-transfer#automatic-transfer-reconciliation
- Invoice branding: https://docs.stripe.com/invoicing/customize#brand-customization
- Flat-rate pricing: https://docs.stripe.com/subscriptions/pricing-models/flat-rate-pricing?dashboard-or-api=api
- Subscription schedules (installments): https://docs.stripe.com/billing/subscriptions/subscription-schedules
- Customer Portal: https://docs.stripe.com/customer-management/integrate-customer-portal
- Revenue recovery: https://docs.stripe.com/billing/revenue-recovery
- Stripe Tax: https://docs.stripe.com/tax, registrations: https://docs.stripe.com/tax/registering, EU specifics: https://docs.stripe.com/tax/supported-countries/european-union
- Product tax codes: https://docs.stripe.com/tax/tax-codes (this project uses `txcd_20060045` Training Services - Live Virtual and `txcd_20060059` Tutoring, both verified against `GET /v1/tax_codes`)

## Existing account review

The Stripe account connected to this session (`apprendre-une-langue.fr`, live mode) was reviewed read-only:

- About 20 active products, many created per customer or per instalment ("2PaP Coaching Ambre E- Payment numero 3", "(Copy) ..."). This integration replaces that with one product per programme and one price per payment option, and instalments handled by schedules.
- No product has a tax code, and Stripe Tax is **pending** with `head_office` missing, so no VAT is being calculated. Completing Settings > Tax is a prerequisite.
- Four webhook endpoints exist, all **disabled**, pointing at old WordPress sites (lerussefacile.com, hackunelangue.com, frenchfor.me). They can be deleted; this app registers one new endpoint.
- The API keys supplied for development belong to a different (test) account (`acct_1UNtUc...`). Run the setup scripts with whichever account should hold the catalogue.
