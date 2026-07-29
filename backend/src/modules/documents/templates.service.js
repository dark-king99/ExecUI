/**
 * Document templates — write an agreement once, generate it per counterparty.
 *
 * The body is plain text with `{{placeholders}}`, rendered by the *same*
 * prototype-safe templating the automation engine uses. Reusing it is
 * deliberate: templating is where injection bugs live, so there should be one
 * hardened implementation, not two.
 *
 * Generation produces a real PDF (pdfkit, already used by report exports) and
 * files it as version 1 of a new document — so a generated agreement enters the
 * same versioned, signable, checksummed pipeline as an uploaded one.
 */
import prisma from "../../config/database.js";
import { renderTemplate } from "../workflows/workflows.rules.js";
import { documentCategory, DOCUMENT_CATEGORIES } from "./documents.registry.js";
import { createDocument, addGeneratedVersion, getDocument } from "./documents.service.js";

const err = (message, status = 400) => { const e = new Error(message); e.status = status; return e; };

const MAX_BODY = 60_000;
const PLACEHOLDER = /\{\{\s*([\w.]+)\s*\}\}/g;

// Placeholders the engine fills in itself — never asked of the user.
const BUILTINS = new Set(["now", "event"]);

export const shape = (t) => ({
  id: t.id, name: t.name, description: t.description, category: t.category,
  categoryLabel: documentCategory(t.category)?.label ?? t.category,
  body: t.body, variables: t.variables ?? [], active: t.active,
  useCount: t.useCount, createdById: t.createdById,
  createdAt: t.createdAt, updatedAt: t.updatedAt,
});

/**
 * Every placeholder actually used in the body, in first-appearance order.
 * The declared variable list is advisory — this is the truth, so a template can
 * never ask for a value it doesn't use or silently drop one it does.
 */
export function placeholdersIn(body) {
  const found = [];
  for (const [, key] of String(body ?? "").matchAll(PLACEHOLDER)) {
    if (!BUILTINS.has(key) && !found.includes(key)) found.push(key);
  }
  return found;
}

/** Merge declared metadata (labels, required flags) with what the body uses. */
export function mergeVariables(body, declared = []) {
  const byKey = new Map(
    (Array.isArray(declared) ? declared : [])
      .filter((v) => v && v.key)
      .map((v) => [String(v.key), v]),
  );
  return placeholdersIn(body).map((key) => {
    const d = byKey.get(key) ?? {};
    return {
      key,
      label: String(d.label ?? key.replace(/[_.]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())).slice(0, 80),
      required: d.required !== false,
    };
  });
}

/** Which required variables a set of values is missing. */
export function missingVariables(variables = [], values = {}) {
  return variables
    .filter((v) => v.required)
    .filter((v) => {
      const raw = Object.prototype.hasOwnProperty.call(values, v.key) ? values[v.key] : undefined;
      return raw === undefined || raw === null || String(raw).trim() === "";
    })
    .map((v) => v.label || v.key);
}

// ── CRUD ─────────────────────────────────────────────────────────────────────
export async function listTemplates({ includeInactive = false } = {}) {
  const rows = await prisma.documentTemplate.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return rows.map(shape);
}

export async function getTemplate(id) {
  const row = await prisma.documentTemplate.findFirst({ where: { id } });
  if (!row) throw err("Template not found", 404);
  return shape(row);
}

function validate(body = {}, { partial = false } = {}) {
  const data = {};
  if (body.name !== undefined || !partial) {
    const name = String(body.name ?? "").trim();
    if (!name) throw err("A template needs a name");
    data.name = name.slice(0, 160);
  }
  if (body.body !== undefined || !partial) {
    const text = String(body.body ?? "").trim();
    if (!text) throw err("A template needs a body — the text of the document");
    if (text.length > MAX_BODY) throw err(`A template body is limited to ${MAX_BODY.toLocaleString()} characters`);
    data.body = text;
  }
  if (body.category !== undefined) {
    if (!documentCategory(body.category)) {
      throw err(`Unknown category "${body.category}". Pick one of: ${DOCUMENT_CATEGORIES.map((c) => c.id).join(", ")}`);
    }
    data.category = body.category;
  }
  if (body.description !== undefined) data.description = body.description ? String(body.description).slice(0, 1000) : null;
  if (body.active !== undefined) data.active = !!body.active;
  return data;
}

