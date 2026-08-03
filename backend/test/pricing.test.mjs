/**
 * The regional price book.
 *
 * Prices are the most consequential numbers in the product, so this file pins
 * them: every assertion below is a commercial decision written down. A change to
 * a band, a segment or a tier shows up here as a changed expectation rather than
 * as a surprise on somebody's invoice.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  BANDS, SEGMENTS, COUNTRY_BANDS, CURRENCIES, DEFAULT_BAND, DEFAULT_SEGMENT,
  bandForCountry, bandWeightFor, multiplierFor, currencyForCountry,
  localAmount, formatLocal, displayPrice, marketFor, rateAgeDays, ratesAreStale,
  RATES_AS_OF, STALE_AFTER_DAYS,
} from "../src/modules/billing/pricing.book.js";
import { PLANS, priceFor, listPriceFor, quoteFor, entitlementsFor, aiLimitFor } from "../src/modules/billing/plans.config.js";

// ── Structure ────────────────────────────────────────────────────────────────
test("bands descend from the high-income anchor", () => {
  assert.equal(BANDS[0].id, "high");
  assert.equal(BANDS[0].multiplier, 1, "high income IS the published list price");
  for (let i = 1; i < BANDS.length; i++) {
    assert.ok(BANDS[i].multiplier < BANDS[i - 1].multiplier, `${BANDS[i].id} should be cheaper than ${BANDS[i - 1].id}`);
    assert.ok(BANDS[i].multiplier > 0);
  }
});

test("segments rise, and their share of the regional discount falls", () => {
  for (let i = 1; i < SEGMENTS.length; i++) {
    assert.ok(SEGMENTS[i].multiplier > SEGMENTS[i - 1].multiplier, `${SEGMENTS[i].id} should cost more`);
    assert.ok(SEGMENTS[i].bandWeight < SEGMENTS[i - 1].bandWeight, `${SEGMENTS[i].id} should get less of the local discount`);
  }
  assert.equal(SEGMENTS[0].multiplier, 1, "SME is the anchor");
  assert.equal(SEGMENTS[0].bandWeight, 1, "and gets the full local discount");
});

test("every mapped country names a real band", () => {
  const ids = new Set(BANDS.map((b) => b.id));
  for (const [country, band] of Object.entries(COUNTRY_BANDS)) {
    assert.ok(/^[A-Z]{2}$/.test(country), `${country} is not an ISO-3166 alpha-2 code`);
    assert.ok(ids.has(band), `${country} maps to unknown band "${band}"`);
    assert.notEqual(band, "high", `${country} is listed but high income is the default — remove it`);
  }
});

test("unknown or missing countries fall back to high income", () => {
  assert.equal(bandForCountry(null), DEFAULT_BAND);
  assert.equal(bandForCountry(""), DEFAULT_BAND);
  assert.equal(bandForCountry("ZZ"), DEFAULT_BAND);
  assert.equal(bandForCountry("US"), "high");
  // Case and whitespace are forgiven — this arrives from a form.
  assert.equal(bandForCountry(" lr "), "low");
});

// ── The two axes ─────────────────────────────────────────────────────────────
test("Liberia is a low-income market", () => {
  assert.equal(bandForCountry("LR"), "low");
  assert.equal(currencyForCountry("LR"), "LRD");
});

test("an SME gets the full regional discount", () => {
  assert.equal(bandWeightFor("low", "sme"), 0.2);
  assert.equal(multiplierFor({ country: "LR", segment: "sme" }), 0.2);
});

// The point of the taper: a bank in Monrovia earns in hard currency and buys at
// something close to international rates. Without this it would pay a fifth of
// what the same bank pays in London, which is the under-charging the whole
// exercise exists to fix.
test("a regulated institution barely gets the regional discount", () => {
  assert.equal(bandWeightFor("low", "regulated"), 0.8);
  assert.equal(multiplierFor({ country: "LR", segment: "regulated" }), 4.8);
});

test("in a high-income market the band changes nothing at any segment", () => {
  for (const s of SEGMENTS) {
    assert.equal(multiplierFor({ country: "US", segment: s.id }), s.multiplier,
      `${s.id} should be exactly its own multiplier in a high-income market`);
  }
});

test("no country and no segment leaves the list price untouched", () => {
  for (const p of PLANS) {
    assert.equal(priceFor(p.id), p.price, `${p.id} changed without a market`);
    assert.equal(priceFor(p.id, [], {}), p.price);
  }
});

// ── The numbers that matter commercially ─────────────────────────────────────
test("the SME long tail is reachable in a low-income market", () => {
  // The complaint that started this: $399 ≈ L$78,000/mo prices out the long tail.
  const before = listPriceFor("standard");
  assert.equal(before, 399);
  assert.equal(localAmount(before, "LRD"), 78_000, "the original price really is L$78,000");

  // Starter exists so the floor isn't $399 anywhere.
  const starter = priceFor("starter", [], { country: "LR", segment: "sme" });
  assert.equal(starter, 20, "a Liberian SME entry price");
  assert.equal(formatLocal(starter, "LRD"), "L$4,000");

  // And Standard itself is now within reach.
  const standard = priceFor("standard", [], { country: "LR", segment: "sme" });
  assert.equal(standard, 80);
  assert.equal(formatLocal(standard, "LRD"), "L$15,500");
});

test("a telecom or bank is charged like one", () => {
  // The other half of the complaint: $5,099 materially under-charges these.
  const listed = listPriceFor("executive");
  assert.equal(listed, 5_099);

  const globalBank = priceFor("executive", [], { country: "US", segment: "regulated" });
  assert.equal(globalBank, 30_594, "6× list for a regulated operator in a high-income market");

  const localBank = priceFor("executive", [], { country: "LR", segment: "regulated" });
  assert.equal(localBank, 24_475, "still a serious number in a low-income market");
  assert.ok(localBank > listed * 4, "must be far above the old flat price");
});

test("the same platform spans three orders of magnitude, in the right order", () => {
  const shop = priceFor("starter",   [], { country: "LR", segment: "sme" });
  const mid  = priceFor("premium",   [], { country: "GH", segment: "mid_market" });
  const corp = priceFor("executive", [], { country: "ZA", segment: "enterprise" });
  const bank = priceFor("executive", [], { country: "US", segment: "regulated" });
  assert.ok(shop < mid && mid < corp && corp < bank, `${shop} < ${mid} < ${corp} < ${bank}`);
  assert.equal(shop, 20);
  assert.ok(bank / shop > 1000, "the long tail and the carrier are not the same customer");
});

test("every tier × band × segment produces a sane whole-dollar price", () => {
  for (const plan of PLANS) {
    for (const band of BANDS) {
      const country = Object.entries(COUNTRY_BANDS).find(([, b]) => b === band.id)?.[0] ?? "US";
      for (const segment of SEGMENTS) {
        const price = priceFor(plan.id, [], { country, segment: segment.id });
        assert.ok(Number.isInteger(price), `${plan.id}/${band.id}/${segment.id} is not whole dollars: ${price}`);
        assert.ok(price >= 1, `${plan.id}/${band.id}/${segment.id} priced at ${price}`);
        assert.ok(price <= plan.price * 6, `${plan.id}/${band.id}/${segment.id} exceeds 6× list`);
      }
    }
  }
});

test("a cheaper tier is never more expensive than a dearer one in the same market", () => {
  const order = ["starter", "standard", "premium", "enterprise", "executive"];
  for (const country of ["LR", "GH", "ZA", "US"]) {
    for (const segment of SEGMENTS.map((s) => s.id)) {
      let prev = 0;
      for (const id of order) {
        const price = priceFor(id, [], { country, segment });
        assert.ok(price >= prev, `${id} (${price}) undercuts the tier below it in ${country}/${segment}`);
        prev = price;
      }
    }
  }
});

// ── The Starter tier ─────────────────────────────────────────────────────────
test("Starter is a real entry point, not a crippled demo", () => {
  const ent = entitlementsFor("starter");
  assert.ok(ent.sections.includes("crm"), "must be able to run a pipeline");
  assert.ok(ent.solutions.crm.length >= 3);
  assert.ok(ent.sections.includes("marketing"));
  // …but not a substitute for Standard.
  assert.equal(ent.solutions.services.length, 0);
  assert.deepEqual(ent.solutions.network, []);
  assert.equal(ent.sso, false);
  assert.equal(ent.branding, false);
  assert.ok(aiLimitFor("starter") > 0);
});

test("Starter is strictly the cheapest tier and strictly the smallest", () => {
  const starter = PLANS.find((p) => p.id === "starter");
  const standard = PLANS.find((p) => p.id === "standard");
  assert.ok(starter.price < standard.price);
  assert.ok(starter.crm.length < standard.crm.length, "it must not cannibalise Standard");
  assert.ok(starter.crm.every((c) => standard.crm.includes(c)), "upgrading should only add");
});

// ── Local display ────────────────────────────────────────────────────────────
test("local amounts round to a tidy step, and never to zero", () => {
  assert.equal(localAmount(20, "LRD") % CURRENCIES.LRD.step, 0);
  assert.equal(localAmount(1, "USD"), 1);
  // A price small enough to round to nothing must still show something.
  assert.ok(localAmount(0.001, "NGN") > 0);
  assert.equal(localAmount(0, "LRD"), 0, "free really is free");
});

// Rounding a displayed price UP would mean quoting more than we charge. Down is
// the only safe direction to be wrong in, so we round to nearest and assert the
// error can never exceed half a step.
test("the displayed local price never overstates what is charged by much", () => {
  for (const [code, def] of Object.entries(CURRENCIES)) {
    for (const usd of [20, 80, 399, 5_099, 30_594]) {
      const shown = localAmount(usd, code);
      const exact = usd * def.perUsd;
      assert.ok(Math.abs(shown - exact) <= def.step / 2 + 1e-9,
        `${code} at $${usd}: shown ${shown} vs exact ${exact} (step ${def.step})`);
    }
  }
});

test("USD markets show no indicative conversion at all", () => {
  const d = displayPrice(399, { country: "US" });
  assert.equal(d.currency, "USD");
  assert.equal(d.local, null);
  assert.equal(d.localFormatted, null);
  assert.equal(d.indicative, false, "there is nothing indicative about the charging currency");
});

test("a local price is always flagged as indicative", () => {
  const d = displayPrice(80, { country: "LR" });
  assert.equal(d.currency, "LRD");
  assert.equal(d.localFormatted, "L$15,500");
  assert.equal(d.charged, "$80", "USD is what actually gets charged");
  assert.equal(d.indicative, true);
  assert.equal(d.ratesAsOf, RATES_AS_OF);
});

test("stale rates are detectable rather than silently wrong", () => {
  const fresh = new Date(`${RATES_AS_OF}T00:00:00Z`);
  assert.equal(rateAgeDays(fresh), 0);
  assert.equal(ratesAreStale(fresh), false);
  const old = new Date(fresh.getTime() + (STALE_AFTER_DAYS + 1) * 86_400_000);
  assert.equal(ratesAreStale(old), true);
  assert.equal(displayPrice(80, { country: "LR" }, old).stale, true);
  // A USD market has no rate, so it can never be stale.
  assert.equal(displayPrice(80, { country: "US" }, old).stale, false);
});

test("every currency is usable", () => {
  for (const [code, def] of Object.entries(CURRENCIES)) {
    assert.ok(def.symbol, `${code} needs a symbol`);
    assert.ok(def.perUsd > 0, `${code} needs a rate`);
    assert.ok(def.step >= 1, `${code} needs a rounding step`);
  }
  assert.equal(CURRENCIES.USD.perUsd, 1, "USD against itself is 1 by definition");
});

// ── Quotes ───────────────────────────────────────────────────────────────────
test("a quote explains itself", () => {
  const q = quoteFor("standard", [], { country: "LR", segment: "sme" });
  assert.equal(q.plan, "standard");
  assert.equal(q.listUsd, 399);
  assert.equal(q.usd, 80);
  assert.equal(q.adjustment, 0.2, "a fifth of list, which is what the buyer should be told");
  assert.equal(q.market.band, "low");
  assert.equal(q.market.segment, "sme");
  assert.equal(q.localFormatted, "L$15,500");
});

test("marketFor describes an unplaced tenant without inventing anything", () => {
  const m = marketFor({});
  assert.equal(m.country, null);
  assert.equal(m.band, DEFAULT_BAND);
  assert.equal(m.segment, DEFAULT_SEGMENT);
  assert.equal(m.multiplier, 1, "an unplaced tenant pays list — no accidental discount");
});
