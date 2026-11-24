/**
 * Relation metadata, read from prisma/schema.prisma.
 *
 * Prisma 5 exposed each relation's `relationFromFields` and `relationOnDelete`
 * on the runtime DMMF (`Prisma.dmmf`). Prisma 7 strips both: relation fields are
 * still listed, but with no foreign key and no referential action. Code that
 * derived safety rules from those properties didn't fail — it quietly computed
 * empty lists, and the tests asserting on them passed vacuously.
 *
 * The schema file is the source those properties were generated from, and it
 * ships in every image (migrations run from it on boot), so this reads it
 * directly. Scalar field names are still on the DMMF and the tenant guard in
 * config/database.js keeps using them; this is only for relations.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../prisma/schema.prisma");

let cached = null;

/**
 * Every relation that owns a foreign key, as
 * { model, field, target, fields: [...], optional, onDelete }.
 *
 * `onDelete` is resolved to what the database actually does when the schema
 * leaves it unset: Prisma's default is Restrict for a required relation and
 * SetNull for an optional one.
 */
export function schemaRelations(schemaPath = SCHEMA_PATH) {
  if (cached && schemaPath === SCHEMA_PATH) return cached;
  const text = fs.readFileSync(schemaPath, "utf8");
  const relations = [];
  for (const [, model, body] of text.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
    for (const line of body.split("\n")) {
      const code = line.replace(/\/\/.*$/, "");
      const rel = code.match(/^\s*(\w+)\s+(\w+)(\??)(\[\])?\s+@relation\(([^)]*)\)/);
      if (!rel) continue;
      const [, field, target, optional, list, args] = rel;
      const fields = args.match(/fields:\s*\[([^\]]*)\]/)?.[1];
      if (list || !fields) continue; // the other side of a relation owns no key
      const explicit = args.match(/onDelete:\s*(\w+)/)?.[1];
      relations.push({
        model, field, target,
        fields: fields.split(",").map((f) => f.trim()).filter(Boolean),
        optional: optional === "?",
        onDelete: explicit ?? (optional === "?" ? "SetNull" : "Restrict"),
      });
    }
  }
  if (schemaPath === SCHEMA_PATH) cached = relations;
  return relations;
}
