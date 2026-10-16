# Pricing

Pricing depends on the billing provider: Paddle supplies localized, tax-aware
totals, while the other providers continue to use the regional price book.

The regional price book moves on two independent axes that compose.

---

## 1. The two axes

### Region — where the customer is

`Tenant.country` (ISO-3166 alpha-2) maps to a World Bank income band. Only
non-high-income countries are listed in `COUNTRY_BANDS`; anything absent is high
income, which is both the safe commercial default and the smaller table to keep
current.

| Band | Multiplier |
| --- | --- |
| High income | 1.00 |
| Upper-middle | 0.60 |
| Lower-middle | 0.35 |
| Low income | 0.20 |

High income is 1.00 **by definition** — the published list prices already are
high-income prices, so nothing changes for the market the product was originally
priced for.

### Segment — what the customer is

`Tenant.segment`. A bank and a corner shop on the same tier are not the same
customer: the platform carries far more value, risk and support cost for the
first.

| Segment | Multiplier | Band weight |
| --- | --- | --- |
| `sme` | 1× | 1.00 |
| `mid_market` | 2× | 0.75 |
| `enterprise` | 4× | 0.50 |
| `regulated` | 6× | 0.25 |

### Why they are not simply multiplied

A multinational bank operating in Monrovia earns in hard currency and buys at
international rates. A Liberian shop does not. Multiplying the two axes would
hand that bank an 80% discount for its postcode — the exact under-charging this
work exists to fix.

So the regional discount **tapers** with segment. `bandWeight` is the share of
the local discount a segment receives:

```
effective band multiplier = 1 − (1 − bandMultiplier) × bandWeight
final multiplier          = effective band multiplier × segmentMultiplier
```

In Liberia (band 0.20):

| Segment | Effective band | × segment | Final |
| --- | --- | --- | --- |
| SME | 0.20 | 1× | **0.20** |
| Mid-market | 0.40 | 2× | **0.80** |
| Enterprise | 0.60 | 4× | **2.40** |
| Regulated | 0.80 | 6× | **4.80** |

---

## 2. The tiers

Paddle is the pricing source of truth for Paddle billing. Its `PricePreview`
response supplies the displayed, country-localized total; the frontend does not
calculate or reformat prices. Configure the monthly and yearly Paddle price IDs
for each tier on the backend. The expected monthly list prices are:

| Tier | Monthly list price | What it is |
| --- | --- | --- |
| **Starter** | $129 | CRM and marketing basics. |
| Standard | $449 | Core CRM & Marketing. |
| Premium | $1,099 | Full CRM & Marketing + core Services. |
| Enterprise | $2,199 | + full Services, SSO, white-labelling. |
| Executive — small office | $5,599 | + Network Ops. |
| Executive — enterprise | $6,099 | Executive with the enterprise network profile. |

Yearly totals are set by the yearly Paddle prices and are not derived in the
frontend. Set each Paddle price's tax mode to internal/inclusive if the listed
amount is intended to include taxes. Paddle preview totals are what the UI
displays and what is sent to checkout.

**Starter** exists because $449 was the former floor, so the smallest customer
we could serve was one already spending real money on software. It is deliberately
thin — three CRM solutions and one marketing solution, no Services, no Network,
no SSO, no branding, and no industry customization (that is a $100 add-on). A
test asserts Starter's solutions are a strict
subset of Standard's, so upgrading only ever adds.

---

## 3. Currency

Paddle PricePreview provides country-localized totals. The request uses a
server-detected ISO country code only when a trusted request header provides
one; otherwise the browser omits the country and lets Paddle detect the
visitor's location. Paddle's formatted total is displayed verbatim.

The regional price book continues to serve providers that do not supply their
own localized Paddle-style preview.

---

## 4. Who may set what

| Field | Who | Why |
| --- | --- | --- |
| `country` | enterprise admin | They know their billing address. **Audited** — a country change can cut a bill by 80%. |
| `segment` | **system_admin only** | A tenant able to set its own segment would set itself to `sme` and pay a sixth. |

