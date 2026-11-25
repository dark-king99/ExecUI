/**
 * Audiences with real membership. Dynamic audiences are rule trees (see
 * segments.js); static audiences have explicit members. Sizes shown anywhere
 * come from counting contacts, never from a typed-in number.
 */
import prisma from "../../config/database.js";
import { compile, previewAudience } from "./segments.js";
import { suppressedSet } from "./foundation.js";

const err = (message, status = 400) => Object.assign(new Error(message), { status });

async function load(tenantId, id) {
  const a = await prisma.marketingAudience.findFirst({ where: { id: String(id), tenantId } });
  if (!a) throw err("Audience not found", 404);
  return a;
}

export async function setDefinition(tenantId, id, { kind, definition }) {
  const a = await load(tenantId, id);
  const k = kind ?? a.kind;
  if (!["static", "dynamic"].includes(k)) throw err("Audience kind must be static or dynamic");
  if (k === "dynamic") await compile(definition, tenantId, { seen: new Set([a.id]) }); // validates, throws with the reason
  return prisma.marketingAudience.update({ where: { id: a.id }, data: { kind: k, definition: k === "dynamic" ? definition : null } });
}

export async function preview(tenantId, id) {
  const a = await load(tenantId, id);
  const p = await previewAudience(tenantId, a, await suppressedSet(tenantId));
  await prisma.marketingAudience.update({ where: { id: a.id }, data: { size: p.members, lastCountAt: new Date() } });
  return { ...p, kind: a.kind };
}

export async function addMembers(tenantId, id, contactIds) {
  const a = await load(tenantId, id);
  if (a.kind !== "static") throw err("Only a static audience has hand-picked members; change a dynamic audience's rules instead", 409);
  const ids = [...new Set((Array.isArray(contactIds) ? contactIds : []).map(String))].slice(0, 5000);
  const valid = await prisma.contact.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true } });
  const r = await prisma.marketingAudienceMember.createMany({ data: valid.map((c) => ({ tenantId, audienceId: a.id, contactId: c.id })), skipDuplicates: true });
  return { added: r.count, ignored: ids.length - valid.length };
}

export async function removeMember(tenantId, id, contactId) {
  const a = await load(tenantId, id);
  await prisma.marketingAudienceMember.deleteMany({ where: { audienceId: a.id, contactId: String(contactId) } });
  return { removed: true };
}
