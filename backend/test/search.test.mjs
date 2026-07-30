import test from "node:test";
import assert from "node:assert/strict";
import {
  SOURCES, SOURCE_IDS, getSource, sourcesFor, canSearch, describeSource,
  parseQuery, matchQuality, scoreRow, snippetFor,
} from "../src/modules/search/search.registry.js";
import { buildWhere } from "../src/modules/search/search.service.js";
import {
  slugify, autoExcerpt, readingMinutes, publicWhere, VISIBILITIES, STATUSES,
} from "../src/modules/helpdesk/kb.service.js";
import {
  STATUSES as TICKET_STATUSES, PRIORITIES, OPEN_STATUSES, publicMessageWhere,
} from "../src/modules/helpdesk/tickets.service.js";
import { hashToken, newToken, portalUrl, magicUrl } from "../src/modules/helpdesk/portal.service.js";

// ── Search registry integrity ────────────────────────────────────────────────
test("every search source is internally consistent", () => {
  for (const s of Object.values(SOURCES)) {
    assert.ok(s.id && s.label, "needs an id and label");
    assert.ok(s.model, `${s.id} needs a Prisma model`);
    assert.ok(s.fields?.length, `${s.id} must declare searchable fields`);
    assert.equal(typeof s.title, "function", `${s.id} needs a title builder`);
    for (const f of s.fields) {
      assert.ok(f.field, `${s.id} has a field with no name`);
      assert.ok(f.weight > 0 && f.weight <= 10, `${s.id}.${f.field} weight out of range`);
    }
    if (s.dateField) assert.ok(typeof s.dateField === "string");
  }
  assert.equal(new Set(SOURCE_IDS).size, SOURCE_IDS.length, "duplicate source id");
  assert.equal(getSource("nope"), null);
});

test("staff and contract data are admin-only, and module sources are gated", () => {
  // The whole point of the registry is that search can't become a side door
  // around the access model.
  assert.equal(SOURCES.people.adminOnly, true, "the staff directory is not open to everyone");
  assert.equal(SOURCES.contracts.adminOnly, true, "commercial terms are not open to everyone");
  assert.equal(SOURCES.contacts.module, "crm");
  assert.equal(SOURCES.devices.module, "network");
  assert.equal(SOURCES.campaigns.module, "marketing");
});

test("a caller only ever gets the sources their access allows", () => {
  const none = sourcesFor({ sections: [], isAdmin: false }).map((s) => s.id);
  assert.ok(!none.includes("people"), "a non-admin never searches the staff directory");
  assert.ok(!none.includes("contracts"));
  assert.ok(!none.includes("contacts"), "no crm section ⇒ no contacts");
  assert.ok(none.includes("documents"), "documents are company-wide");
  assert.ok(none.includes("kb_articles"), "so is the knowledge base");

  const crm = sourcesFor({ sections: ["crm"], isAdmin: false }).map((s) => s.id);
  assert.ok(crm.includes("contacts") && crm.includes("tickets"));
  assert.ok(!crm.includes("devices"), "crm access doesn't grant network");

  const admin = sourcesFor({ sections: ["crm", "network"], isAdmin: true }).map((s) => s.id);
  assert.ok(admin.includes("people") && admin.includes("contracts"));

  assert.ok(canSearch(SOURCES.people, { isAdmin: true }));
  assert.ok(!canSearch(SOURCES.people, { isAdmin: false }));
  assert.ok(!canSearch(null, { isAdmin: true }));
});

test("the described source exposes no internals", () => {
  const d = describeSource(SOURCES.contacts);
  assert.ok(!("model" in d), "the Prisma model is an internal detail");
  assert.ok(!("fields" in d), "so is the field list");
  assert.ok(d.id && d.label);
});

// ── Query parsing ────────────────────────────────────────────────────────────
test("queries split into terms, keeping quoted phrases whole", () => {
  assert.deepEqual(parseQuery("acme invoice").terms, ["acme", "invoice"]);
  assert.deepEqual(parseQuery('  spaced   out  ').terms, ["spaced", "out"]);
  const quoted = parseQuery('"acme corp" invoice');
  assert.deepEqual(quoted.phrases, ["acme corp"]);
  assert.deepEqual(quoted.terms, ["acme corp", "invoice"]);
});

test("noise is dropped rather than searched for", () => {
  // A single character matches most of the database, so it's useless as a term.
  assert.deepEqual(parseQuery("a").terms, []);
  assert.deepEqual(parseQuery("a bc").terms, ["bc"]);
  assert.deepEqual(parseQuery("").terms, []);
  assert.deepEqual(parseQuery(null).terms, []);
  assert.deepEqual(parseQuery('""').terms, []);
  // Bounded, so a pathological query can't fan out into fifty ILIKEs per table.
  assert.ok(parseQuery("a1 b2 c3 d4 e5 f6 g7 h8 i9").terms.length <= 6);
  assert.ok(parseQuery("x".repeat(500)).terms[0].length <= 60);
});