These are **columns on `Tenant`, not `TenantSetting` rows**, for exactly that
reason: settings are tenant-editable by design.

> **Open exposure.** Nothing yet verifies a claimed country against the payment
> method's country. An admin could select Liberia from a high-income market and
> take the discount. Before self-serve paid signup, check the claim against the
> billing address or card BIN. The audit entry is there so the claim is at least
> reviewable.

---

## 5. Payment providers

Billing uses provider adapters because payment availability and capabilities
vary by market.

Set `PAYMENT_PROVIDER` explicitly. For sandbox testing use `PAYMENT_PROVIDER=paddle`
and `PADDLE_ENV=sandbox`; for approved live operation use
`PADDLE_ENV=production`. The backend key prefix and frontend token prefix must
match that explicit choice. Without an explicit Paddle provider, this application
may use its manual early-access behavior.

| Provider | Methods | Recurring | Notes |
| --- | --- | --- | --- |
| `paddle` | Card, PayPal, Apple/Google Pay | ✅ | Merchant of record; seller onboarding required. |
| `manual` | Bank transfer, mobile money, cash | ❌ | **Works anywhere.** No onboarding needed. |
| `flutterwave` | Card, bank transfer, USSD, mobile money | ❌ | Africa-wide rails. ⚠️ see below. |

Providers **declare capabilities** rather than pretending to a common
denominator, so the UI never offers a button that will fail.

### `paddle` — checkout and webhook setup

Set these on the **backend only**:

- `PAYMENT_PROVIDER=paddle`, an explicit matching `PADDLE_ENV`, the corresponding
  server API key (`pdl_sdbx_…` in sandbox or `pdl_live_…` in production),
  `PADDLE_WEBHOOK_SECRET`, and `FRONTEND_URL`.
- The server API key needs permission to create transactions. The application
  does not create Paddle customers through the customer API; checkout collects
  the email and Paddle associates the customer with the completed transaction.
- Monthly and yearly price IDs for Starter, Standard, Premium, and Enterprise:
  `PADDLE_PRICE_<TIER>_MONTH` and `PADDLE_PRICE_<TIER>_YEAR`.
- Executive price IDs:
  `PADDLE_PRICE_EXECUTIVE_SMALL_OFFICE_MONTH`,
  `PADDLE_PRICE_EXECUTIVE_SMALL_OFFICE_YEAR`,
  `PADDLE_PRICE_EXECUTIVE_ENTERPRISE_MONTH`, and
  `PADDLE_PRICE_EXECUTIVE_ENTERPRISE_YEAR`.

Set `VITE_PADDLE_ENV=sandbox` with the sandbox **client-side** token
(`VITE_PADDLE_CLIENT_TOKEN=test_…`) in the frontend environment. For live, use
`VITE_PADDLE_ENV=production` and a live client-side token
(`VITE_PADDLE_CLIENT_TOKEN=live_…`). Never put the server API key in frontend
configuration. Restart Vite after changing frontend environment values. Vite
embeds these values at build time; when building the Docker image, pass
`--build-arg VITE_PADDLE_ENV=production` and
`--build-arg VITE_PADDLE_CLIENT_TOKEN=live_…` (or the matching sandbox values).
Changing environment variables on a running static frontend container does not
change the already-built bundle.
Configure Paddle prices as tax-inclusive when the listed monthly amounts should
include taxes.

For hosted payment links, in the Paddle dashboard go to **Checkout > Checkout
configuration** and set the default payment link to your app's `/checkout`
page (for local sandbox testing, `http://localhost:5173/checkout`). The app page
loads Paddle.js and opens the transaction in a one-page overlay. The Billing
page also opens Paddle Checkout directly as an overlay. Successful checkouts
redirect to `/welcome`. A live payment link must use a real, Paddle-approved
domain; localhost is only appropriate for sandbox testing.

