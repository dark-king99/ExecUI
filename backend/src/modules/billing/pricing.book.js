/**
 * Regional price book.
 *
 * One flat list price cannot serve both ends of this market. $399/mo is roughly
 * L$78,000 — several times what a Liberian SME will ever pay for software — while
 * $5,099/mo is a rounding error to a telecom or a bank. Charging both the same
 * number loses the long tail and leaves most of the enterprise value on the table.
 *
 * So price moves on two independent axes, and they compose:
 *
 *   REGION   — where the customer is, as a World Bank income band. Defensible
 *              ("we price to local purchasing power"), and new countries need a
 *              map entry rather than code.
 *   SEGMENT  — what the customer is. A bank and a corner shop on the same tier
 *              are not the same customer; the platform carries far more value,
 *              risk and support cost for the first.
 *
 * The two are NOT simply multiplied, because that gets a large regulated
 * institution wrong. A multinational bank operating in Monrovia earns in hard
 * currency and buys at international rates; a Liberian shop does not. So the
 * regional discount TAPERS as the segment grows — full for an SME, barely
 * applied for a regulated enterprise. See `bandWeightFor`.
 *
 * Everything here is pure. `pricing.test.mjs` walks every tier × band × segment
 * combination, so a change to any number is visible as a changed expectation
 * rather than a surprise on an invoice.
 */

// ── Income bands ─────────────────────────────────────────────────────────────
/**
 * Multipliers are relative to the HIGH-income list price, which is what the
 * existing published prices already are. So high income is 1.0 by definition and
 * nothing changes for the market the product was originally priced for.
 */
export const BANDS = [
  { id: "high",         label: "High income",         multiplier: 1.00 },
  { id: "upper_middle", label: "Upper-middle income", multiplier: 0.60 },
  { id: "lower_middle", label: "Lower-middle income", multiplier: 0.35 },
  { id: "low",          label: "Low income",          multiplier: 0.20 },
];

export const DEFAULT_BAND = "high";
const BAND_BY_ID = new Map(BANDS.map((b) => [b.id, b]));
export const getBand = (id) => BAND_BY_ID.get(id) ?? BAND_BY_ID.get(DEFAULT_BAND);

// ── Segments ─────────────────────────────────────────────────────────────────
/**
 * `bandWeight` is how much of the regional discount this segment receives.
 * 1.0 = the full local discount; 0.25 = a quarter of it. This is the knob that
 * stops a national bank buying at village-shop rates because of its postcode.
 */
export const SEGMENTS = [
  { id: "sme",         label: "Small & medium business", multiplier: 1,  bandWeight: 1.00,
    describe: "Independent businesses and startups." },
  { id: "mid_market",  label: "Mid-market",              multiplier: 2,  bandWeight: 0.75,
    describe: "Established multi-site companies." },
  { id: "enterprise",  label: "Enterprise",              multiplier: 4,  bandWeight: 0.50,
    describe: "Large corporates and government bodies." },
  // Telecoms, banks, insurers. They carry the heaviest compliance, integration
  // and support load, and the platform is closer to core infrastructure for them
  // than to an productivity tool.
  { id: "regulated",   label: "Regulated / carrier",     multiplier: 6,  bandWeight: 0.25,
    describe: "Banks, insurers, telecoms and other licensed operators." },
];

export const DEFAULT_SEGMENT = "sme";
const SEGMENT_BY_ID = new Map(SEGMENTS.map((s) => [s.id, s]));
export const getSegment = (id) => SEGMENT_BY_ID.get(id) ?? SEGMENT_BY_ID.get(DEFAULT_SEGMENT);

// ── Country → band ───────────────────────────────────────────────────────────
/**
 * ISO-3166 alpha-2 → income band, following the World Bank's classification.
 *
 * Only countries that are NOT high income are listed; anything absent is treated
 * as high income, which is both the safe default commercially and the smaller
 * table to keep current. The classification is revised each July — see
 * docs/PRICING.md for how to refresh it.
 */
