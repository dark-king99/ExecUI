/**
 * CSV import for Data Streams. RFC 4180 parsing (quoted fields, escaped quotes,
 * CRLF, newlines inside quotes), a header row, and a column mapping chosen by
 * the person importing:
 *   { email: "<header>", name?: "<header>", first_name?, last_name? }
 * Consent is recorded only when they attest it and say where it came from.
 */
import prisma from "../../../config/database.js";
import { upsertContact, grantConsent } from "./ingest.js";
import { isEmail, normEmail } from "../foundation.js";

const err = (message, status = 400) => Object.assign(new Error(message), { status });
export const MAX_ROWS = 50_000;

/** Parse CSV text into rows of strings. Detects , ; or tab from the header line. */
export function parseCsv(text) {
  const src = String(text ?? "").replace(/^﻿/, "");
  const firstLine = src.slice(0, src.search(/\r?\n|$/));
  const delim = [",", ";", "\t"].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') { if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += ch;
      continue;
    }
    if (ch === '"' && field === "") { quoted = true; continue; }
    if (ch === delim) { row.push(field); field = ""; continue; }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      if (rows.length > MAX_ROWS + 1) throw err(`A file can have at most ${MAX_ROWS.toLocaleString()} rows`);
      continue;
    }
    field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  if (quoted) throw err("The file ends inside a quoted field — check for a missing closing quote");
  return rows;
}

const GUESS = { email: /^(e-?mail|email address|e-mail address)$/i, name: /^(name|full name|contact|contact name)$/i, first_name: /^(first|first name|given name|firstname)$/i, last_name: /^(last|last name|surname|family name|lastname)$/i };

/** Headers, a sample, and a suggested mapping. */
export function preview(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw err("The file needs a header row and at least one data row");
  const headers = rows[0].map((h) => h.trim());
  const mapping = {};
  for (const [k, re] of Object.entries(GUESS)) {
    const h = headers.find((x) => re.test(x));
    if (h) mapping[k] = h;
  }
  if (!mapping.email) {
    const col = headers.findIndex((_, i) => rows.slice(1, 20).filter((r) => isEmail(r[i])).length >= Math.min(3, rows.length - 1));
    if (col >= 0) mapping.email = headers[col];
  }
  return { headers, rows: rows.length - 1, sample: rows.slice(1, 6), mapping };
}

/** Run an import into a CSV source. Records the run, row by row problems included. */
export async function importCsv(source, { text, fileName, mapping = {}, consent = null, actorId = null }) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw err("The file needs a header row and at least one data row");
  const headers = rows[0].map((h) => h.trim());
  const col = (k) => (mapping[k] ? headers.indexOf(mapping[k]) : -1);
  const ei = col("email");
  if (ei < 0) throw err("Choose which column holds the email address");
  if (consent && (!consent.attested || String(consent.evidence ?? "").trim().length < 3)) {
    throw err("To record consent, confirm these people agreed and say where (e.g. \"Trade show sign-up sheet, Oct 2026\")");
  }
  const [ni, fi, li] = [col("name"), col("first_name"), col("last_name")];
  const run = await prisma.marketingIngestRun.create({ data: { tenantId: source.tenantId, sourceId: source.id, fileName: fileName ? String(fileName).slice(0, 200) : null, rows: rows.length - 1, startedById: actorId } });
  const out = { created: 0, updated: 0, consented: 0, skipped: 0, errors: [] };
  const seen = new Set();
  try {
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const email = normEmail(row[ei]);
      const problem = (m) => { out.skipped += 1; if (out.errors.length < 100) out.errors.push({ row: r + 1, error: m }); };
      if (!isEmail(email)) { problem(`"${String(row[ei] ?? "").slice(0, 60)}" isn't an email address`); continue; }
      if (seen.has(email)) { problem("Duplicate of an earlier row"); continue; }
      seen.add(email);
      const name = ni >= 0 ? row[ni] : [fi >= 0 ? row[fi] : "", li >= 0 ? row[li] : ""].join(" ").trim();
      const { contact, created } = await upsertContact(source.tenantId, { email, name });
      if (created) out.created += 1; else out.updated += 1;
      if (consent) {
        const c = await grantConsent(source.tenantId, contact.id, { source: "import", evidence: `${consent.evidence} (file ${fileName ?? "upload"})`, actorId });
        if (c === "subscribed") out.consented += 1;
        else if (c !== "already" && out.errors.length < 100) out.errors.push({ row: r + 1, error: c === "suppressed" ? "Address is suppressed — consent not recorded" : `Consent kept as ${c.replace("kept_", "")}` });
      }
    }
    await prisma.marketingIngestRun.update({ where: { id: run.id }, data: { status: "completed", created: out.created, updated: out.updated, consented: out.consented, skipped: out.skipped, errors: out.errors, finishedAt: new Date() } });
  } catch (e) {
    await prisma.marketingIngestRun.update({ where: { id: run.id }, data: { status: "failed", created: out.created, updated: out.updated, consented: out.consented, skipped: out.skipped, errors: [...out.errors, { row: null, error: e.message }].slice(0, 101), finishedAt: new Date() } });
    throw e;
  }
  await prisma.marketingDataSource.update({ where: { id: source.id }, data: { received: { increment: out.created + out.updated }, rejected: { increment: out.skipped }, lastReceivedAt: new Date() } });
  return { runId: run.id, rows: rows.length - 1, ...out };
}