// ── Matching and ranking ─────────────────────────────────────────────────────
test("match quality ranks exact above prefix above word-start above substring", () => {
  assert.equal(matchQuality("Acme", "acme"), 4);
  assert.equal(matchQuality("Acme Corp", "acme"), 3);
  assert.equal(matchQuality("The Acme Corp", "acme"), 2);
  assert.equal(matchQuality("Roadmap", "ad"), 1);
  assert.equal(matchQuality("Roadmap", "zz"), 0);
  assert.equal(matchQuality(null, "acme"), 0);
  assert.equal(matchQuality("Acme", ""), 0);
});

test("a term with regex characters is matched literally, not as a pattern", () => {
  // ".*" must not match everything, or one stray character turns a search into
  // a full table scan that appears to match every row.
  assert.equal(matchQuality("hello world", ".*"), 0);
  assert.equal(matchQuality("a.b", "a.b"), 4);
  assert.equal(matchQuality("price (net)", "(net)"), 1);
});

const source = {
  id: "t", label: "T", model: "m",
  fields: [{ field: "title", weight: 10 }, { field: "note", weight: 3 }],
  dateField: "createdAt",
  title: (r) => r.title,
};
const NOW = new Date("2026-07-30T00:00:00Z").getTime();

test("a name match outranks the same word buried in a note", () => {
  const byTitle = scoreRow(source, { title: "Acme", note: "" }, ["acme"], { now: NOW });
  const byNote = scoreRow(source, { title: "Something", note: "mentions acme" }, ["acme"], { now: NOW });
  assert.ok(byTitle > byNote, `${byTitle} should beat ${byNote}`);
});

test("matching every term beats matching one term well", () => {
  const both = scoreRow(source, { title: "Acme invoice", note: "" }, ["acme", "invoice"], { now: NOW });
  const one = scoreRow(source, { title: "Acme", note: "" }, ["acme", "invoice"], { now: NOW });
  assert.ok(both > one * 1.2, `${both} should clearly beat ${one}`);
});

test("a row matching nothing scores zero and is dropped", () => {
  assert.equal(scoreRow(source, { title: "Nothing here", note: null }, ["zzz"], { now: NOW }), 0);
});

test("recency breaks ties without overturning relevance", () => {
  const fresh = scoreRow(source, { title: "Acme", createdAt: new Date(NOW) }, ["acme"], { now: NOW });
  const old = scoreRow(source, { title: "Acme", createdAt: new Date(NOW - 400 * 86_400_000) }, ["acme"], { now: NOW });
  assert.ok(fresh > old, "the fresher of two identical matches wins");

  // But a weak fresh match must not beat a strong old one.
  const weakFresh = scoreRow(source, { title: "xx acme yy", note: "", createdAt: new Date(NOW) }, ["acme"], { now: NOW });
  const strongOld = scoreRow(source, { title: "Acme", createdAt: new Date(NOW - 400 * 86_400_000) }, ["acme"], { now: NOW });
  assert.ok(strongOld > weakFresh, `an exact title match (${strongOld}) must beat a substring (${weakFresh})`);
});

test("identifier fields only match when they really match", () => {
  // "TKT-00042" contains "4", but a ticket whose number merely contains a digit
  // is not a search result anybody wanted.
  const withId = {
    id: "t", label: "T", model: "m", title: (r) => r.subject,
    fields: [{ field: "ticket_number", weight: 9, exactOnly: true }, { field: "subject", weight: 10 }],
  };
  assert.equal(scoreRow(withId, { ticket_number: "TKT-00042", subject: "Login broken" }, ["4"], { now: NOW }), 0);
  assert.ok(scoreRow(withId, { ticket_number: "TKT-00042", subject: "Login broken" }, ["tkt-00042"], { now: NOW }) > 0);
  assert.ok(scoreRow(withId, { ticket_number: "TKT-00042", subject: "Login broken" }, ["tkt-000"], { now: NOW }) > 0,
    "a prefix of a reference is a real way to search for it");
});

test("the snippet shows context around the match", () => {
  const long = { title: "x", note: `${"lorem ipsum ".repeat(20)}needle${" dolor sit".repeat(10)}` };
  const snippet = snippetFor(source, long, ["needle"]);
  assert.ok(snippet.includes("needle"));
  assert.ok(snippet.startsWith("…"), "a mid-string match is elided at the front");
  assert.ok(snippet.length < 200);
  assert.equal(snippetFor(source, { title: "short", note: null }, ["short"]), null,
    "a short field needs no snippet — the title already shows it");
});

