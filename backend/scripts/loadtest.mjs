/**
 * Lightweight load / stress test — zero dependencies (Node's global fetch).
 *
 * Fires a fixed number of concurrent workers at an endpoint for a duration and
 * reports throughput, latency percentiles and error rate. Use it to find the
 * knee in the curve before real users do, and to validate the rate limiter and
 * overload protection (concurrencyLimiter / requestTimeout) behave under load.
 *
 * Usage:
 *   node scripts/loadtest.mjs --url http://localhost:5555/api/health \
 *        --concurrency 50 --duration 20 [--token <JWT>] [--method GET]
 *
 * Suggested runs:
 *   • Health (no auth):     --url .../api/health --concurrency 100 --duration 30
 *   • Authed read:          --url .../api/overview/dashboard --token <JWT> -c 50
 *   • Ramp until errors climb to find the safe ceiling; watch p95 and 429s.
 */
// Parse --key value, --key=value, and short -c / -d flags.
const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith("-")) continue;
  const key = a.replace(/^-+/, "");
  if (key.includes("=")) { const [k, v] = key.split("="); args[k] = v; continue; }
  const next = argv[i + 1];
  if (next != null && !next.startsWith("-")) { args[key] = next; i++; } else { args[key] = "true"; }
}
const URL = args.url || "http://localhost:5555/api/health";
const CONCURRENCY = Number(args.concurrency || args.c || 50);
const DURATION = Number(args.duration || args.d || 20) * 1000;
const METHOD = (args.method || "GET").toUpperCase();
const TOKEN = args.token || process.env.LOADTEST_TOKEN || "";
const BODY = args.body || null;

const headers = { "content-type": "application/json", ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}) };
const latencies = [];
let ok = 0, errors = 0, rateLimited = 0, done = false;
const codes = {};

async function worker() {
  while (!done) {
    const t0 = performance.now();
    try {
      const res = await fetch(URL, { method: METHOD, headers, body: BODY });
      const ms = performance.now() - t0;
      latencies.push(ms);
      codes[res.status] = (codes[res.status] || 0) + 1;
      if (res.status === 429) rateLimited++;
      else if (res.ok) ok++;
      else errors++;
      await res.arrayBuffer(); // drain the body so sockets are reused
    } catch {
      errors++;
      latencies.push(performance.now() - t0);
    }
  }
}

function pct(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

const started = Date.now();
console.log(`▶  ${METHOD} ${URL}\n   ${CONCURRENCY} workers · ${DURATION / 1000}s${TOKEN ? " · authed" : ""}\n`);
setTimeout(() => { done = true; }, DURATION);

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const elapsed = (Date.now() - started) / 1000;
const total = ok + errors + rateLimited;
const sorted = latencies.sort((a, b) => a - b);
const avg = sorted.reduce((a, b) => a + b, 0) / (sorted.length || 1);

console.log("── Results ──────────────────────────────");
console.log(`requests      ${total}  (${(total / elapsed).toFixed(0)}/s)`);
console.log(`success       ${ok}`);
console.log(`rate-limited  ${rateLimited}  (429 — expected under stress)`);
console.log(`errors        ${errors}`);
console.log(`status codes  ${JSON.stringify(codes)}`);
console.log(`latency avg   ${avg.toFixed(1)} ms`);
console.log(`latency p50   ${pct(sorted, 50).toFixed(1)} ms`);
console.log(`latency p95   ${pct(sorted, 95).toFixed(1)} ms`);
console.log(`latency p99   ${pct(sorted, 99).toFixed(1)} ms`);
console.log(`latency max   ${(sorted[sorted.length - 1] || 0).toFixed(1)} ms`);
const errRate = total ? ((errors / total) * 100).toFixed(2) : "0";
console.log(`error rate    ${errRate}%`);
process.exit(Number(errRate) > 1 ? 1 : 0); // non-zero exit if >1% hard errors (CI-friendly)