Create a Paddle notification destination for
`POST https://<your-api>/api/account/billing/webhook`, using the same webhook
secret as `PADDLE_WEBHOOK_SECRET`. Subscribe to `transaction.completed`,
`subscription.created`, and `subscription.updated`. The route is registered
before JSON parsing so Paddle's signature is verified against the raw request
body. Customer and subscription IDs are stored as provider-neutral fields.
When `PADDLE_ENV=production`, the webhook route fetches Paddle's live IPv4
`/32` addresses from `https://api.paddle.com/ips`, caches them for five minutes,
and rejects requests outside that current allowlist. A failed or invalid
refresh fails closed with HTTP 503.

Plan changes update an existing Paddle subscription rather than opening a
second recurring checkout. The customer portal is only offered when Paddle
returns direct subscription links. Invoice PDF URLs are
requested only when a user opens an invoice because Paddle's signed links expire.

Paddle does not migrate existing Stripe subscriptions. Cancel any legacy Stripe
subscriptions in Stripe before removing its credentials; the provider-neutral
database migration deliberately discards Stripe customer/subscription IDs rather
than trying to send those IDs to Paddle.

Set `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, and an explicit `PADDLE_ENV` in
the backend environment. `PADDLE_API_KEY` is the server API key from Paddle
Developer tools → Authentication; `VITE_PADDLE_CLIENT_TOKEN` is the separate
browser token. Do not swap these credentials. The backend loads `backend/.env`
by path before initializing modules that read environment variables;
`.env.example` is a template and is not loaded automatically.

### `manual` — the one that works today

Not a fallback. In a market where card penetration is low, mobile money is most
of the digital economy, and no card processor will onboard the merchant, an
invoice with a reference the customer quotes when they pay **is** the billing
system.

1. Tenant picks a plan → `PlatformInvoice` issued with a unique reference
   (`EX-XXXX-XXXX`, no 0/O/1/I — people read these aloud) and instructions from
   config.
2. They pay by bank transfer or mobile money.
3. An operator confirms receipt: `POST /api/account/billing/platform-invoices/:reference/confirm`
   — **system_admin only**, because it is the platform taking money. A tenant
   able to call it would grant itself any plan free.

With nothing configured this degrades to free early access, exactly as before.
When payment instructions are configured, selecting a plan creates a pending
invoice and shows the transfer instructions in Billing; access changes only
after a system administrator confirms receipt.

```
PAY_BANK_NAME, PAY_BANK_ACCOUNT_NAME, PAY_BANK_ACCOUNT_NUMBER, PAY_BANK_SWIFT
PAY_MOBILE_MONEY_NUMBER, PAY_MOBILE_MONEY_NAME, PAY_MOBILE_MONEY_LABEL
PAY_INVOICE_DUE_DAYS (default 14)
```

### ⚠️ Flutterwave is unverified

Written to Flutterwave's documented v3 API, but **never run against a live
merchant account**, and whether Flutterwave will onboard a merchant registered
in **Liberia** is a KYC question only they can answer. Verify both before taking
money with it.

Also note: their webhook auth is a shared secret echoed in `verif-hash`, **not**
an HMAC over the body — it proves the sender knows the secret, not that the body
is untampered. `confirm()` therefore re-fetches the transaction from the API
before anything is trusted.

Other providers with Liberia coverage worth evaluating: **Rapyd**, **Novalnet**,
**MoneyMatrix**, and direct integration with **Orange Money Liberia** or
**Lonestar Cell MTN Mobile Money**. Adding one is a new file in
`providers/` and an entry in the registry.

---

## 6. Changing a price

The regional prices for non-Paddle providers live in
`backend/src/modules/billing/pricing.book.js` and the `PLANS` array in
`plans.config.js`. Paddle amounts live in the Paddle catalog; update the backend
price-ID environment variables when changing Paddle products or prices.
`pricing.test.mjs` pins the regional list values.

The frontend `lib/plans.js` mirrors plan entitlements and base values for
non-Paddle surfaces. Paddle plan totals always come from Paddle PricePreview;
they are never calculated from that mirror.
