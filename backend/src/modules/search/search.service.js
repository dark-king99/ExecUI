/**
 * Federated search — one query across every module the caller can see.
 *
 * How it works, and why:
 *
 * • **No search index.** Sources are queried live through the registry, so a
 *   result can never be stale, and there's no reindex job to fail quietly. The
 *   cost is that matching is `ILIKE`-based rather than true full-text; the
 *   upgrade path (a Postgres `tsvector` column per source) is documented in
 *   docs/SEARCH.md and doesn't change this module's shape.
 *
 * • **Every term must match.** "acme invoice" finds rows containing both, not
 *   the union — the union is what makes search feel broken on a large database.
 *
 * • **Ranking happens in one place.** Each source contributes candidates; the
 *   engine scores them with the registry's field weights and sorts globally, so
 *   the best hit is first regardless of which module it came from.
 *
 * • **Access is applied before the query, not after.** A source the caller can't
 *   see is never queried at all, so its row count can't leak through timing or
 *   through a total that doesn't match the results.
 */
import prisma from "../../config/database.js";
import { log } from "../../lib/logger.js";
import {
  SOURCES, sourcesFor, getSource, describeSource, parseQuery, scoreRow, snippetFor,
} from "./search.registry.js";

const err = (message, status = 400) => { const e = new Error(message); e.status = status; return e; };

/** Candidates pulled per source before scoring. Wide enough that ranking is
 * meaningful, narrow enough that a vague query doesn't read the whole table. */
const PER_SOURCE_CANDIDATES = 40;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

/**
 * Prisma `where` for one source: every term must appear in at least one of the
 * source's searchable fields.
 */
export function buildWhere(source, terms) {
  const and = terms.map((term) => ({
    OR: source.fields.map(({ field }) => ({ [field]: { contains: term, mode: "insensitive" } })),
  }));
  return source.where ? { AND: [source.where, ...and] } : { AND: and };
}

/** Fields that must be selected to score and render a source's results. */
function selectFor(source) {
  const select = { ...(source.select ?? {}), id: true };
  for (const { field } of source.fields) select[field] = true;
  if (source.dateField) select[source.dateField] = true;
  return select;
}

const shapeHit = (source, row, terms, now) => ({
  id: row.id,
  source: source.id,
  sourceLabel: source.label,
  icon: source.icon,
  title: source.title(row) || "(untitled)",
  subtitle: source.subtitle?.(row) || null,
  snippet: snippetFor(source, row, terms),
  link: source.link?.(row) ?? null,
  date: source.dateField ? row[source.dateField] : null,
  score: scoreRow(source, row, terms, { now }),
});

/**
 * Run a search.
 *
 * `access` is the caller's resolved access descriptor ({ sections, isAdmin }) —
 * the same one the sidebar and every module guard use.
 */
export async function search(query, access = {}, { sources, limit = DEFAULT_LIMIT, perSource } = {}) {
  const { terms } = parseQuery(query);
  if (!terms.length) {
    return { query: String(query ?? "").trim(), terms: [], total: 0, results: [], groups: [], searched: [], truncated: false };
  }

  const allowed = sourcesFor(access);
  const requested = Array.isArray(sources) && sources.length
    ? sources.map(String)
    : null;

  // A caller asking for a source they can't see gets told, rather than getting a
  // silently empty result they'd read as "nothing matched".
  if (requested) {
    for (const id of requested) {
      const source = getSource(id);
      if (!source) throw err(`"${id}" isn't a searchable source`);
      if (!allowed.some((s) => s.id === source.id)) throw err(`You don't have access to search ${source.label.toLowerCase()}.`, 403);
    }
  }

  const targets = requested ? allowed.filter((s) => requested.includes(s.id)) : allowed;
  const take = Math.min(200, Math.max(5, Number(perSource) || PER_SOURCE_CANDIDATES));
  const cap = Math.min(MAX_LIMIT, Math.max(1, Number(limit) || DEFAULT_LIMIT));
  const now = Date.now();

  // Sources are independent, so query them together rather than in sequence.
  const settled = await Promise.allSettled(targets.map(async (source) => {
    const rows = await prisma[source.model].findMany({
      where: buildWhere(source, terms),
      select: selectFor(source),
      take,
      ...(source.dateField ? { orderBy: { [source.dateField]: "desc" } } : {}),
    });
    return { source, rows };
  }));

  const hits = [];
  const searched = [];
  for (const [i, outcome] of settled.entries()) {
    const source = targets[i];
    if (outcome.status !== "fulfilled") {
      // One broken source must not take the whole search down; say which failed.
      log.warn?.("search_source_failed", { source: source.id, error: outcome.reason?.message });
      searched.push({ id: source.id, label: source.label, count: 0, failed: true });
      continue;
    }
    const scored = outcome.value.rows
      .map((row) => shapeHit(source, row, terms, now))
      .filter((hit) => hit.score > 0);
    searched.push({ id: source.id, label: source.label, count: scored.length, failed: false });
    hits.push(...scored);
  }

  hits.sort((a, b) => b.score - a.score || String(a.title).localeCompare(String(b.title)));

  const results = hits.slice(0, cap);
  const groups = searched
    .filter((s) => s.count > 0)
    .map((s) => ({ ...s, shown: results.filter((r) => r.source === s.id).length }))
    .sort((a, b) => b.count - a.count);

  return {
    query: String(query).trim(),
    terms,
    total: hits.length,
    truncated: hits.length > results.length,
    results,
    groups,
    searched,
  };
}

/**
 * Type-ahead: a few of the best hits, for the command palette. Deliberately a
 * smaller net than a full search — a keystroke-latency query shouldn't read 40
 * rows from twenty tables.
 */
export async function suggest(query, access = {}, { limit = 8 } = {}) {
  const result = await search(query, access, { limit, perSource: 10 });
  return {
    query: result.query,
    results: result.results,
    total: result.total,
  };
}

/** What this caller may search — drives the filter chips in the UI. */
export function catalog(access = {}) {
  return {
    sources: sourcesFor(access).map(describeSource),
    all: Object.values(SOURCES).length,
    note: "Results are read live from each module — there is no search index to fall out of date.",
  };
}