export async function createTemplate(user, body = {}) {
  const data = validate(body);
  data.category = data.category ?? body.category ?? "contract";
  data.variables = mergeVariables(data.body, body.variables);
  data.createdById = user.userId;
  return shape(await prisma.documentTemplate.create({ data }));
}

export async function updateTemplate(id, body = {}) {
  const existing = await prisma.documentTemplate.findFirst({ where: { id } });
  if (!existing) throw err("Template not found", 404);
  const data = validate(body, { partial: true });
  // Variables always track the body, whether or not the body changed.
  data.variables = mergeVariables(data.body ?? existing.body, body.variables ?? existing.variables);
  await prisma.documentTemplate.update({ where: { id }, data });
  return getTemplate(id);
}

export async function deleteTemplate(id) {
  const existing = await prisma.documentTemplate.findFirst({ where: { id } });
  if (!existing) throw err("Template not found", 404);
  await prisma.documentTemplate.delete({ where: { id } });
  return { deleted: true };
}

// ── Rendering ────────────────────────────────────────────────────────────────
/** Render a template body with user-supplied values. Pure. */
export function render(body, values = {}) {
  // Only own, primitive values are substituted; anything else renders empty.
  const extra = {};
  for (const [k, v] of Object.entries(values ?? {})) {
    if (v === null || v === undefined) continue;
    if (typeof v === "object" || typeof v === "function") continue;
    extra[k] = v;
  }
  return renderTemplate(body, { extra });
}

/** Preview without persisting anything — what the generated document will say. */
export async function previewTemplate(id, values = {}) {
  const t = await getTemplate(id);
  return {
    templateId: t.id,
    name: t.name,
    variables: t.variables,
    missing: missingVariables(t.variables, values),
    text: render(t.body, values),
  };
}

/**
 * Render the text into a paginated PDF. Deliberately plain: a legal document
 * wants readable body text and page numbers, not a designed layout.
 */
export async function toPdf(text, { title, subtitle } = {}) {
  const PDFDocument = (await import("pdfkit")).default;
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 64 });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      if (title) {
        doc.fontSize(18).fillColor("#0f172a").text(String(title), { align: "left" });
        doc.moveDown(0.3);
      }
      if (subtitle) {
        doc.fontSize(9).fillColor("#64748b").text(String(subtitle));
        doc.moveDown(0.8);
      }

      doc.fontSize(11).fillColor("#0f172a");
      // Blank lines are paragraph breaks; everything else flows and wraps.
      for (const para of String(text).split(/\n{2,}/)) {
        doc.text(para.replace(/\n/g, " "), { align: "left", lineGap: 3 });
        doc.moveDown(0.7);
      }

      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        doc.fontSize(8).fillColor("#94a3b8").text(
          `Page ${i + 1} of ${range.count}`,
          doc.page.margins.left,
          doc.page.height - 40,
          { width: doc.page.width - doc.page.margins.left - doc.page.margins.right, align: "center" },
        );
      }
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Generate a document from a template: render, make a PDF, create the document
 * and file the PDF as version 1. Refuses when a required value is missing —
 * generating an agreement with a blank counterparty name is worse than an error.
 */
export async function generate(user, id, { title, values = {}, entityType, entityId, confidential } = {}) {
  const t = await getTemplate(id);
  if (!t.active) throw err("This template is inactive — reactivate it before generating documents from it.");

  const missing = missingVariables(t.variables, values);
  if (missing.length) throw err(`Fill in: ${missing.join(", ")}`);

  const text = render(t.body, values);
  const docTitle = String(title ?? "").trim() || t.name;

  const created = await createDocument(user, {
    title: docTitle,
    description: t.description,
    category: t.category,
    confidential: confidential ?? false,
    templateId: t.id,
    entityType, entityId,
  });

  const pdf = await toPdf(text, {
    title: docTitle,
    subtitle: `Generated from template "${t.name}" on ${new Date().toUTCString()}`,
  });

  const withVersion = await addGeneratedVersion(user, created.id, {
    buffer: pdf,
    fileName: `${docTitle.replace(/[^a-z0-9\-_ ]/gi, "").trim().replace(/\s+/g, "-").slice(0, 60) || "document"}.pdf`,
    mimeType: "application/pdf",
    notes: `Generated from template "${t.name}"`,
  });

  await prisma.documentTemplate.update({ where: { id: t.id }, data: { useCount: { increment: 1 } } });
  return { document: withVersion ?? (await getDocument(created.id)), text };
}
