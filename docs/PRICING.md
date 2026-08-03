# Pricing

One flat price list cannot serve both ends of this market.

- **$399/mo ≈ L$78,000** is several times what a Liberian SME will ever pay for
  software. The long tail was priced out before it saw a feature.
- **$5,099/mo** is a rounding error to a telecom or a bank, which buys the same
  platform and derives far more from it.

So price moves on two independent axes that compose, and the entry price is no
longer $399.

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

List prices — high income, SME. What anyone actually pays runs through the book.

| Tier | List | What it is |
| --- | --- | --- |
| **Starter** | $99 | New. CRM and marketing basics. |
| Standard | $399 | Core CRM & Marketing. |
| Premium | $999 | Full CRM & Marketing + core Services. |
| Enterprise | $1,999 | + full Services, SSO, white-labelling. |
| Executive | $5,099 | + Network Ops. |

**Starter** exists because $399 was the *floor*, so the smallest customer we
could serve was one already spending real money on software. It is deliberately
thin — three CRM solutions and one marketing solution, no Services, no Network,
no SSO, no branding, and no industry customization (that is a $100 add-on, and a
$99 tier cannot include it). A test asserts Starter's solutions are a strict
subset of Standard's, so upgrading only ever adds.

### What this actually produces

| Customer | Tier | Price |
| --- | --- | --- |
| Liberian shop | Starter | **$20/mo** ≈ L$4,000 |
| Liberian SME | Standard | **$80/mo** ≈ L$15,500 |
| Ghanaian mid-market | Premium | $560/mo |
| South African corporate | Executive | $12,238/mo |
| Liberian bank | Executive | **$24,475/mo** |
| Global bank | Executive | **$30,594/mo** |

Same platform, 1,500× between the ends of it, in the right order.

---

## 3. Currency

**Local prices are displayed. USD is charged.** Every surface showing a local
figure says so.

The price book stores an indicative rate per currency with an `asOf` date —
because a rate with no date is one nobody can tell is stale. Past
`STALE_AFTER_DAYS` (120) the UI warns rather than quietly showing a wrong number.

Amounts round to a tidy local step (L$500, ₦1,000, GH₵5) and round to **nearest,
never up** — quoting more than you charge is the one direction a price may not
be wrong in. A test asserts the error can never exceed half a step.

To refresh rates: edit `CURRENCIES` in `pricing.book.js` and move `RATES_AS_OF`.
The World Bank revises income classifications each July; `COUNTRY_BANDS` should
be checked then.

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

Billing was welded to Stripe, which fails the moment you sell somewhere Stripe
won't onboard you — **Liberia among them**. The processor is now a choice.

`PAYMENT_PROVIDER` selects one. With it unset, a Stripe key means Stripe and no
key means `manual`, so existing deployments are untouched.

| Provider | Methods | Recurring | Notes |
| --- | --- | --- | --- |
| `stripe` | Card, Apple/Google Pay | ✅ | Unchanged. Not available to Liberian merchants. |
| `manual` | Bank transfer, mobile money, cash | ❌ | **Works anywhere.** No onboarding needed. |
| `flutterwave` | Card, bank transfer, USSD, mobile money | ❌ | Africa-wide rails. ⚠️ see below. |

Providers **declare capabilities** rather than pretending to a common
denominator, so the UI never offers a button that will fail.

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

Everything lives in `backend/src/modules/billing/pricing.book.js` and the `PLANS`
array in `plans.config.js`. `pricing.test.mjs` pins every number, so a change
shows up as a changed expectation rather than as a surprise on an invoice.

The frontend deliberately has **no copy of the price book**. Its `lib/plans.js`
mirror carries list prices only — for visitors whose market we don't know — and
real prices come from the API. Money gets one source of truth, and it isn't the
one in the browser.
