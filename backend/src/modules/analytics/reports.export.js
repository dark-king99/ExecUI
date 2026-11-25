/**
 * Report exporters — CSV, Excel (.xlsx) and PDF.
 *
 * All three take the engine's { columns, rows } result so a downloaded file and
 * the on-screen table can never disagree.
 *
 * CSV note: spreadsheet apps execute cells starting with = + - @ (and tab/CR) as
 * formulas, so a value like `=cmd|…` in a CRM record could attack whoever opens
 * the export. Every text cell is neutralised with a leading apostrophe — this is
 * the standard CSV-injection defence and it applies to Excel output too.
 */

const FORMULA_LEAD = /^[=+\-@\t\r]/;

export const FORMATS = ["csv", "xlsx", "pdf"];
export const MIME = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

const isDate = (v) => v instanceof Date;

/** Human-facing cell value (dates → ISO-ish, null → empty). */
export function displayValue(v) {
  if (v == null) return "";
  if (isDate(v)) return v.toISOString().slice(0, 19).replace("T", " ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

/** Neutralise spreadsheet formula injection in a text cell. */
export function sanitizeCell(text) {
  const s = String(text ?? "");
  return FORMULA_LEAD.test(s) ? `'${s}` : s;
}

export function safeFilename(name, ext) {
  const base = String(name || "report").replace(/[^a-z0-9\-_ ]/gi, "").trim().replace(/\s+/g, "-").slice(0, 60) || "report";
  return `${base}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

// ── CSV ──────────────────────────────────────────────────────────────────────
const csvCell = (v) => {
  const s = sanitizeCell(displayValue(v));
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv({ columns, rows }) {
  const head = columns.map((c) => csvCell(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => csvCell(r[c.key])).join(",")).join("\n");
  // BOM so Excel opens UTF-8 correctly.
  return Buffer.from(`﻿${head}\n${body}\n`, "utf8");
}

// ── Excel ────────────────────────────────────────────────────────────────────
export async function toXlsx({ columns, rows }, meta = {}) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "ExecUI";
  wb.created = new Date();
  const ws = wb.addWorksheet((meta.name || "Report").slice(0, 31));

  ws.columns = columns.map((c) => ({
    header: c.label,
    key: c.key,
    width: Math.min(46, Math.max(12, String(c.label).length + 4)),
  }));

  for (const r of rows) {
    const row = {};
    for (const c of columns) {
      const v = r[c.key];
      // Keep numbers and dates native so Excel can sort/sum them; text is sanitised.
      row[c.key] = typeof v === "number" || isDate(v) ? v : sanitizeCell(displayValue(v));
    }
    ws.addRow(row);
  }

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  columns.forEach((c, i) => {
    if (c.money) ws.getColumn(i + 1).numFmt = "#,##0.00";
    else if (c.type === "number") ws.getColumn(i + 1).numFmt = "#,##0.##";
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ── PDF ──────────────────────────────────────────────────────────────────────
export async function toPdf({ columns, rows }, meta = {}) {
  const PDFDocument = (await import("pdfkit")).default;

  return new Promise((resolve, reject) => {
    try {
      const landscape = columns.length > 5;
      const doc = new PDFDocument({ size: "A4", layout: landscape ? "landscape" : "portrait", margin: 36 });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const left = doc.page.margins.left;
      const usable = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const colW = usable / columns.length;

      // Header block
      doc.fontSize(16).fillColor("#0f172a").text(meta.name || "Report", { continued: false });
      doc.moveDown(0.2);
      doc.fontSize(8).fillColor("#64748b")
        .text(`Generated ${new Date().toUTCString()}${meta.subtitle ? ` · ${meta.subtitle}` : ""}`);
      if (meta.rowSummary) doc.fontSize(8).fillColor("#64748b").text(meta.rowSummary);
      doc.moveDown(0.6);

      const drawHeader = () => {
        const y = doc.y;
        doc.rect(left, y - 2, usable, 16).fill("#eef2ff");
        doc.fillColor("#1e293b").fontSize(8);
        columns.forEach((c, i) => {
          doc.text(String(c.label), left + i * colW + 4, y + 2, { width: colW - 8, ellipsis: true, lineBreak: false });
        });
        doc.y = y + 18;
        doc.fillColor("#0f172a");
      };

      drawHeader();
      doc.fontSize(8);

      const bottom = doc.page.height - doc.page.margins.bottom - 20;
      rows.forEach((r, idx) => {
        if (doc.y > bottom) {
          doc.addPage({ layout: landscape ? "landscape" : "portrait", margin: 36 });
          drawHeader();
          doc.fontSize(8);
        }
        const y = doc.y;
        if (idx % 2 === 1) doc.rect(left, y - 2, usable, 14).fill("#f8fafc").fillColor("#0f172a");
        columns.forEach((c, i) => {
          const v = r[c.key];
          const text = typeof v === "number" ? v.toLocaleString() : displayValue(v);
          doc.fillColor("#0f172a").text(text, left + i * colW + 4, y + 1, { width: colW - 8, ellipsis: true, lineBreak: false });
        });
        doc.y = y + 14;
      });

      if (!rows.length) {
        doc.moveDown(1).fillColor("#94a3b8").fontSize(10).text("No rows matched this report.", { align: "center" });
      }

      // Page footer
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(7).fillColor("#94a3b8").text(
          `ExecUI · page ${i - range.start + 1} of ${range.count}`,
          left, doc.page.height - doc.page.margins.bottom - 10,
          { width: usable, align: "center", lineBreak: false },
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/** Render a result to the requested format. Returns { buffer, mime, filename }. */
export async function renderExport(format, result, meta = {}) {
  const fmt = FORMATS.includes(format) ? format : "csv";
  const rowSummary = `${result.rows.length.toLocaleString()} of ${result.totalRows.toLocaleString()} row(s)`;
  const withMeta = { ...meta, rowSummary };
  const buffer =
    fmt === "xlsx" ? await toXlsx(result, withMeta)
    : fmt === "pdf" ? await toPdf(result, withMeta)
    : toCsv(result);
  return { buffer, mime: MIME[fmt], filename: safeFilename(meta.name, fmt), format: fmt };
}