export const COUNTRY_BANDS = {
  // ── Low income ─────────────────────────────────────────────────────────────
  AF: "low", BF: "low", BI: "low", CF: "low", TD: "low", CD: "low", ER: "low",
  ET: "low", GM: "low", GN: "low", GW: "low", KP: "low", LR: "low", MG: "low",
  MW: "low", ML: "low", MZ: "low", NE: "low", RW: "low", SL: "low", SO: "low",
  SS: "low", SD: "low", SY: "low", TG: "low", UG: "low", YE: "low",

  // ── Lower-middle income ────────────────────────────────────────────────────
  AO: "lower_middle", BD: "lower_middle", BT: "lower_middle", BO: "lower_middle",
  CV: "lower_middle", KH: "lower_middle", CM: "lower_middle", KM: "lower_middle",
  CG: "lower_middle", CI: "lower_middle", DJ: "lower_middle", EG: "lower_middle",
  SV: "lower_middle", SZ: "lower_middle", GH: "lower_middle", HT: "lower_middle",
  HN: "lower_middle", IN: "lower_middle", KE: "lower_middle", KG: "lower_middle",
  LA: "lower_middle", LB: "lower_middle", LS: "lower_middle", MR: "lower_middle",
  FM: "lower_middle", MA: "lower_middle", MM: "lower_middle", NP: "lower_middle",
  NI: "lower_middle", NG: "lower_middle", PK: "lower_middle", PG: "lower_middle",
  PH: "lower_middle", WS: "lower_middle", ST: "lower_middle", SN: "lower_middle",
  SB: "lower_middle", LK: "lower_middle", TJ: "lower_middle", TZ: "lower_middle",
  TL: "lower_middle", TN: "lower_middle", UA: "lower_middle", UZ: "lower_middle",
  VU: "lower_middle", VN: "lower_middle", ZM: "lower_middle", ZW: "lower_middle",

  // ── Upper-middle income ────────────────────────────────────────────────────
  AL: "upper_middle", DZ: "upper_middle", AM: "upper_middle", AZ: "upper_middle",
  BY: "upper_middle", BZ: "upper_middle", BA: "upper_middle", BW: "upper_middle",
  BR: "upper_middle", BG: "upper_middle", CN: "upper_middle", CO: "upper_middle",
  CR: "upper_middle", CU: "upper_middle", DM: "upper_middle", DO: "upper_middle",
  EC: "upper_middle", GQ: "upper_middle", FJ: "upper_middle", GA: "upper_middle",
  GE: "upper_middle", GD: "upper_middle", GT: "upper_middle", ID: "upper_middle",
  IR: "upper_middle", IQ: "upper_middle", JM: "upper_middle", JO: "upper_middle",
  KZ: "upper_middle", XK: "upper_middle", LY: "upper_middle", MY: "upper_middle",
  MV: "upper_middle", MH: "upper_middle", MU: "upper_middle", MX: "upper_middle",
  MD: "upper_middle", MN: "upper_middle", ME: "upper_middle", NA: "upper_middle",
  MK: "upper_middle", PY: "upper_middle", PE: "upper_middle", RU: "upper_middle",
  RS: "upper_middle", ZA: "upper_middle", LC: "upper_middle", VC: "upper_middle",
  SR: "upper_middle", TH: "upper_middle", TO: "upper_middle", TR: "upper_middle",
  TM: "upper_middle", TV: "upper_middle", AR: "upper_middle",
};

/** The band for a country code. Unknown or absent → high income. */
export function bandForCountry(country) {
  if (!country) return DEFAULT_BAND;
  return COUNTRY_BANDS[String(country).trim().toUpperCase()] ?? DEFAULT_BAND;
}

// ── The multiplier ───────────────────────────────────────────────────────────
/**
 * How much of the regional discount this segment gets.
 *
 * Reads as: start from the full list price, and apply the band's discount scaled
 * by the segment's weight. An SME in a low-income country pays 0.20 of list; a
 * regulated operator in the same country pays 0.80 of list, before its own
 * segment multiplier.
 */
export function bandWeightFor(bandId, segmentId) {
  const band = getBand(bandId);
  const segment = getSegment(segmentId);
  // Rounded because binary floating point makes 1 - (1 - 0.2) * 1 come out as
  // 0.19999999999999996. That is not a different price, it is noise — and it
  // would propagate into every figure derived from it.
  return round4(1 - (1 - band.multiplier) * segment.bandWeight);
}

/** The combined multiplier applied to a tier's list price. */
export function multiplierFor({ country, band, segment } = {}) {
  const bandId = band ?? bandForCountry(country);
  return round4(bandWeightFor(bandId, segment) * getSegment(segment).multiplier);
}

const round4 = (n) => Math.round(n * 10_000) / 10_000;

// ── Local display currency ───────────────────────────────────────────────────
/**
 * Indicative local amounts, for display only.
 *
 * The customer is CHARGED in USD — the platform settles in one currency, and
 * several of the currencies below cannot be charged by our processors anyway.
 * These rates exist so a Liberian buyer sees "about L$3,900/mo" instead of doing
 * the arithmetic themselves, and every surface that shows one must say the
 * amount is indicative.
 *
 * `asOf` is deliberately part of the data: a rate with no date is a rate nobody
 * can tell is stale. `rateAgeDays` surfaces it, and the UI warns past
 * STALE_AFTER_DAYS rather than quietly showing a wrong number.
 */
