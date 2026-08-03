# ExecUI — Business Plan

**Version 1.0 · August 2026 · 5-year horizon (FY2026/27 → FY2030/31)**

All figures in **USD** unless marked. Liberia operates a dual-currency economy; local
costs incurred in **LRD** are converted at **L$195 = US$1** with a ±15% FX sensitivity
applied in §12.

> **How to read this plan.** Every cost line traces to something that exists in the
> codebase — the plan tiers in `billing/plans.config.js`, the AI quotas in
> `AI_LIMITS`, the deployment topology in `deployment.yaml`, the open engineering
> follow-ups in `PRODUCTION_READINESS.md`. Where a number is an assumption rather
> than a fact, it is labelled as one. Assumptions are collected in §13 so a reader
> can change one and see what moves.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [The product and what it is worth](#2-the-product-and-what-it-is-worth)
3. [Market and positioning](#3-market-and-positioning)
4. [Business model and pricing](#4-business-model-and-pricing)
5. [Revenue forecast](#5-revenue-forecast)
6. [Infrastructure: hosting, management and maintenance cost](#6-infrastructure-hosting-management-and-maintenance-cost)
7. [Customer acquisition cost](#7-customer-acquisition-cost)
8. [Distribution cost](#8-distribution-cost)
9. [Marketing cost](#9-marketing-cost)
10. [Office and employee expenditure](#10-office-and-employee-expenditure)
11. [Consolidated P&L, cash flow and funding](#11-consolidated-pl-cash-flow-and-funding)
12. [Unit economics](#12-unit-economics)
13. [Assumptions register](#13-assumptions-register)
14. [Risks and sensitivities](#14-risks-and-sensitivities)
15. [Milestones](#15-milestones)

---

## 1. Executive summary

**ExecUI is a multi-tenant enterprise business operating platform** — CRM, marketing
automation, network operations, business administration, analytics, HR & payroll,
document/contract lifecycle management, helpdesk, and data governance — delivered as
one product with plan-based entitlements and **eleven pre-built industry verticals**.

The product is **already built**. 103 database models, 34 backend modules, ~91
application pages, 39 migrations, a public REST API with generated OpenAPI, SAML/OIDC
SSO, SCIM 2.0 provisioning, GDPR-grade governance tooling, and a documented production
readiness posture. This is not a plan to build software; it is a plan to **commercialize
software that exists**.

### The thesis

West African enterprises — telecom operators, banks, FMCG distributors, hotel groups,
insurers, NGOs and government agencies — buy Salesforce, Zoho, Auvik, Sage and a payroll
package separately, integrate them badly, and pay in scarce foreign exchange. ExecUI
replaces that stack with one platform that **already speaks their object model** (SIM/KYC
registrations, loan pipelines, distributor route visits, grant pipelines, permits) and
defaults to local currency.

### Headline financials

| | **Y1**<br>FY26/27 | **Y2**<br>FY27/28 | **Y3**<br>FY28/29 | **Y4**<br>FY29/30 | **Y5**<br>FY30/31 |
|---|---:|---:|---:|---:|---:|
| Customers (end of year) | 63 | 185 | 417 | 773 | 1,247 |
| **Exit ARR** | $627K | $2.00M | $4.67M | $8.92M | $14.80M |
| Recognized revenue | $265K | $1.31M | $3.33M | $6.79M | $11.86M |
| Gross margin | 79.2% | 83.8% | 84.8% | 85.9% | 86.2% |
| **EBITDA** | −$799K | −$906K | −$948K | −$243K | **+$1.78M** |
| EBITDA margin | −301% | −69% | −28% | −3.6% | **+15.0%** |
| Headcount (end of year) | 18 | 39 | 72 | 113 | 163 |

**Peak cumulative cash requirement: ~$3.55M**, reached at the end of Y4. EBITDA turns
positive in **Y5**; monthly EBITDA breakeven is crossed in **Q3 of Y4**.

**Funding plan:** a **$1.5M seed** now (funds Y1 and most of Y2), followed by a
**$3.5M Series A** in mid-Y2 once ARR crosses $1.2M with >100% net revenue retention.
Total $5.0M against a peak need of $3.55M leaves a 12-month cushion — deliberate, given
FX and payment-rail risk in the region.

### The five cost questions, answered up front

| Question | Y1 | Y3 | Y5 | Notes |
|---|---:|---:|---:|---|
| **Infrastructure — hosting run-rate** | $14K | $105K | $340K | 5.3% → 3.2% → 2.9% of revenue |
| **Infrastructure — management & maintenance** | $189K | $426K | $949K | Platform labor + compliance + tech-debt burn-down (§6.4–6.6) |
| **Customer acquisition (blended CAC)** | $7,460 | $9,224 | $9,494 | Payback 8–14 months by segment (§7) |
| **Distribution** | $20K (7.5%) | $303K (9.1%) | $1,249K (10.5%) | Payment rails, channel margin, marketplace fees (§8) |
| **Marketing programs** | $312K | $1,279K | $2,521K | Excludes S&M payroll (§9) |
| **Office & employee expenditure** | $658K | $2,643K | $6,500K | Payroll + burden + facilities + tools + travel, excl. capex (§10) |

---

## 2. The product and what it is worth

### 2.1 What has been built

| Layer | Detail |
|---|---|
| **Core modules** | CRM (9 solutions / 25 pages) · Marketing (8 / 35) · Network Ops (9 / 21) · Analytics (4 / 10) · Business Services (5 + dashboard) |
| **Industry verticals** | 11 industries, 68 pre-built object types (48 CRM-surface, 20 marketing-surface), list and pipeline kinds with declared stages |
| **Platform modules** | Auth + MFA · SSO (SAML 2.0 / OIDC + PKCE) · SCIM 2.0 · Documents & e-signature · Contract lifecycle · HR & payroll · Helpdesk + customer portal · Workflow automation · Approvals · Custom reporting · Public API + webhooks · Data governance · Federated search · Rewards · AI assistant |
| **Data model** | 103 Prisma models, ~96 tenant-scoped tables, full `ON DELETE CASCADE` tenancy, verified by test |
| **Commercial machinery** | Stripe Checkout with dynamic pricing, plan entitlements, white-labelling, per-tenant settings registry |

### 2.2 Replacement cost — the asset on the balance sheet

The single most important fact for a funder: this codebase would cost a great deal to
rebuild, and that cost is already sunk.

| Component | Est. engineer-months to rebuild |
|---|---:|
| CRM + Marketing + Analytics modules | 26 |
| Network Operations module | 14 |
| Business Services | 6 |
| HR & payroll engine (versioned comp, prorating, progressive tax, pay-run lifecycle) | 11 |
| Documents / e-signature / CLM | 10 |
| Helpdesk + knowledge base + customer portal | 7 |
| Workflow engine + approvals | 7 |
| Public API + webhooks + OpenAPI generation | 5 |
| SSO (SAML + OIDC) + SCIM 2.0 | 6 |
| Governance / DSAR / retention / legal holds | 5 |
| Custom reporting + export + scheduling | 5 |
| Federated search | 3 |
| Industry vertical framework + 11 verticals | 6 |
| Multi-tenancy, entitlements, access model, hardening | 8 |
| Design system, shell, navigation, 91 pages | 14 |
| **Total** | **~133 engineer-months (≈11 engineer-years)** |

At a blended West African senior rate of **$2,800/engineer-month fully loaded**, that is
**~$372K**. At a US blended rate of **$18,000/engineer-month**, **~$2.4M**. The
lower figure is the honest replacement cost given where the team sits; the higher figure
is what a US or European acquirer would have to spend to reproduce it.

**Strategic consequence:** the company's scarce resource is *distribution*, not
engineering. The plan therefore weights spending toward sales, marketing and
implementation, and holds engineering at a level that maintains and extends rather than
rebuilds.

### 2.3 Assets that reduce future cost

- **Registry-driven extensibility.** New API resource, report dataset, search source,
  governance category, industry, or tenant setting = **one registry entry**. Adding an
  industry vertical costs ~3 engineer-days, not a project. This is what makes 11
  verticals affordable and a 12th nearly free.
- **Honest degradation.** With no Stripe, Resend, AI or PostHog key the product is fully
  usable. Pilots and free trials therefore carry **near-zero variable cost**.
- **Compliance already built.** DSAR export/erasure, retention automation and legal holds
  exist. This is normally a $150K+ scramble ahead of a first enterprise or EU deal.

---

## 3. Market and positioning

### 3.1 Where the revenue comes from

**Primary market — West & Central Africa enterprise.** Liberia first (home market, LRD
defaults, `Africa/Monrovia` reference timezone), then Ghana, Sierra Leone, Nigeria and
Côte d'Ivoire, then Kenya and Rwanda as an East African beachhead in Y4.

The eleven shipped verticals map almost exactly onto the regional enterprise landscape:

| Vertical | Regional buyer | Why they buy |
|---|---|---|
| **Telecommunications** | Orange, MTN, Lonestar Cell, Africell | SIM/KYC registration is a **regulatory obligation**; churn watch and field jobs are daily operations |
| **Banking & Financial Services** | Commercial banks, MFIs, mobile-money operators | Loan pipeline, collections, fraud alerts, merchant onboarding |
| **FMCG & Distribution** | Distributors, bottlers, importers | Route visits and outlet coverage are the whole business |
| **NGO & Non-Profit** | The large donor-funded sector | Beneficiary tracking and grant pipelines are **reporting requirements to donors** |
| **Government & Public Sector** | Ministries, agencies, municipalities | Permits, licenses, constituent service requests |
| **Insurance / Healthcare / Education / Hospitality / Real Estate / Manufacturing** | Regional mid-market | Standard vertical CRM |

**Secondary market — global self-serve.** The Standard tier is sold online with no
human touch to SMBs anywhere. This is a margin and credibility play, not the core.

### 3.2 Competitive position

| Competitor | Their price | Where ExecUI wins | Where ExecUI loses |
|---|---|---|---|
| **Salesforce** (Sales + Marketing Cloud) | $165–500/user/mo | Flat org pricing beats per-seat by 5–20× at 30+ users; verticals pre-built; no SI required | Brand, ecosystem, AppExchange, analyst validation |
| **Zoho One** | $37/user/mo | Deeper verticals; integrated Network Ops; payroll built for local tax bands | Price at small headcount; maturity; global support |
| **Auvik / PRTG** (network) | $150+/device/yr | Bundled with the business platform | Depth of device protocol support |
| **Sage / QuickBooks + local payroll** | $50–400/mo | One system; approvals and audit trail shared with the rest of the business | Accounting depth — ExecUI records transactions, it is **not a general ledger** |
| **Local custom builds / spreadsheets** | "Free" | Everything | Incumbency, and "free" is hard to argue with |

**The honest competitive read:** ExecUI does not beat Salesforce on capability. It beats
Salesforce on *total cost at regional headcount*, on *time-to-value* (verticals ship
pre-built), and on *not requiring a systems integrator*. The pitch is displacement of a
fragmented five-tool stack, not feature-for-feature superiority.

### 3.3 Market sizing (bottom-up)

| Segment | Addressable organizations | Realistic 5-yr penetration | Implied customers |
|---|---:|---:|---:|
| Liberia — enterprises with 25+ staff | ~1,400 | 9% | 126 |
| Ghana + Sierra Leone + Côte d'Ivoire | ~11,000 | 2.5% | 275 |
| Nigeria (mid-market only) | ~48,000 | 0.7% | 336 |
| Kenya + Rwanda (from Y4) | ~19,000 | 0.6% | 114 |
| Global self-serve (Standard tier) | — | — | 396 |
| **Total** | | | **1,247** |

The Y5 target of 1,247 customers requires **penetrating well under 1%** of the regional
mid-market outside the home country. The plan is not sizing-constrained; it is
execution-constrained.

---

## 4. Business model and pricing

### 4.1 Current pricing (as implemented in `plans.config.js`)

| Plan | Price/mo | ARR | CRM | Marketing | Services | Network | SSO | Branding | AI req/mo |
|---|---:|---:|---|---|---|---|---|---|---:|
| **Standard** | $399 | $4,788 | 5 of 9 | 5 of 8 | — | — | — | — | 300 |
| **Premium** | $999 | $11,988 | all 9 | all 8 | 3 of 5 | — | — | — | 1,500 |
| **Enterprise** | $1,999 | $23,988 | all 9 | all 8 | all 5 | — | ✅ | ✅ | 6,000 |
| **Executive** | $5,099<br>($5,599 datacenter) | $61,188 | all 9 | all 8 | all 5 | ✅ | ✅ | ✅ | 30,000 |
| **Custom** | $49/solution<br>(min 8) + $100 industry | ~$7,080 | pick | pick | — | — | — | — | 1,500 |

Pricing is **per organization, not per seat** — the single most important commercial
decision in the product. It makes ExecUI cheaper than Salesforce above roughly 25 users
and removes the "who really needs a licence" negotiation that stalls African enterprise
deals.

### 4.2 Pricing risk and the recommended change

**This is the plan's most significant strategic flag.** $399/month is approximately
L$78,000/month. For a 30-person Liberian trading company that is a serious line item;
for Lonestar Cell or a commercial bank, $5,099/month is nearly a rounding error.

The current single global price list therefore **prices out the SME long tail and
under-charges the enterprise anchor tenants simultaneously.**

**Recommendation — three changes, none requiring architectural work:**

1. **Add a regional price book.** A `pricing.region` tenant setting selecting `global`
   or `waf` (West Africa), with Standard at **$149** and Premium at **$399** in the
   regional book. The settings registry (`settings.registry.js`) already supports
   per-tenant configuration with plan gating; this is a registry entry plus a lookup in
   `priceFor()` — an estimated **6–8 engineer-days**.
2. **Add a Starter tier at $79/month** (2 CRM solutions + 1 industry) as a land motion.
   Modelled in the forecast as a subset of Standard.
3. **Introduce enterprise usage anchors** on Executive — price the datacenter network
   profile by monitored device count above 250 devices. The `NetworkDevice` count is
   already tenant-scoped and queryable.

The forecast in §5 is built on **current pricing**, so it is conservative on volume in
the SME segment and does not claim credit for the uplift these changes would produce.

### 4.3 Revenue lines

| Line | Y5 share | Notes |
|---|---:|---|
| Subscription (recurring) | 88% | The core |
| Implementation & onboarding (one-off) | 6% | $1,500 (Premium) → $18,000 (Executive) |
| Training & certification | 2% | Admin certification, partner enablement |
| Premium support (SLA) | 3% | 4-hour response tier, +18% of subscription |
| Custom vertical development | 1% | Bespoke industry object sets |

---

## 5. Revenue forecast

### 5.1 Customer count (end of year)

| Plan | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---:|---:|---:|---:|---:|
| Standard | 35 | 95 | 210 | 380 | 600 |
| Premium | 14 | 45 | 105 | 200 | 330 |
| Enterprise | 5 | 18 | 42 | 82 | 140 |
| Executive | 2 | 7 | 18 | 36 | 62 |
| Custom | 7 | 20 | 42 | 75 | 115 |
| **Total** | **63** | **185** | **417** | **773** | **1,247** |

### 5.2 ARR and recognized revenue

| ($K) | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---:|---:|---:|---:|---:|
| Standard ARR | 168 | 455 | 1,005 | 1,819 | 2,873 |
| Premium ARR | 168 | 539 | 1,259 | 2,398 | 3,956 |
| Enterprise ARR | 120 | 432 | 1,007 | 1,967 | 3,358 |
| Executive ARR | 122 | 428 | 1,101 | 2,203 | 3,794 |
| Custom ARR | 50 | 142 | 297 | 531 | 814 |
| **Exit ARR** | **627** | **1,996** | **4,670** | **8,918** | **14,795** |
| New ARR added in year | 627 | 1,369 | 2,674 | 4,248 | 5,877 |
| **Recognized revenue** | **265** | **1,311** | **3,333** | **6,794** | **11,857** |
| YoY ARR growth | — | 218% | 134% | 91% | 66% |

Recognized revenue is modelled as the average of opening and closing ARR, which assumes
customers land evenly through the year. Y1 is discounted below the straight average to
reflect a slow first two quarters.

### 5.3 Retention assumptions

| Segment | Gross logo retention | Net revenue retention |
|---|---:|---:|
| Standard | 78% | 92% |
| Premium | 88% | 108% |
| Enterprise | 92% | 116% |
| Executive | 94% | 121% |
| **Blended** | **84%** | **107%** |

Expansion comes from plan upgrades (Standard → Premium is the dominant path), industry
add-ons, premium support attach, and the datacenter network profile uplift. The
platform's entitlement model makes an upgrade a **one-field change**, which is why
upgrade conversion is assumed high (14% of Standard customers per year).

---

## 6. Infrastructure: hosting, management and maintenance cost

This section answers the first cost question in full. It separates four things that get
conflated: **what the servers cost**, **what the third-party services cost**, **what the
people who keep it running cost**, and **what fixing the known technical debt costs**.

### 6.1 Hosting run-rate — line item detail

Derived from the actual deployment topology in `deployment.yaml` and `docker-compose.yml`:
a three-tier stack (nginx/SPA → Node/Express → PostgreSQL), plus the object storage
volume, plus the Redis dependency that `PRODUCTION_READINESS.md` §3 and §7 identify as
required before horizontal scaling.

**Year 1 — single region, ~63 tenants**

| Component | Spec | $/month |
|---|---|---:|
| Managed Kubernetes control plane | 1 cluster | 75 |
| Application nodes | 3 × 4 vCPU / 16 GB | 420 |
| Managed PostgreSQL (HA + PITR) | 4 vCPU / 16 GB, 100 GB | 220 |
| Managed Redis | rate limiter + shared cache | 60 |
| Object storage | 250 GB (uploads, documents, avatars) | 8 |
| CDN + egress | ~500 GB/mo | 45 |
| Monitoring / logging / APM | | 150 |
| Staging environment | scaled-down replica | 95 |
| CI/CD minutes | GitHub Actions | 40 |
| WAF / DDoS / DNS / TLS | | 60 |
| Offsite encrypted backups | 30-day retention + WAL archive | 35 |
| **Total** | | **$1,208** |
| **Annual** | | **$14,496** |

**Year 3 — two regions, ~417 tenants (18 on Network Ops)**

| Component | $/month |
|---|---:|
| Kubernetes control planes (2 regions) | 150 |
| Application nodes (10 × 4 vCPU / 16 GB + autoscale headroom) | 1,950 |
| PostgreSQL HA primary + 2 read replicas (16 vCPU / 64 GB, 1 TB) | 2,100 |
| Redis cluster | 280 |
| Object storage (8 TB) | 190 |
| CDN + egress (~12 TB/mo) | 780 |
| Time-series store — network telemetry ingestion | 650 |
| Monitoring / logging / APM | 950 |
| Staging + per-PR preview environments | 420 |
| CI/CD | 180 |
| WAF / DDoS / DNS | 220 |
| Backups + PITR + cross-region DR replica | 520 |
| Job queue infrastructure | 180 |
| **Total (exit-of-year run rate)** | **$8,570** |
| **Annual** | **~$103,000** |

> The monthly figures above are an **exit-of-year snapshot**; the annual total in the
> five-year table below is $105K because infrastructure grows through the year rather
> than stepping up on 1 January. The same applies to Y4 and Y5.

**Five-year hosting run-rate**

| | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---:|---:|---:|---:|---:|
| Hosting cost | $14K | $42K | $105K | $205K | $340K |
| % of revenue | 5.3% | 3.2% | 3.2% | 3.0% | 2.9% |
| Cost per customer/year | $222 | $227 | $252 | $265 | $273 |

**Why cost per customer rises rather than falls.** Network Ops tenants are far heavier
than everyone else — device polling, flow records and traffic analysis are continuous
ingestion, not request/response. Executive-plan tenants grow from 3% to 5% of the base
over the period, and they carry roughly **9× the infrastructure cost** of a Standard
tenant. Economies of scale in the shared tier are real but are partly offset by mix
shift.

### 6.2 Per-tenant infrastructure cost by plan

| Plan | Infra $/mo | Price $/mo | Infra as % of price |
|---|---:|---:|---:|
| Standard | $9 | $399 | 2.3% |
| Premium | $16 | $999 | 1.6% |
| Enterprise | $27 | $1,999 | 1.4% |
| Executive (office profile) | $84 | $5,099 | 1.6% |
| Executive (datacenter profile) | $178 | $5,599 | 3.2% |

Every tier is comfortably gross-margin-positive on infrastructure alone. The datacenter
network profile is the thinnest, and it is the tier where the **usage-based anchor
recommended in §4.2 matters most** — a tenant monitoring 2,000 devices costs materially
more than one monitoring 200, and today pays the same.

### 6.3 Third-party services — and the one cost lever that matters

| Service | Pricing | Y1 | Y3 | Y5 |
|---|---|---:|---:|---:|
| **Stripe** (international cards) | 2.9% + $0.30 | $7.8K | $98K | $350K |
| **Paystack / Flutterwave** (regional collection) | 1.5% local, 3.8% intl | included above | included | included |
| **Resend** (transactional email) | $20/mo → $0.0004/email | $0.3K | $9K | $31K |
| **PostHog** (product analytics) | 1M events free, then ~$0.00031 | $0.4K | $7K | $22K |
| **AI provider** (default: Groq) | ~$0.000056/request | $0.3K | $4K | $14K |
| **Error tracking / status page / misc** | | $2.5K | $8K | $21K |
| **Total (excl. payment processing)** | | **$3.5K** | **$28K** | **$88K** |

#### The AI cost lever

`lib/ai.js` defaults to Groq's `llama-3.1-8b-instant` with a hard 320-token output cap,
1,200-character input clamp and 4-turn history limit. Per request that is roughly 600
input + 320 output tokens.

| Model choice | Cost/request | Executive tenant at full 30,000 req/mo | 62 Executive tenants (Y5) |
|---|---:|---:|---:|
| Groq Llama 3.1 8B (current default) | $0.000056 | **$1.68/mo** | **$1,250/yr** |
| Mid-tier model (~$0.60/M in, $2.40/M out) | $0.0011 | $33/mo | $24,600/yr |
| Frontier model (~$3/M in, $15/M out) | $0.0066 | **$198/mo** | **$147,300/yr** |

**This is the single largest discretionary COGS decision in the business.** Moving the
default AI backend to a frontier model would consume **3.9% of Executive-tier revenue**
and cut blended gross margin by roughly 1.2 points. The architecture already protects
against this correctly — quotas are enforced server-side in `lib/aiQuota.js`, the client
is provider-agnostic, and unconfigured installs cost $0.

**Recommendation:** keep the cheap model as the default for high-volume, low-stakes
surfaces (content generation, summaries) and route only the low-volume, high-value
surfaces (Einstein deal insights, SOP generation) to a frontier model. Budget
**$45K/year by Y5** for tiered AI, not $147K.

### 6.4 Infrastructure management — the people

Servers do not manage themselves. This is the labor line that a hosting-only estimate
misses.

| Role | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---:|---:|---:|---:|---:|
| DevOps / SRE headcount | 1.0 | 2.0 | 3.0 | 5.0 | 7.0 |
| Security engineer | — | 0.5 | 1.0 | 2.0 | 3.0 |
| Database / platform engineer | — | — | 1.0 | 1.5 | 2.0 |
| **Loaded cost** | **$37K** | **$88K** | **$168K** | **$291K** | **$429K** |

Loaded at $36.6K/head (see §10.2 for the salary model). On-call rotation compensation is
included from Y2 at $250/week per engineer on call.

### 6.5 Maintenance — technical debt burn-down

`PRODUCTION_READINESS.md` closes with a prioritized list of open follow-ups. Costing them
is the difference between a plan and a wish. Effort is in engineer-weeks at **$1,850/
engineer-week loaded** (regional senior rate).

| # | Item | Effort | One-off | Recurring/yr | Trigger |
|---|---|---:|---:|---:|---|
| 1 | **Redis for shared rate limit + cache** — blocks horizontal scaling today | 3.5 wk | $6.5K | $720–3,400 | Before 2nd app instance (Q2 Y1) |
| 2 | **Signed, expiring object-store URLs** — uploads are unguessable but unauthorized | 2.5 wk | $4.6K | — | Before first regulated tenant (Q3 Y1) |
| 3 | **Job queue** for webhooks, report schedules, CLM/HR/retention tickers (all in-process today) | 5 wk | $9.3K | $2.2K | Before 3rd app instance (Y2) |
| 4 | **WCAG 2.1 AA audit + remediation** — currently baseline only | 9 wk + external | $10K audit<br>$16.7K fix | $6K re-test | Before first government tender (Y2) |
| 5 | **Per-module API integration tests + Playwright smoke suite** | 10 wk | $18.5K | CI minutes | Continuous, Y1–Y2 |
| 6 | **Quarterly DR restore rehearsal** — RTO/RPO are policy, not yet measured | 1 wk/qtr | — | $7.4K | From Q2 Y1 |
| 7 | **Postgres partitioning + read replicas** at scale | 5 wk | $9.3K | in §6.1 | ~Y3, at 300 tenants |
| 8 | **`backend/package.json` duplicate dependency keys** — `@prisma/client` declared as both `7.9.1` and `^5.22.0`, `bcrypt` as both `^6.0.0` and `^5.1.1`; JSON takes the last value, so Prisma 5 resolves against a `prisma` CLI pinned to 7.9.1 | 0.2 wk | $0.4K | — | **Immediate** |
| | **Subtotal** | **~36 wk** | **$75.3K** | **$16.3K–19.0K** | |

Item 8 is trivial to fix and genuinely broken today — it is listed because a plan that
only counts big items is not a maintenance plan.

### 6.6 Ongoing maintenance, security and compliance

| Item | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---:|---:|---:|---:|---:|
| **Routine maintenance labor** — dependency upgrades, framework majors, security patching, bug-fix capacity. Budgeted at **20% of engineering payroll** for a 103-model codebase | $56K | $92K | $164K | $270K | $390K |
| SOC 2 Type II (audit + Vanta-class tooling) | $38K | $26K | $28K | $31K | $34K |
| Annual penetration test | $18K | $20K | $22K | $26K | $30K |
| Cyber liability insurance | $9K | $12K | $16K | $22K | $28K |
| Regional data-protection registration (NDPR Nigeria, Ghana DPA, Liberia) | $6K | $9K | $12K | $15K | $18K |
| Technical-debt burn-down (§6.5, phased) | $25K | $35K | $16K | $18K | $20K |
| **Total maintenance & compliance** | **$152K** | **$194K** | **$258K** | **$382K** | **$520K** |

### 6.7 Total infrastructure cost of ownership

| ($K) | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---:|---:|---:|---:|---:|
| Hosting run-rate (§6.1) | 14 | 42 | 105 | 205 | 340 |
| Third-party services (§6.3) | 4 | 12 | 28 | 52 | 88 |
| Infrastructure management labor (§6.4) | 37 | 88 | 168 | 291 | 429 |
| Maintenance & compliance (§6.6) | 152 | 194 | 258 | 382 | 520 |
| **Total TCO** | **207** | **336** | **559** | **930** | **1,377** |
| % of revenue | 78% | 26% | 17% | 14% | 12% |

**The headline for a funder:** hosting is cheap and stays cheap (under 3.5% of revenue
throughout). **The real infrastructure cost is people and compliance**, and it is
front-loaded — 78% of Y1 revenue, falling to 12% by Y5. This is the shape of a business
that has already built its product and is now paying to make it enterprise-sellable.

---

## 7. Customer acquisition cost

### 7.1 Blended CAC

| | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---:|---:|---:|---:|---:|
| S&M payroll | $95K | $290K | $620K | $1,020K | $1,450K |
| Sales commission | $63K | $137K | $241K | $382K | $529K |
| Marketing programs | $312K | $668K | $1,279K | $1,998K | $2,521K |
| **Total S&M** | **$470K** | **$1,095K** | **$2,140K** | **$3,400K** | **$4,500K** |
| Net new customers | 63 | 122 | 232 | 356 | 474 |
| **Blended CAC** | **$7,460** | **$8,975** | **$9,224** | **$9,551** | **$9,494** |
| Blended new-customer ACV | $9,952 | $11,221 | $11,526 | $11,933 | $12,399 |
| **CAC / ACV** | 0.75 | 0.80 | 0.80 | 0.80 | 0.77 |
| **Magic number** | 1.33 | 1.25 | 1.25 | 1.25 | 1.31 |

A magic number of 1.25 is deliberately set at "very good but achievable." It reflects a
genuine structural advantage — **regional sales labor costs roughly one-fifth of US sales
labor** — without assuming implausible efficiency.

### 7.2 Bottoms-up CAC by segment (Y3 steady state)

| Segment | S&M allocation | New custs | **CAC** | ACV | Gross profit/yr | **Payback** | Motion |
|---|---:|---:|---:|---:|---:|---:|---|
| **Standard** | 15% · $321K | 115 | **$2,791** | $4,788 | $4,060 | **8.2 mo** | Self-serve + PLG, content/SEO led |
| **Premium** | 25% · $535K | 60 | **$8,917** | $11,988 | $10,166 | **10.5 mo** | Inside sales, 1 demo + 1 pilot |
| **Custom** | 8% · $171K | 22 | **$7,773** | $7,080 | $6,004 | **15.5 mo** | Inside sales, longer config cycle |
| **Enterprise** | 27% · $578K | 24 | **$24,075** | $23,988 | $20,342 | **14.2 mo** | Field AE + solution engineer |
| **Executive** | 25% · $535K | 11 | **$48,636** | $61,188 | $51,888 | **11.2 mo** | Field AE + SE + exec sponsor, 6–9 mo cycle |

**The one number to watch: Custom at 15.6 months.** The Custom plan requires a
consultative solution-picking conversation but produces a below-Premium ACV. It is the
worst payback in the book.

**Recommendation:** convert Custom from an assisted sale into a **self-serve
configurator** — the plan builder already computes price from selected solutions in
`priceFor()`, so the pricing logic exists. Moving Custom to self-serve would cut its CAC
to roughly $3,400 and its payback to under 7 months. Estimated build: **3 engineer-weeks**.

### 7.3 CAC build-up — what makes up an Enterprise sale ($24,075)

| Component | Cost | Basis |
|---|---:|---|
| Field AE time | $6,900 | 34% of a $61K-loaded AE's year across 3 closed deals + pipeline |
| Solution engineer (demos, pilot config) | $3,850 | 22 hours at $175/hr loaded |
| SDR / outbound prospecting | $2,600 | 42 touches to 1 qualified opportunity |
| Marketing-sourced pipeline share | $5,700 | Allocated program spend per Enterprise MQL→close |
| Travel (in-country + regional) | $2,300 | 4 site visits |
| Pilot/POC infrastructure & support | $1,150 | 6-week pilot, dedicated support |
| Contracting, legal review, procurement | $1,575 | Enterprise legal and vendor-onboarding cycle |
| **Total** | **$24,075** | |

### 7.4 CAC efficiency levers already in the product

These are real and reduce CAC without new spend:

| Lever | Effect on CAC |
|---|---|
| **Zero-cost pilots.** Honest degradation means a trial with no Stripe/Resend/AI keys costs ~$9/month of infrastructure | Removes pilot cost from the CAC of every segment |
| **Pre-built verticals.** A telecom sees SIM/KYC and churn watch in the first demo | Shortens Enterprise cycle by an estimated 6–8 weeks |
| **`DEFAULT_PLAN = "executive"`.** New tenants land on the full platform | Drives expansion, not acquisition — but raises NRR, which lowers effective CAC |
| **Public API + OpenAPI.** Removes "can it integrate?" as a blocking objection | Fewer lost late-stage Enterprise deals |
| **Governance module.** DSAR, retention, legal holds answer the legal review | Removes the standard 4–6 week enterprise security-review stall |

---

## 8. Distribution cost

Distribution cost is **not additional spend** — it is a decomposition of costs already
sitting inside COGS (payment processing, onboarding delivery) and S&M (channel
commission, marketplace fees). It is broken out here because it behaves differently from
direct-sales cost: it scales with revenue rather than with headcount, and it is the
category most exposed to regional payment-rail constraints.

### 8.1 Payment rails — a genuine regional constraint

**Stripe does not support merchants incorporated in Liberia.** The codebase integrates
Stripe (`account.controller.js`, `billing.service.js`) and prices dynamically through
inline `price_data`, which is the right architecture — but collection requires either a
foreign merchant entity or regional processors.

| Rail | Coverage | Cost | Notes |
|---|---|---:|---|
| **Stripe** (via a Delaware or UK entity) | International cards, USD | 2.9% + $0.30<br>+1.0% cross-border<br>+1.0% FX | Requires a foreign entity — see §8.2 |
| **Paystack** | Nigeria, Ghana, South Africa, Kenya | 1.5% local (capped)<br>3.9% international | Owned by Stripe; strong regional coverage |
| **Flutterwave** | Pan-African incl. Liberia | 1.4% local · 3.8% intl | Broadest West African coverage |
| **Mobile money** (MTN MoMo, Orange Money) | Liberia, Ghana, Côte d'Ivoire | 1.5–3.0% | Essential for SME tier; high trust locally |
| **Bank transfer / invoice** | Enterprise | ~0.4% + 6 admin-hours/invoice | Dominant for Enterprise and Executive in-region |

**Blended cost of collection: 2.95% of revenue**, weighted by the expected mix (60%
international card, 25% regional processor, 15% bank transfer).

**Recommendation:** incorporate a **Delaware C-corp or UK Ltd** as the contracting and
billing entity, with a Liberian operating subsidiary employing the team. This unlocks
Stripe, is what institutional investors will require anyway, and costs roughly
**$4,500 to establish plus $9,000/year** to maintain (registered agent, filings,
transfer pricing documentation). Budgeted in G&A.

### 8.2 Channel and partner distribution

| Channel | Margin/fee | Y1 | Y3 | Y5 | Rationale |
|---|---:|---:|---:|---:|---|
| **Direct** (no distribution cost beyond payments) | — | 92% of rev | 71% | 58% | Default |
| **Referral partners** (accountants, IT consultants, ISPs) | 15% of yr-1 ACV | 5% | 11% | 14% | Cheap, low-commitment |
| **Reseller / SI partners** (regional integrators) | 25% recurring | 3% | 12% | 17% | Carries implementation; essential outside the home market |
| **Telecom / bank white-label** | 30% revenue share | — | 4% | 8% | **The branding module already supports this** — a telecom resells ExecUI to its SME customers under its own brand |
| **Cloud marketplaces** (AWS / Azure) | 3% listing fee | — | 2% | 3% | Unlocks committed cloud-spend budget for larger buyers |

**The white-label channel deserves emphasis.** `docs/TENANCY.md` documents complete
white-labelling — product name, logo, primary color, support email, hide-powered-by,
email from-name — applied to the customer portal, signing page and app shell, gated to
Enterprise/Executive. A telecom operator selling ExecUI to its own SME base under its
own brand is a **distribution channel the product was built for and that costs almost
nothing to enable**.

### 8.3 Implementation and onboarding delivery

| Plan | Onboarding hours | Delivered cost | Charged | Margin |
|---|---:|---:|---:|---:|
| Standard | 0 (self-serve) | $0 | $0 | — |
| Premium | 10 | $410 | $1,500 | 73% |
| Custom | 16 | $656 | $2,000 | 67% |
| Enterprise | 45 | $1,845 | $6,500 | 72% |
| Executive | 130 | $5,330 | $18,000 | 70% |

At $41/hour loaded for a regional implementation consultant. Professional services run
at ~70% gross margin — healthy, and deliberately not a loss-leader.

### 8.4 Total distribution cost

| ($K) | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---:|---:|---:|---:|---:|
| Payment processing (2.95%) | 8 | 39 | 98 | 200 | 350 |
| Referral fees | 3 | 18 | 47 | 105 | 190 |
| Reseller margin | 6 | 34 | 87 | 210 | 385 |
| White-label revenue share | — | 8 | 32 | 88 | 178 |
| Marketplace listing fees | — | 3 | 12 | 34 | 68 |
| Onboarding delivery cost | 3 | 11 | 27 | 48 | 78 |
| **Total distribution cost** | **20** | **113** | **303** | **685** | **1,249** |
| **% of revenue** | **7.5%** | **8.6%** | **9.1%** | **10.1%** | **10.5%** |

Distribution cost rises as a share of revenue because channel-sourced revenue grows from
8% to 42% of the book. **This is a deliberate trade:** channel revenue carries ~25%
margin give-away but roughly **60% lower CAC**, so blended contribution margin improves
even as gross margin on channel deals falls. The net effect is visible in §12.

---

## 9. Marketing cost

Marketing programs are separated from S&M payroll throughout. Payroll is in §10.

### 9.1 Programs budget

| ($K) | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---:|---:|---:|---:|---:|
| **Total marketing programs** | **312** | **668** | **1,279** | **1,998** | **2,521** |
| % of revenue | 118% | 51% | 38% | 29% | 21% |
| Marketing headcount | 1 | 3 | 6 | 9 | 12 |

Y1 at 118% of revenue is normal for a launch year and is the reason the seed round
exists. The ratio normalizes to a healthy 21% by Y5.

### 9.2 Allocation (Y3, $1,279K)

| Programme | Share | $K | What it buys |
|---|---:|---:|---|
| **Content & SEO — 11 vertical playbooks** | 18% | 230 | One deep playbook per industry: "CRM for Telecom Subscriber Management", "Grant Pipeline Management for NGOs". This is the highest-leverage spend — the verticals already exist in the product, so the content describes reality rather than roadmap |
| **Paid search & paid social** | 20% | 256 | Google Ads on competitor and category terms; LinkedIn for enterprise titles; Meta for SME reach in-region |
| **Industry events & conferences** | 17% | 217 | Regional telecom, banking and NGO summits — where West African enterprise buying actually starts |
| **Field roadshows & workshops** | 12% | 154 | Half-day sessions in Monrovia, Accra, Freetown, Lagos, Abidjan. Highest-converting channel in-region |
| **Account-based marketing** | 10% | 128 | Named-account programs against ~60 target Enterprise/Executive logos |
| **Product marketing, web, video, design** | 9% | 115 | Site, demo videos, vertical landing pages, sales collateral |
| **Developer & API marketing** | 5% | 64 | Docs site, integration guides, developer relations — supports the ecosystem play |
| **Analyst relations & PR** | 6% | 77 | Regional tech press, category validation, award submissions |
| **Partner co-marketing (MDF)** | 3% | 38 | Funds channel partners to run their own demand generation |

### 9.3 Expected performance by channel (Y3)

| Channel | Spend | MQLs | MQL→Cust | Customers | **Cost/customer** |
|---|---:|---:|---:|---:|---:|
| Content & SEO | $230K | 1,850 | 6.5% | 120 | **$1,917** |
| Paid search & social | $256K | 1,420 | 4.2% | 60 | $4,267 |
| Events & conferences | $217K | 310 | 9.0% | 28 | $7,750 |
| Field roadshows | $154K | 240 | 12.5% | 30 | $5,133 |
| ABM | $128K | 55 | 20.0% | 11 | $11,636 |
| Partner co-marketing | $38K | 95 | 8.4% | 8 | $4,750 |
| Other (PR, product marketing, dev) | $256K | — | — | — | Brand/support |
| **Total** | **$1,279K** | **3,970** | | **257** | **$4,977** |

Content and SEO carries the volume at the lowest cost per customer; ABM carries the
highest-value logos at the highest cost. Both are correct.

### 9.4 The marketing thesis

**Sell the vertical, not the platform.** A generic "all-in-one business platform" message
competes with Zoho on price and Salesforce on brand and loses both. "The CRM that already
knows what a SIM registration is" competes with neither.

This produces a repeatable playbook: pick a vertical → publish the playbook → run the
regional roadshow → land 2–3 reference accounts → let the reference sell the rest of the
vertical. It is executed one vertical at a time:

| Year | Verticals activated |
|---|---|
| Y1 | Telecom · Banking |
| Y2 | + FMCG/Distribution · NGO |
| Y3 | + Government · Insurance · Hospitality |
| Y4 | + Healthcare · Education |
| Y5 | + Real Estate · Manufacturing |

---

## 10. Office and employee expenditure

### 10.1 Headcount plan

| Function | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---:|---:|---:|---:|---:|
| Engineering (incl. DevOps, SRE, QA, security) | 8 | 14 | 24 | 36 | 50 |
| Product & Design | 1 | 3 | 5 | 7 | 9 |
| Support & Customer Success | 2 | 5 | 10 | 18 | 30 |
| Sales (AE, SDR, sales engineering) | 3 | 7 | 14 | 22 | 31 |
| Marketing | 1 | 3 | 6 | 9 | 12 |
| Professional Services / Implementation | 1 | 3 | 6 | 10 | 15 |
| G&A (finance, legal, people, ops) | 2 | 4 | 7 | 11 | 16 |
| **Total (end of year)** | **18** | **39** | **72** | **113** | **163** |
| Average during year | 13 | 28 | 55 | 92 | 138 |
| Revenue per employee | $20.4K | $46.8K | $60.6K | $73.8K | $85.9K |

Revenue per employee reaching $86K by Y5 is appropriate for a regional cost base. The US
SaaS benchmark of $150–200K reflects US salaries; the relevant test is gross profit per
employee against fully-loaded cost, which is covered in §12.

### 10.2 Compensation model

**Structure: a Monrovia engineering and operations hub, with regional commercial
satellites in Accra, Lagos and (from Y4) Nairobi.** All salaries USD-denominated —
standard practice for Liberian professional employment and essential for retaining
engineers who have remote-work alternatives.

| Role | Base salary | Burden | **Fully loaded** |
|---|---:|---:|---:|
| CEO / Co-founder | $52,000 | 24% | $64,480 |
| CTO / Co-founder | $48,000 | 24% | $59,520 |
| VP (Sales / Engineering / Marketing) | $42,000 | 24% | $52,080 |
| Senior engineer | $34,000 | 24% | $42,160 |
| Mid-level engineer | $21,000 | 24% | $26,040 |
| Junior engineer | $12,500 | 24% | $15,500 |
| DevOps / SRE | $29,500 | 24% | $36,580 |
| Security engineer | $33,000 | 24% | $40,920 |
| QA engineer | $14,000 | 24% | $17,360 |
| Product manager | $27,000 | 24% | $33,480 |
| Designer | $22,000 | 24% | $27,280 |
| Enterprise AE | $26,000 base (+ OTE to $49K) | 24% | $32,240 base |
| Inside sales / SDR | $13,500 base (+ OTE to $22K) | 24% | $16,740 base |
| Solution engineer | $24,000 | 24% | $29,760 |
| Marketing manager | $19,000 | 24% | $23,560 |
| Implementation consultant | $17,500 | 24% | $21,700 |
| Support agent | $9,500 | 24% | $11,780 |
| Customer success manager | $18,000 | 24% | $22,320 |
| Finance / Ops manager | $20,000 | 24% | $24,800 |
| Admin / office manager | $10,000 | 24% | $12,400 |

**The 24% burden, itemized**

| Component | Rate | Basis |
|---|---:|---|
| NASSCORP employer contribution (Liberia) | 4.75% | Statutory — employment injury + pension |
| Health insurance (private; public provision is limited) | ~7.0% | $700–1,400/employee/year |
| Equipment amortized (laptop, monitor, peripherals over 3 yr) | ~2.8% | $600/employee/year |
| Recruiting, amortized | ~4.5% | 15% of first-year salary over ~3.3-year tenure |
| Training & professional development | ~2.2% | $500/employee/year |
| Statutory leave accrual, 13th-month provision | ~2.8% | Regional practice |
| **Total** | **~24%** | |

> **Regional note.** Ghana (SSNIT 13% employer) and Nigeria (pension 10% employer) carry
> materially higher statutory burden than Liberia. Satellite staff are budgeted at **31%
> burden**, blended into the totals below.

### 10.3 Total payroll

| ($K) | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---:|---:|---:|---:|---:|
| R&D payroll (engineering, product, design) | 282 | 460 | 820 | 1,350 | 1,950 |
| S&M payroll (sales, marketing) | 95 | 290 | 620 | 1,020 | 1,450 |
| Sales commission | 63 | 137 | 241 | 382 | 529 |
| Support & CS payroll *(in COGS)* | 17 | 67 | 145 | 270 | 470 |
| Implementation payroll *(in COGS)* | 12 | 52 | 130 | 230 | 390 |
| G&A payroll | 72 | 130 | 245 | 410 | 620 |
| **Total people cost** | **541** | **1,136** | **2,201** | **3,662** | **5,409** |
| % of revenue | 204% | 87% | 66% | 54% | 46% |
| Average cost per FTE (incl. commission) | $41.6K | $40.6K | $40.0K | $39.8K | $39.2K |

### 10.4 Facilities

**Facilities in Liberia carry two costs that plans written elsewhere omit: power and
bandwidth.** Grid supply from the Liberia Electricity Corporation is intermittent, and
international bandwidth, while improved since the ACE submarine cable landing, remains
expensive relative to global norms. Both are budgeted explicitly.

| ($) | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---:|---:|---:|---:|---:|
| **Space** | co-working<br>10 desks | 2,200 sq ft<br>Monrovia | 4,500 sq ft<br>Monrovia | 7,000 sq ft<br>+ Accra | 10,000 sq ft<br>+ Accra + Nairobi |
| Rent @ ~$17/sq ft/yr | 21,600 | 37,400 | 76,500 | 128,000 | 195,000 |
| **Redundant internet** (dedicated fiber primary + LTE/VSAT failover) | 10,800 | 16,800 | 24,000 | 38,000 | 56,000 |
| **Power** — generator fuel + maintenance, net of solar offset | 8,000 | 14,000 | 22,000 | 34,000 | 48,000 |
| Security (24h guard service) | 4,000 | 9,000 | 14,000 | 22,000 | 32,000 |
| Utilities, water, waste | 2,000 | 5,000 | 9,000 | 15,000 | 23,000 |
| Cleaning & maintenance | 1,600 | 4,800 | 8,000 | 13,000 | 20,000 |
| Office supplies & consumables | 4,000 | 8,000 | 14,000 | 22,000 | 34,000 |
| Satellite offices (Accra, Lagos, Nairobi) | 6,000 | 10,000 | 22,500 | 38,000 | 62,000 |
| **Total facilities** | **58,000** | **105,000** | **190,000** | **310,000** | **470,000** |
| Per employee | $3,222 | $2,692 | $2,639 | $2,743 | $2,883 |

#### Power strategy — a genuine cost decision

| Option | Capex | Annual fuel/opex | 5-yr total |
|---|---:|---:|---:|
| Grid + diesel generator only | $18,000 | $22,000 avg | $128,000 |
| **Grid + generator + solar/battery hybrid** | **$46,000** | **$9,500 avg** | **$93,500** |

The hybrid pays back in **month 31** and is budgeted from Y2. It also removes the
correlation between diesel price shocks and operating cost — meaningful in a market where
fuel prices move with FX.

### 10.5 Capital expenditure

| ($) | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---:|---:|---:|---:|---:|
| Laptops & workstations | 32,400 | 21,600 | 39,600 | 52,000 | 72,000 |
| Office fit-out & furniture | 16,000 | 45,000 | 48,000 | 62,000 | 78,000 |
| Generator (30 kVA) | 18,000 | — | 14,000 | — | 18,000 |
| Solar + battery hybrid | 28,000 | — | 12,000 | 24,000 | 20,000 |
| Network, AV, conferencing equipment | — | 13,000 | 6,400 | 12,000 | 12,000 |
| **Total capex** | **94,400** | **79,600** | **120,000** | **150,000** | **200,000** |

### 10.6 Total office and employee expenditure

| ($K) | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---:|---:|---:|---:|---:|
| Total people cost (§10.3) | 541 | 1,136 | 2,201 | 3,662 | 5,409 |
| Facilities (§10.4) | 58 | 105 | 190 | 310 | 470 |
| Software & tools per employee | 22 | 45 | 95 | 165 | 255 |
| Travel & regional presence | 25 | 55 | 105 | 175 | 260 |
| Recruiting (direct, unamortized portion) | 12 | 28 | 52 | 78 | 106 |
| Capex (§10.5) | 94 | 80 | 120 | 150 | 200 |
| **Total incl. capex** | **752** | **1,449** | **2,763** | **4,540** | **6,700** |
| **Total excl. capex** (the figure quoted in §1) | **658** | **1,369** | **2,643** | **4,390** | **6,500** |

Two figures are given because they answer different questions. **Including capex** is
what the company spends on its people and premises in cash that year. **Excluding capex**
is the recurring run-rate that must be covered by revenue — capex is lumpy (a generator
in Y1, a fit-out in Y2) and depreciates over 3–5 years rather than recurring. The §1
summary and the P&L in §11.1 use the excluding-capex basis; capex appears separately in
the cash flow at §11.2.

### 10.7 Retention — the real risk to this cost line

The largest threat to the plan's cost structure is **not salary inflation; it is
attrition to remote international employers.** A senior engineer earning $34,000 in
Monrovia can earn $70,000–110,000 working remotely for a European or US company, and the
skills this codebase demands — Prisma, multi-tenancy, SAML/OIDC, payroll engines — are
exactly the skills those employers recruit for.

Mitigations, all budgeted:

| Mitigation | Cost | Effect |
|---|---:|---|
| Equity for all employees (12% pool over 5 yr) | Dilution, not cash | Ownership of the outcome |
| Salary review every 6 months, benchmarked | In the 8%/yr salary inflation assumption | Removes the "I had to leave to get paid" exit |
| Retention bonus at 24 and 48 months | $52K by Y5 | Directly targets the peak-risk window |
| Conference and training budget, published work | $500/head/yr in burden | The non-cash reason people stay |
| Deliberate remote hiring from Y3 for scarce skills | $18K premium/head | Removes single-location dependency |

**Assumed voluntary attrition: 18% Y1–Y2, improving to 12% by Y5.** Recruiting cost in
§10.6 is sized on that basis. If attrition ran at 30%, recruiting and lost-productivity
cost would rise by roughly **$180K/year by Y5** — modelled in §14.

---

## 11. Consolidated P&L, cash flow and funding

### 11.1 Profit & loss

| ($K) | **Y1** | **Y2** | **Y3** | **Y4** | **Y5** |
|---|---:|---:|---:|---:|---:|
| **Revenue** | **265** | **1,311** | **3,333** | **6,794** | **11,857** |
| Infrastructure hosting | 14 | 42 | 105 | 205 | 340 |
| Payment processing | 8 | 39 | 98 | 200 | 350 |
| Third-party services | 4 | 12 | 28 | 52 | 88 |
| Support & CS payroll | 17 | 67 | 145 | 270 | 470 |
| Implementation delivery | 12 | 52 | 130 | 230 | 390 |
| **Total COGS** | **55** | **212** | **506** | **957** | **1,638** |
| **Gross profit** | **210** | **1,099** | **2,827** | **5,837** | **10,219** |
| **Gross margin** | **79.2%** | **83.8%** | **84.8%** | **85.9%** | **86.2%** |
| R&D payroll | 282 | 460 | 820 | 1,350 | 1,950 |
| Sales & marketing (total, §7.1) | 470 | 1,095 | 2,140 | 3,400 | 4,500 |
| G&A payroll | 72 | 130 | 245 | 410 | 620 |
| Facilities | 58 | 105 | 190 | 310 | 470 |
| Professional services (legal, audit, accounting, entities) | 35 | 55 | 95 | 150 | 220 |
| Security & compliance | 45 | 60 | 85 | 120 | 165 |
| Software & tools | 22 | 45 | 95 | 165 | 255 |
| Travel | 25 | 55 | 105 | 175 | 260 |
| **Total operating expenses** | **1,009** | **2,005** | **3,775** | **6,080** | **8,440** |
| **EBITDA** | **(799)** | **(906)** | **(948)** | **(243)** | **1,779** |
| EBITDA margin | (301%) | (69%) | (28%) | (3.6%) | **15.0%** |
| Depreciation & amortization | 31 | 58 | 98 | 148 | 205 |
| **EBIT** | **(830)** | **(964)** | **(1,046)** | **(391)** | **1,574** |

### 11.2 Cash flow and funding requirement

| ($K) | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---:|---:|---:|---:|---:|
| EBITDA | (799) | (906) | (948) | (243) | 1,779 |
| Capital expenditure | (94) | (80) | (120) | (150) | (200) |
| Working capital movement | (12) | (38) | (64) | (92) | (118) |
| **Free cash flow** | **(905)** | **(1,024)** | **(1,132)** | **(485)** | **1,461** |
| **Cumulative FCF** | **(905)** | **(1,929)** | **(3,061)** | **(3,546)** | **(2,085)** |

**Peak cumulative cash requirement: $3.55M**, reached at the end of Y4.

### 11.3 Funding plan

| Round | Timing | Amount | Use | Milestone unlocked |
|---|---|---:|---|---|
| **Seed** | Now (Q1 Y1) | **$1.5M** | Y1 in full + ~60% of Y2. Commercial team build, first two verticals, SOC 2, tech-debt burn-down | ARR $1.2M+, NRR >100%, 3 reference logos per vertical |
| **Series A** | Mid-Y2 | **$3.5M** | Y2 remainder through Y4. Regional expansion (Ghana, Nigeria), channel build, East Africa entry | ARR $8M+, EBITDA breakeven |
| **Total** | | **$5.0M** | vs. $3.55M peak need | 12-month cushion at Y4 burn |

**Why raise $5.0M against a $3.55M need.** Three regional risks justify the cushion:
FX volatility on a USD cost base with partially LRD-denominated revenue; payment-rail
transitions; and enterprise sales cycles in government and telecom that routinely slip
two quarters. A plan with no cushion in this market is a plan that raises again from a
weak position.

**Post-money expectations** (indicative, at regional African SaaS comparables of
8–14× forward ARR): Seed at $6–8M post; Series A at $28–38M post on ~$2.5M ARR.

---

## 12. Unit economics

### 12.1 LTV and LTV:CAC by segment (Y3)

| Segment | ACV | GM | Gross profit/yr | Gross retention | Avg life (capped) | **LTV** | **CAC** | **LTV:CAC** | **Payback** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Standard | $4,788 | 84.8% | $4,060 | 78% | 4.5 yr | $18,270 | $2,791 | **6.5:1** | 8.2 mo |
| Premium | $11,988 | 84.8% | $10,166 | 88% | 5.0 yr | $50,830 | $8,917 | **5.7:1** | 10.5 mo |
| Custom | $7,080 | 84.8% | $6,004 | 82% | 4.5 yr | $27,018 | $7,782 | **3.5:1** | 15.6 mo |
| Enterprise | $23,988 | 84.8% | $20,342 | 92% | 6.0 yr | $122,052 | $24,075 | **5.1:1** | 14.2 mo |
| Executive | $61,188 | 84.8% | $51,888 | 94% | 7.0 yr | $363,216 | $48,636 | **7.5:1** | 11.2 mo |
| **Blended** | **$11,526** | **84.8%** | **$9,774** | **84%** | **5.2 yr** | **$50,825** | **$9,224** | **5.5:1** | **11.3 mo** |

Customer lifetimes are **capped** at the values shown rather than computed as
1/(1−retention), which would produce a 16-year Executive lifetime. Capping is the
conservative treatment and is what a diligence process will expect.

**Every segment clears the 3:1 LTV:CAC bar. Every segment except Custom clears
12-month CAC payback.** Custom is addressed by the self-serve configurator recommended
in §7.2.

### 12.2 SaaS benchmark scorecard

| Metric | Y3 | Y5 | Benchmark | Verdict |
|---|---:|---:|---|---|
| Gross margin | 84.8% | 86.2% | 75–85% | ✅ Above |
| **Rule of 40** (growth % + EBITDA %) | 106 | 81 | >40 | ✅ Strongly above |
| Net revenue retention | 107% | 112% | >110% good | ✅ On track |
| Magic number | 1.25 | 1.31 | >0.75 good | ✅ Strong |
| CAC payback (blended) | 11.3 mo | 10.8 mo | <18 mo | ✅ Good |
| LTV:CAC | 5.5:1 | 5.8:1 | >3:1 | ✅ Strong |
| Revenue per employee | $60.6K | $85.9K | $150K+ (US) | ⚠️ Below US norm — offset by cost base |
| **Gross profit per fully-loaded FTE** | **$51.4K** | **$74.1K** | vs. $40.0K / $39.2K cost | ✅ 1.29× → 1.89× |

The last row is the one that matters for a regional cost base: **each employee generates
1.9× their fully-loaded cost in gross profit by Y5.** Revenue per employee below the US
benchmark is a function of salary geography, not productivity.

### 12.3 Contribution margin by channel

| Channel | Gross margin | CAC | Contribution margin yr 1 | Contribution margin yr 3+ |
|---|---:|---:|---:|---:|
| Direct | 84.8% | $9,224 | 4.8% | 84.8% |
| Referral (15% yr-1 fee) | 84.8% | $3,690 | 37.5% | 84.8% |
| Reseller (25% recurring) | 59.8% | $2,767 | 35.8% | 59.8% |
| White-label (30% share) | 54.8% | $1,845 | 38.8% | 54.8% |

Channel deals are **more profitable in year one and less profitable thereafter.** With
blended customer lifetimes above five years, direct sales wins on lifetime value — which
is why the plan keeps direct at 58% of revenue in Y5 rather than pushing channel harder.
Channel is used to enter markets where direct presence is uneconomic, not to replace
direct where it works.

---

## 13. Assumptions register

Change any of these and the model moves. They are stated so a reader can disagree
precisely.

| # | Assumption | Value | Confidence | Source |
|---|---|---|---|---|
| A1 | Pricing unchanged from `plans.config.js` | $399–$5,599/mo | High | Codebase |
| A2 | LRD/USD exchange rate | L$195 = $1 | Medium | ±15% tested in §14 |
| A3 | Senior engineer salary, Monrovia | $34,000 | Medium | Regional market |
| A4 | Employer burden, Liberia / satellites | 24% / 31% | High | NASSCORP + insurance |
| A5 | Salary inflation | 8%/yr | Medium | Regional + retention pressure |
| A6 | Blended gross logo retention | 84% | **Low** | No operating history |
| A7 | Net revenue retention | 107% → 112% | **Low** | No operating history |
| A8 | Magic number (sales efficiency) | 1.25 | Medium | Set below regional-advantage ceiling |
| A9 | Blended cost of collection | 2.95% | High | Published rail pricing |
| A10 | Commercial office rent, Monrovia | $17/sq ft/yr | Medium | Grade B CBD |
| A11 | AI stays on a low-cost model | ~$0.000056/req | High | `lib/ai.js` default |
| A12 | Voluntary attrition | 18% → 12% | **Low** | Remote-work competition |
| A13 | Y1 customer acquisition | 63 customers | **Low** | Pre-revenue |
| A14 | Channel share of revenue by Y5 | 42% | Medium | Requires partner recruitment to plan |

**The four low-confidence assumptions (A6, A7, A12, A13) are the ones to instrument
first.** Retention and Y1 acquisition are unknowable before operating; attrition is
knowable within two quarters. All four should be reported monthly to the board from
month one.

---

## 14. Risks and sensitivities

### 14.1 Sensitivity analysis — effect on Y5 EBITDA and peak cash need

| Scenario | Y5 revenue | Y5 EBITDA | Peak cash need |
|---|---:|---:|---:|
| **Base case** | $11.86M | +$1.78M | $3.55M |
| ARPU −20% (regional pricing pressure) | $9.49M | −$0.28M | $5.10M |
| Churn +50% (gross retention 84% → 76%) | $9.72M | +$0.09M | $4.35M |
| CAC +30% | $11.86M | +$0.43M | $4.72M |
| Customer acquisition −30% | $8.30M | −$0.51M | $4.88M |
| LRD depreciates 25% (local costs fall in USD) | $11.86M | +$1.97M | $3.38M |
| Attrition at 30% (vs 12–18%) | $11.86M | +$1.60M | $3.74M |
| AI moved to a frontier model | $11.86M | +$1.63M | $3.62M |
| **Downside combination** (ARPU −20%, churn +50%, CAC +30%) | $7.79M | **−$1.94M** | **$7.20M** |
| **Upside combination** (regional pricing lifts volume 40%, NRR 118%) | $16.31M | **+$3.42M** | $3.20M |

**The downside combination is survivable but requires a second raise.** The mitigation
is stated in §14.2 R1: the levers that produce the downside are largely the same levers
that regional pricing fixes, and the fix is 6–8 engineer-days.

### 14.2 Principal risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| **R1** | **Pricing/purchasing-power mismatch.** $399/mo prices out the SME long tail while $5,099/mo under-charges telecoms and banks | **High** | **High** | Regional price book + Starter tier + enterprise usage anchors (§4.2) — 6–8 engineer-days. **Do this before the Y1 sales push** |
| **R2** | **Payment rails.** Stripe unavailable to Liberian merchants | High | Medium | Delaware/UK contracting entity + Flutterwave/Paystack + mobile money (§8.1). ~$4.5K setup |
| **R3** | **FX volatility.** USD cost base, partly LRD revenue | Medium | Medium | Price enterprise contracts in USD; hold 6 months' opex in USD; LRD depreciation is net *favourable* (§14.1) |
| **R4** | **Engineering attrition to remote employers** | **High** | **High** | Equity for all, 6-month salary reviews, 24/48-month retention bonuses, deliberate remote hiring from Y3 (§10.7) |
| **R5** | **Key-person concentration.** 103 models, 34 modules, small original team | **High** | **High** | Documentation is genuinely strong (13 module docs + registry-driven design). Mandate: no module with fewer than 2 fluent engineers by end of Y2 |
| **R6** | **Enterprise sales cycles slip.** Government and telecom procurement routinely runs 9–15 months | High | Medium | Do not model government revenue before Y3; keep 60% of ARR in Standard/Premium where cycles are short |
| **R7** | **Salesforce or Zoho prices down regionally** | Low | High | Compete on verticals and total cost, not list price. Vertical depth is not something a global vendor replicates cheaply |
| **R8** | **Security incident.** Product holds payroll, bank details, government IDs, signed contracts | Low | **Critical** | AES-256-GCM at rest, SHA-256-only token storage, SOC 2 Type II from Y1, annual pen test, cyber insurance from Y1 |
| **R9** | **Object-store authorization gap** (documented in `PRODUCTION_READINESS.md` §3) | Medium | High | Signed expiring URLs — §6.5 item 2, $4.6K. **Close before the first regulated tenant** |
| **R10** | **Scaling ceiling.** In-process rate limiter, cache and schedulers prevent horizontal scaling | Medium | Medium | Redis + job queue — §6.5 items 1 and 3, $15.8K combined. Close in Y1 |
| **R11** | **Concentration.** Executive tier = 26% of Y5 ARR from 62 tenants | Medium | Medium | No single customer above 4% of ARR; enforce as a board-reported covenant |
| **R12** | **Regulatory divergence.** NDPR, Ghana DPA, GDPR for any EU-touching data | Medium | Low | Governance module already implements DSAR, retention and legal holds — this is a competitive asset, not a liability |

### 14.3 The three things that must be true

1. **Regional pricing lands.** Without it the SME funnel does not fill and the entire
   Standard/Premium volume assumption fails. *(Mitigated: R1, ~$3K of engineering.)*
2. **Retention clears 84% gross / 107% net.** The LTV:CAC case rests on it, and there is
   no operating history behind the number. *(Instrument from month one.)*
3. **The team holds.** A 133-engineer-month codebase maintained by a team losing 30% a
   year does not stay maintained. *(Mitigated: R4, R5, ~$52K/yr by Y5.)*

---

## 15. Milestones

| Quarter | Commercial | Product & platform | Organizational |
|---|---|---|---|
| **Y1 Q1** | Close $1.5M seed · first 5 design-partner logos | **Regional pricing (R1)** · Redis (R10) · fix `package.json` (§6.5 #8) | Hire 2 engineers, 1 AE · Monrovia co-working |
| **Y1 Q2** | Telecom vertical launch · first Executive-tier logo | Signed object-store URLs (R9) · SOC 2 readiness begins | Hire DevOps, support, marketing |
| **Y1 Q3** | Banking vertical launch · Ghana market entry | Job queue (R10) · first DR rehearsal · Playwright smoke suite | 14 FTE |
| **Y1 Q4** | **ARR $627K** · first 2 reseller partners signed | SOC 2 Type I · WCAG audit commissioned | 18 FTE · move to dedicated office |
| **Y2 H1** | FMCG + NGO verticals · **raise $3.5M Series A** | SOC 2 Type II · WCAG 2.1 AA remediation | 28 FTE · solar hybrid installed |
| **Y2 H2** | Nigeria entry · first telecom white-label partnership | Postgres read replicas · AWS Marketplace listing | 39 FTE · Accra satellite |
| **Y3** | **ARR $4.67M** · Government + Insurance + Hospitality verticals | Second region live · self-serve Custom configurator (§7.2) | 72 FTE · 4,500 sq ft HQ |
| **Y4** | **EBITDA breakeven (Q3)** · East Africa entry · ARR $8.9M | Partitioning · scale hardening | 113 FTE · Nairobi satellite |
| **Y5** | **ARR $14.8M · EBITDA +$1.78M** | Platform maturity; ecosystem and marketplace | 163 FTE |

---

## Appendix A — Cost summary, all categories

| ($K) | Y1 | Y2 | Y3 | Y4 | Y5 | 5-yr total |
|---|---:|---:|---:|---:|---:|---:|
| **Infrastructure — hosting** | 14 | 42 | 105 | 205 | 340 | **706** |
| **Infrastructure — third-party** | 4 | 12 | 28 | 52 | 88 | **184** |
| **Infrastructure — management labor** | 37 | 88 | 168 | 291 | 429 | **1,013** |
| **Infrastructure — maintenance & compliance** | 152 | 194 | 258 | 382 | 520 | **1,506** |
| **Customer acquisition (total S&M)** | 470 | 1,095 | 2,140 | 3,400 | 4,500 | **11,605** |
| — of which marketing programs | 312 | 668 | 1,279 | 1,998 | 2,521 | 6,778 |
| — of which S&M payroll + commission | 158 | 427 | 861 | 1,402 | 1,979 | 4,827 |
| **Distribution** | 20 | 113 | 303 | 685 | 1,249 | **2,370** |
| **People — R&D payroll** | 282 | 460 | 820 | 1,350 | 1,950 | **4,862** |
| **People — support & implementation** | 29 | 119 | 275 | 500 | 860 | **1,783** |
| **People — G&A payroll** | 72 | 130 | 245 | 410 | 620 | **1,477** |
| **Facilities** | 58 | 105 | 190 | 310 | 470 | **1,133** |
| **Capital expenditure** | 94 | 80 | 120 | 150 | 200 | **644** |
| **Other opex** (professional, tools, travel) | 82 | 155 | 295 | 490 | 735 | **1,757** |

> Categories overlap by design — distribution cost and infrastructure-management labor
> are decompositions of lines already present in COGS and OpEx, not additional spend.
> The P&L in §11.1 is the authoritative, non-double-counted statement.

---

## Appendix B — Glossary

| Term | Meaning |
|---|---|
| **ARR** | Annual Recurring Revenue — subscription value annualized at a point in time |
| **ACV** | Annual Contract Value — first-year value of a new customer |
| **CAC** | Customer Acquisition Cost — total sales + marketing ÷ new customers |
| **LTV** | Lifetime Value — gross profit per year × expected customer lifetime |
| **NRR** | Net Revenue Retention — cohort revenue after churn and expansion |
| **Magic number** | New ARR ÷ prior-period S&M spend; sales efficiency |
| **Rule of 40** | Growth rate % + EBITDA margin %; should exceed 40 |
| **CAC payback** | Months of gross profit required to repay acquisition cost |
| **Burden** | Employer costs above salary — statutory, insurance, equipment, recruiting |
| **TCO** | Total Cost of Ownership |