// ── Query construction ───────────────────────────────────────────────────────
test("the where clause requires every term, in any field", () => {
  const where = buildWhere(source, ["acme", "invoice"]);
  assert.equal(where.AND.length, 2, "one clause per term");
  assert.equal(where.AND[0].OR.length, 2, "each term may match either field");
  assert.deepEqual(where.AND[0].OR[0], { title: { contains: "acme", mode: "insensitive" } });
  assert.ok(where.AND[1].OR.some((c) => c.note?.contains === "invoice"));
});

test("a source's own filter is preserved alongside the query", () => {
  // Without this, searching would surface archived documents and inactive people.
  const scoped = buildWhere({ ...source, where: { status: "active" } }, ["acme"]);
  assert.deepEqual(scoped.AND[0], { status: "active" });
  assert.equal(scoped.AND.length, 2);
});

test("sources that must not surface stale records declare a filter", () => {
  assert.deepEqual(SOURCES.documents.where, { status: "active" });
  assert.deepEqual(SOURCES.people.where, { isActive: true });
  assert.deepEqual(SOURCES.kb_articles.where, { status: { not: "archived" } });
});

// ── Knowledge base ───────────────────────────────────────────────────────────
test("only published, public articles are ever customer-visible", () => {
  // Two independent switches, both of which must be open. If this ever collapses
  // into one, a public draft becomes readable by customers.
  assert.deepEqual(publicWhere(), { status: "published", visibility: "public" });
  assert.ok(VISIBILITIES.includes("internal"));
  assert.ok(STATUSES.includes("draft") && STATUSES.includes("archived"));
});

test("slugs are url-safe, bounded and never empty", () => {
  assert.equal(slugify("How do I reset my password?"), "how-do-i-reset-my-password");
  assert.equal(slugify("  Spaces   &   symbols!!  "), "spaces-symbols");
  assert.equal(slugify("Ünïcödé Títle"), "unicode-title");
  assert.equal(slugify(""), "article", "an empty title still needs a usable slug");
  assert.equal(slugify("!!!"), "article");
  assert.ok(slugify("x".repeat(200)).length <= 80);
  assert.ok(!slugify("-leading and trailing-").startsWith("-"));
});

test("an excerpt is generated when none is written, and cut at a sentence", () => {
  const body = "First sentence explains it. Second sentence adds detail that goes on for a while and keeps going well past the limit so it has to be cut somewhere sensible.";
  const excerpt = autoExcerpt(body, 120);
  assert.ok(excerpt.length <= 121);
  assert.ok(excerpt.startsWith("First sentence explains it."));
  assert.equal(autoExcerpt("Short."), "Short.", "a short body is its own excerpt");
  assert.equal(autoExcerpt(""), null);
  assert.ok(!autoExcerpt("# Heading\n\n**bold** text").includes("#"), "markup is stripped");
});

test("reading time is at least a minute and scales with length", () => {
  assert.equal(readingMinutes(""), 1, "never zero — '0 min read' reads as broken");
  assert.equal(readingMinutes("word ".repeat(200)), 1);
  assert.equal(readingMinutes("word ".repeat(600)), 3);
});

// ── Tickets ──────────────────────────────────────────────────────────────────
test("the open statuses are the ones a customer is waiting on", () => {
  assert.deepEqual(OPEN_STATUSES, ["open", "in_progress", "pending"]);
  assert.ok(!OPEN_STATUSES.includes("resolved"));
  assert.ok(!OPEN_STATUSES.includes("closed"));
  for (const s of OPEN_STATUSES) assert.ok(TICKET_STATUSES.includes(s));
  assert.deepEqual(PRIORITIES, ["low", "medium", "high", "urgent"]);
});

test("only public messages are ever served to a customer", () => {
  // The single filter behind every portal read of a conversation.
  assert.deepEqual(publicMessageWhere(), { visibility: "public" });
});

// ── Portal tokens ────────────────────────────────────────────────────────────
test("portal tokens are long, unguessable and stored only as hashes", () => {
  const a = newToken(), b = newToken();
  assert.notEqual(a, b);
  assert.ok(a.length >= 40, "a sign-in token must carry real entropy");
  assert.match(a, /^[A-Za-z0-9_-]+$/, "url-safe so it survives being emailed");

  const hash = hashToken(a);
  assert.equal(hash.length, 64, "sha-256 hex");
  assert.notEqual(hash, a, "the token itself is never what we store");
  assert.equal(hashToken(a), hash, "hashing is stable, so lookups work");
  assert.notEqual(hashToken(b), hash);
});