export const RATES_AS_OF = "2026-08-01";
export const STALE_AFTER_DAYS = 120;

export const CURRENCIES = {
  USD: { symbol: "$",    perUsd: 1,      step: 1,    countries: [] },
  LRD: { symbol: "L$",   perUsd: 195,    step: 500,  countries: ["LR"] },
  GHS: { symbol: "GH₵",  perUsd: 12.4,   step: 5,    countries: ["GH"] },
  NGN: { symbol: "₦",    perUsd: 1_550,  step: 1000, countries: ["NG"] },
  KES: { symbol: "KSh",  perUsd: 129,    step: 500,  countries: ["KE"] },
  ZAR: { symbol: "R",    perUsd: 18.2,   step: 10,   countries: ["ZA"] },
  XOF: { symbol: "CFA",  perUsd: 600,    step: 1000, countries: ["SN", "CI", "ML", "BF", "NE", "TG", "BJ", "GW"] },
  SLE: { symbol: "Le",   perUsd: 22.5,   step: 10,   countries: ["SL"] },
  INR: { symbol: "₹",    perUsd: 87,     step: 100,  countries: ["IN"] },
  PHP: { symbol: "₱",    perUsd: 58,     step: 50,   countries: ["PH"] },
  EGP: { symbol: "E£",   perUsd: 48.5,   step: 50,   countries: ["EG"] },
  BRL: { symbol: "R$",   perUsd: 5.4,    step: 5,    countries: ["BR"] },
  EUR: { symbol: "€",    perUsd: 0.92,   step: 1,    countries: ["FR", "DE", "ES", "IT", "NL", "BE", "PT", "IE", "AT", "FI", "GR"] },
  GBP: { symbol: "£",    perUsd: 0.78,   step: 1,    countries: ["GB"] },
};

const CURRENCY_BY_COUNTRY = (() => {
  const m = new Map();
  for (const [code, def] of Object.entries(CURRENCIES)) {
    for (const c of def.countries) m.set(c, code);
  }
  return m;
})();

/** The display currency for a country. Anything unmapped shows USD. */
export const currencyForCountry = (country) =>
  CURRENCY_BY_COUNTRY.get(String(country ?? "").trim().toUpperCase()) ?? "USD";

/** Whole days since the rates were set. */
export function rateAgeDays(now = new Date()) {
  return Math.floor((now - new Date(`${RATES_AS_OF}T00:00:00Z`)) / 86_400_000);
}
export const ratesAreStale = (now = new Date()) => rateAgeDays(now) > STALE_AFTER_DAYS;

/**
 * Convert a USD amount for display, rounded to a tidy local step.
 *
 * Rounds to NEAREST rather than up: rounding a price up by up to a whole step
 * would mean the figure shown is higher than the figure charged, which is the
 * one direction a price may never be wrong in.
 */
export function localAmount(usd, currency) {
  const def = CURRENCIES[currency] ?? CURRENCIES.USD;
  const raw = usd * def.perUsd;
  const step = def.step || 1;
  const rounded = Math.round(raw / step) * step;
  // Never round a non-zero price down to nothing.
  return rounded === 0 && usd > 0 ? step : rounded;
}

const GROUPED = (n) => n.toLocaleString("en-US");

/** A display string, e.g. "L$15,500" or "$79". */
export function formatLocal(usd, currency) {
  const def = CURRENCIES[currency] ?? CURRENCIES.USD;
  return `${def.symbol}${GROUPED(localAmount(usd, currency))}`;
}

/**
 * Everything a surface needs to show a price honestly: what is charged, what
 * that is worth locally, and whether the local figure can be trusted.
 */
export function displayPrice(usd, { country, currency } = {}, now = new Date()) {
  const code = currency ?? currencyForCountry(country);
  const isUsd = code === "USD";
  return {
    usd,
    charged: `$${GROUPED(usd)}`,
    currency: code,
    local: isUsd ? null : localAmount(usd, code),
    localFormatted: isUsd ? null : formatLocal(usd, code),
    // The one thing a reader must not be left to assume.
    indicative: !isUsd,
    ratesAsOf: RATES_AS_OF,
    stale: !isUsd && ratesAreStale(now),
  };
}

/** Describe a country's placement, for the admin UI and the pricing page. */
export function marketFor({ country, segment } = {}) {
  const bandId = bandForCountry(country);
  return {
    country: country ? String(country).toUpperCase() : null,
    band: bandId,
    bandLabel: getBand(bandId).label,
    segment: getSegment(segment).id,
    segmentLabel: getSegment(segment).label,
    currency: currencyForCountry(country),
    multiplier: multiplierFor({ country, segment }),
  };
}