test("portal URLs address the tenant by slug and carry the token in the query", () => {
  assert.match(portalUrl("acme-co"), /\/portal\/acme-co$/);
  const url = magicUrl("acme-co", "tok en/+");
  assert.ok(url.includes("/portal/acme-co?t="));
  assert.ok(!url.includes("tok en"), "the token is percent-encoded");
  assert.match(portalUrl("a b"), /\/portal\/a%20b$/);
});

// ── The registry must describe columns that exist ─────────────────────────────
/**
 * Every source is queried live against Prisma, and a source whose query throws
 * degrades to a warning rather than failing the search — which is the right
 * behaviour at runtime and a terrible way to find a typo. The `sops` source
 * referenced `content` and `category` on a model that has `description` and
 * `department`: it threw on every single query, and SOPs were simply never
 * searchable. Nothing failed, so nothing was noticed.
 *
 * So the registry is checked against the generated schema instead of trusted.
 */
test("every searchable field and returned column exists on its model", async () => {
  const { Prisma } = await import("@prisma/client");
  const byDelegate = new Map(
    Prisma.dmmf.datamodel.models.map((m) => [m.name[0].toLowerCase() + m.name.slice(1), m]),
  );

  for (const source of Object.values(SOURCES)) {
    const model = byDelegate.get(source.model);
    assert.ok(model, `source "${source.id}" names unknown model "${source.model}"`);
    const columns = new Set(model.fields.map((f) => f.name));

    for (const { field } of source.fields) {
      assert.ok(columns.has(field), `${source.id}: matched field "${field}" is not a column on ${source.model}`);
    }
    for (const column of Object.keys(source.select ?? {})) {
      assert.ok(columns.has(column), `${source.id}: selected column "${column}" is not on ${source.model}`);
    }
    if (source.dateField) {
      assert.ok(columns.has(source.dateField), `${source.id}: dateField "${source.dateField}" is not on ${source.model}`);
    }
    for (const column of Object.keys(source.where ?? {})) {
      if (column.startsWith("$") || ["AND", "OR", "NOT"].includes(column)) continue;
      assert.ok(columns.has(column), `${source.id}: filter column "${column}" is not on ${source.model}`);
    }
  }
});

test("a source only matches on string columns — `contains` is meaningless otherwise", async () => {
  const { Prisma } = await import("@prisma/client");
  const byDelegate = new Map(
    Prisma.dmmf.datamodel.models.map((m) => [m.name[0].toLowerCase() + m.name.slice(1), m]),
  );

  for (const source of Object.values(SOURCES)) {
    const model = byDelegate.get(source.model);
    const typeOf = new Map(model.fields.map((f) => [f.name, f.type]));
    for (const { field } of source.fields) {
      assert.equal(typeOf.get(field), "String", `${source.id}: "${field}" is a ${typeOf.get(field)}, not text`);
    }
  }
});

test("every field a source returns for display is one it selected", async () => {
  const { Prisma } = await import("@prisma/client");
  const byDelegate = new Map(
    Prisma.dmmf.datamodel.models.map((m) => [m.name[0].toLowerCase() + m.name.slice(1), m]),
  );
  // A plausible value per column type, so the builders are exercised the way the
  // database would exercise them (a String[] column must arrive as an array).
  const sample = (field, name) => {
    if (field.isList) return [`${name}-a`, `${name}-b`];
    switch (field.type) {
      case "Int": case "Float": case "Decimal": case "BigInt": return 7;
      case "Boolean": return true;
      case "DateTime": return new Date("2026-07-01T00:00:00Z");
      case "Json": return {};
      default: return name === "id" ? "rec-1" : `${name}-value`;
    }
  };

  for (const source of Object.values(SOURCES)) {
    const model = byDelegate.get(source.model);
    const fieldsByName = new Map(model.fields.map((f) => [f.name, f]));
    const selected = new Set(Object.keys(source.select ?? {}));
    // Feed the builders a row containing only the selected columns; a builder
    // reaching for anything else would render "undefined" in the results list.
    const row = Object.fromEntries([...selected].map((k) => [k, sample(fieldsByName.get(k) ?? {}, k)]));
    const title = source.title(row);
    assert.ok(title === undefined || typeof title === "string", `${source.id}: title must be a string`);
    if (source.subtitle) {
      const subtitle = source.subtitle(row);
      assert.ok(subtitle === undefined || typeof subtitle === "string", `${source.id}: subtitle must be a string`);
      assert.ok(!String(subtitle).includes("undefined"), `${source.id}: subtitle reads from a column it didn't select`);
    }
    assert.ok(!String(title).includes("undefined"), `${source.id}: title reads from a column it didn't select`);
  }
});
