/**
 * SCIM 2.0 core (RFC 7643 schema / RFC 7644 protocol).
 *
 * This is the layer Okta, Microsoft Entra ID, OneLogin and JumpCloud call to
 * create, update, deactivate and delete employees automatically — so joiners,
 * movers and leavers are handled by the directory instead of by hand.
 *
 * Everything here is pure mapping + Prisma access; transport concerns (bearer
 * auth, content types, error envelopes) live in scim.routes.js. The functions
 * are exported individually so the mapping and filter parser can be unit-tested
 * without a database.
 */
import crypto from "crypto";
import prisma from "../../config/database.js";

export const USER_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User";
export const GROUP_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:Group";
export const ENTERPRISE_USER_SCHEMA = "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User";
export const LIST_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:ListResponse";
export const PATCH_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:PatchOp";
export const ERROR_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:Error";

const EMP_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export class ScimError extends Error {
  constructor(status, detail, scimType) {
    super(detail);
    this.status = status;
    this.scimType = scimType;
  }
}

// ── Resource mapping ─────────────────────────────────────────────────────────
/** Prisma user → SCIM User resource. */
export function toScimUser(u, baseUrl = "") {
  return {
    schemas: [USER_SCHEMA, ENTERPRISE_USER_SCHEMA],
    id: u.id,
    externalId: u.externalId || undefined,
    userName: u.email,
    name: {
      givenName: u.firstName || undefined,
      familyName: u.lastName || undefined,
      formatted: [u.firstName, u.lastName].filter(Boolean).join(" ") || undefined,
    },
    displayName: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
    emails: [{ value: u.email, type: "work", primary: true }],
    ...(u.phone ? { phoneNumbers: [{ value: u.phone, type: "work", primary: true }] } : {}),
    active: !!u.isActive,
    title: u.jobTitle || undefined,
    [ENTERPRISE_USER_SCHEMA]: {
      department: u.department || undefined,
      employeeNumber: u.employeeId || undefined,
    },
    ...(u.role?.name ? { roles: [{ value: u.role.name, primary: true }] } : {}),
    groups: u.role ? [{ value: u.roleId, display: u.role.name, $ref: `${baseUrl}/Groups/${u.roleId}` }] : [],
    meta: {
      resourceType: "User",
      created: u.createdAt,
      lastModified: u.updatedAt || u.createdAt,
      location: `${baseUrl}/Users/${u.id}`,
      version: `W/"${u.updatedAt ? new Date(u.updatedAt).getTime() : 0}"`,
    },
  };
}

/** Prisma role → SCIM Group resource (roles are ExecUI's group construct). */
export function toScimGroup(role, members = [], baseUrl = "") {
  return {
    schemas: [GROUP_SCHEMA],
    id: role.id,
    displayName: role.name,
    members: members.map((m) => ({
      value: m.id,
      display: [m.firstName, m.lastName].filter(Boolean).join(" ") || m.email,
      $ref: `${baseUrl}/Users/${m.id}`,
    })),
    meta: { resourceType: "Group", location: `${baseUrl}/Groups/${role.id}` },
  };
}

const firstValue = (v) => (Array.isArray(v) ? v[0]?.value ?? v[0] : v);

/** SCIM User payload → the fields ExecUI stores. */
export function fromScimUser(body = {}) {
  const ent = body[ENTERPRISE_USER_SCHEMA] || {};
  const email = String(body.userName || firstValue(body.emails) || "").toLowerCase().trim();
  const out = {
    email,
    firstName: body.name?.givenName || String(body.displayName || "").split(" ")[0] || (email ? email.split("@")[0] : null),
    lastName: body.name?.familyName || String(body.displayName || "").split(" ").slice(1).join(" ") || "",
    externalId: body.externalId || null,
    jobTitle: body.title || null,
    department: ent.department || null,
    phone: firstValue(body.phoneNumbers) || null,
  };
  if (body.active !== undefined) out.isActive = !!body.active;
  if (ent.employeeNumber) out.employeeId = String(ent.employeeNumber).toLowerCase().slice(0, 7);
  return out;
}

// ── Filter parsing (RFC 7644 §3.4.2.2) ───────────────────────────────────────
/**
 * IdPs realistically send `userName eq "x"`, `externalId eq "x"`,
 * `emails.value eq "x"` and `active eq true`, optionally joined by `and`.
 * Anything else is rejected with the proper SCIM error rather than silently
 * returning the wrong set.
 */
export function parseFilter(filter) {
  if (!filter) return {};
  const where = {};
  const clauses = String(filter).split(/\s+and\s+/i);
  for (const raw of clauses) {
    const m = raw.trim().match(/^(\S+)\s+(eq|ne)\s+(?:"(.*)"|'(.*)'|(\S+))$/i);
    if (!m) throw new ScimError(400, `Unsupported filter: ${raw}`, "invalidFilter");
    const [, attrRaw, opRaw, dq, sq, bare] = m;
    const attr = attrRaw.toLowerCase();
    const op = opRaw.toLowerCase();
    const value = dq ?? sq ?? bare;

    let field, parsed;
    if (attr === "username" || attr === "emails.value" || attr === "emails[type eq \"work\"].value") {
      field = "email"; parsed = String(value).toLowerCase();
    } else if (attr === "externalid") {
      field = "externalId"; parsed = value;
    } else if (attr === "id") {
      field = "id"; parsed = value;
    } else if (attr === "active") {
      field = "isActive"; parsed = String(value) === "true";
    } else if (attr === "displayname") {
      field = "displayName"; parsed = value; // Groups
    } else {
      throw new ScimError(400, `Filtering on "${attrRaw}" is not supported`, "invalidFilter");
    }
    where[field] = op === "ne" ? { not: parsed } : parsed;
  }
  return where;
}

// ── Users ────────────────────────────────────────────────────────────────────
async function nextEmployeeId(tenantId) {
  for (let i = 0; i < 25; i++) {
    let id = "";
    for (let j = 0; j < 7; j++) id += EMP_ALPHABET[crypto.randomInt(EMP_ALPHABET.length)];
    const taken = await prisma.user.findFirst({ where: { tenantId, employeeId: id }, select: { id: true } });
    if (!taken) return id;
  }
  return null;
}

async function defaultRoleId(tenantId) {
  const role =
    (await prisma.role.findFirst({ where: { tenantId, NOT: { name: "enterprise_admin" } }, orderBy: { name: "asc" } })) ||
    (await prisma.role.findFirst({ where: { tenantId } }));
  return role?.id ?? null;
}

export async function listUsers(tenantId, query = {}, baseUrl = "") {
  const filterWhere = parseFilter(query.filter);
  const startIndex = Math.max(1, parseInt(query.startIndex, 10) || 1);
  const count = Math.min(200, Math.max(0, parseInt(query.count, 10) || 100));

  const where = { tenantId, ...filterWhere };
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    count === 0 ? [] : prisma.user.findMany({
      where, include: { role: true }, orderBy: { createdAt: "asc" },
      skip: startIndex - 1, take: count,
    }),
  ]);

  return {
    schemas: [LIST_SCHEMA],
    totalResults: total,
    startIndex,
    itemsPerPage: rows.length,
    Resources: rows.map((u) => toScimUser(u, baseUrl)),
  };
}

export async function getUser(tenantId, id, baseUrl = "") {
  const u = await prisma.user.findFirst({ where: { id, tenantId }, include: { role: true } });
  if (!u) throw new ScimError(404, `User ${id} not found`);
  return toScimUser(u, baseUrl);
}

export async function createUser(tenantId, body, baseUrl = "") {
  const data = fromScimUser(body);
  if (!data.email) throw new ScimError(400, "userName (email) is required", "invalidValue");

  const existing = await prisma.user.findFirst({ where: { tenantId, email: data.email } });
  if (existing) throw new ScimError(409, "A user with this userName already exists", "uniqueness");

  const roleId = await defaultRoleId(tenantId);
  if (!roleId) throw new ScimError(500, "This organization has no roles configured");

  const employeeId = data.employeeId || (await nextEmployeeId(tenantId));
  if (employeeId) {
    const clash = await prisma.user.findFirst({ where: { tenantId, employeeId } });
    if (clash) throw new ScimError(409, `Employee number ${employeeId} is already in use`, "uniqueness");
  }

  const user = await prisma.user.create({
    data: {
      email: data.email,
      firstName: data.firstName || "New",
      lastName: data.lastName || "User",
      externalId: data.externalId,
      jobTitle: data.jobTitle,
      department: data.department,
      phone: data.phone,
      employeeId,
      isActive: data.isActive !== undefined ? data.isActive : true,
      status: "invited",          // no password — they sign in through the IdP
      provisionedVia: "scim",
      tenantId, roleId,
    },
    include: { role: true },
  });
  await audit(tenantId, user.id, "scim_create_user", `SCIM provisioned ${user.email}`);
  return toScimUser(user, baseUrl);
}

/** PUT — full replace. */
export async function replaceUser(tenantId, id, body, baseUrl = "") {
  const existing = await prisma.user.findFirst({ where: { id, tenantId } });
  if (!existing) throw new ScimError(404, `User ${id} not found`);
  const data = fromScimUser(body);

  const patch = {
    firstName: data.firstName || existing.firstName,
    lastName: data.lastName ?? existing.lastName,
    jobTitle: data.jobTitle,
    department: data.department,
    phone: data.phone,
    isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
  };
  if (data.externalId) patch.externalId = data.externalId;
  if (data.email && data.email !== existing.email) {
    const clash = await prisma.user.findFirst({ where: { tenantId, email: data.email, NOT: { id } } });
    if (clash) throw new ScimError(409, "A user with this userName already exists", "uniqueness");
    patch.email = data.email;
  }

  const user = await prisma.user.update({ where: { id }, data: patch, include: { role: true } });
  await audit(tenantId, id, "scim_update_user", `SCIM replaced ${user.email}`);
  return toScimUser(user, baseUrl);
}

const pathTarget = (path = "") => String(path).replace(/^urn:[^:]+:[^:]+:[^:]+:[^:]+:[^:]+:/i, "").trim();

/** PATCH — the operation Okta/Entra actually use for activate/deactivate. */
export async function patchUser(tenantId, id, body, baseUrl = "") {
  const existing = await prisma.user.findFirst({ where: { id, tenantId } });
  if (!existing) throw new ScimError(404, `User ${id} not found`);

  const ops = Array.isArray(body?.Operations) ? body.Operations : [];
  if (!ops.length) throw new ScimError(400, "PatchOp requires at least one operation", "invalidValue");

  const patch = {};
  const applyValue = (rawPath, value) => {
    const path = pathTarget(rawPath).toLowerCase();
    switch (path) {
      case "active":
        patch.isActive = value === true || value === "true"; break;
      case "username":
      case "emails.value":
      case "emails[type eq \"work\"].value":
        patch.email = String(value).toLowerCase(); break;
      case "name.givenname": patch.firstName = value; break;
      case "name.familyname": patch.lastName = value; break;
      case "displayname": {
        const parts = String(value).split(" ");
        patch.firstName = parts[0]; patch.lastName = parts.slice(1).join(" ");
        break;
      }
      case "title": patch.jobTitle = value; break;
      case "department": patch.department = value; break;
      case "phonenumbers.value": patch.phone = String(value); break;
      case "externalid": patch.externalId = String(value); break;
      default:
        // Unknown attributes are ignored rather than failing the whole sync —
        // IdPs send extra attributes we intentionally don't store.
        break;
    }
  };

  for (const op of ops) {
    const verb = String(op.op || "").toLowerCase();
    if (verb === "remove") {
      const path = pathTarget(op.path).toLowerCase();
      if (path === "active") patch.isActive = false;
      continue;
    }
    if (verb !== "add" && verb !== "replace") {
      throw new ScimError(400, `Unsupported PATCH op: ${op.op}`, "invalidSyntax");
    }
    if (op.path) {
      applyValue(op.path, op.value);
    } else if (op.value && typeof op.value === "object") {
      // Path-less patch: the value is a partial resource.
      const mapped = fromScimUser(op.value);
      if (op.value.active !== undefined) patch.isActive = !!op.value.active;
      if (op.value.userName) patch.email = mapped.email;
      if (op.value.name?.givenName) patch.firstName = mapped.firstName;
      if (op.value.name?.familyName) patch.lastName = mapped.lastName;
      if (op.value.title) patch.jobTitle = mapped.jobTitle;
      const ent = op.value[ENTERPRISE_USER_SCHEMA];
      if (ent?.department) patch.department = ent.department;
    }
  }

  if (patch.email && patch.email !== existing.email) {
    const clash = await prisma.user.findFirst({ where: { tenantId, email: patch.email, NOT: { id } } });
    if (clash) throw new ScimError(409, "A user with this userName already exists", "uniqueness");
  }

  const user = Object.keys(patch).length
    ? await prisma.user.update({ where: { id }, data: patch, include: { role: true } })
    : await prisma.user.findFirst({ where: { id }, include: { role: true } });

  if (patch.isActive === false) await audit(tenantId, id, "scim_deactivate_user", `SCIM deactivated ${user.email}`);
  else if (Object.keys(patch).length) await audit(tenantId, id, "scim_update_user", `SCIM patched ${user.email}`);
  return toScimUser(user, baseUrl);
}

/**
 * DELETE — deprovision. We DEACTIVATE rather than destroy: an employee's CRM
 * records, audit trail and ownership must survive their departure. A hard
 * delete stays available to admins in the UI.
 */
export async function deleteUser(tenantId, id) {
  const existing = await prisma.user.findFirst({ where: { id, tenantId } });
  if (!existing) throw new ScimError(404, `User ${id} not found`);
  await prisma.user.update({ where: { id }, data: { isActive: false } });
  await prisma.userSession.updateMany({ where: { userId: id, isActive: true }, data: { isActive: false, endedAt: new Date() } });
  await audit(tenantId, id, "scim_deprovision_user", `SCIM deprovisioned ${existing.email} (deactivated, data retained)`);
}

// ── Groups (mapped to ExecUI roles) ──────────────────────────────────────────
export async function listGroups(tenantId, query = {}, baseUrl = "") {
  const f = parseFilter(query.filter);
  const where = { tenantId, ...(f.displayName ? { name: f.displayName } : {}) };
  const roles = await prisma.role.findMany({ where, include: { users: true }, orderBy: { name: "asc" } });
  return {
    schemas: [LIST_SCHEMA],
    totalResults: roles.length,
    startIndex: 1,
    itemsPerPage: roles.length,
    Resources: roles.map((r) => toScimGroup(r, r.users, baseUrl)),
  };
}

export async function getGroup(tenantId, id, baseUrl = "") {
  const role = await prisma.role.findFirst({ where: { id, tenantId }, include: { users: true } });
  if (!role) throw new ScimError(404, `Group ${id} not found`);
  return toScimGroup(role, role.users, baseUrl);
}

/** Group membership changes move users between roles (ExecUI's permission unit). */
export async function patchGroup(tenantId, id, body, baseUrl = "") {
  const role = await prisma.role.findFirst({ where: { id, tenantId } });
  if (!role) throw new ScimError(404, `Group ${id} not found`);

  for (const op of body?.Operations || []) {
    const verb = String(op.op || "").toLowerCase();
    const path = pathTarget(op.path).toLowerCase();
    if (path !== "members") continue;
    const values = Array.isArray(op.value) ? op.value : op.value ? [op.value] : [];
    const ids = values.map((v) => v.value || v).filter(Boolean);

    if (verb === "add" || verb === "replace") {
      await prisma.user.updateMany({ where: { tenantId, id: { in: ids } }, data: { roleId: id } });
    } else if (verb === "remove") {
      const fallback = await prisma.role.findFirst({ where: { tenantId, NOT: { id } }, orderBy: { name: "asc" } });
      if (fallback) await prisma.user.updateMany({ where: { tenantId, id: { in: ids }, roleId: id }, data: { roleId: fallback.id } });
    }
  }
  await audit(tenantId, id, "scim_patch_group", `SCIM updated membership for role ${role.name}`);
  return getGroup(tenantId, id, baseUrl);
}

// ── Discovery documents ──────────────────────────────────────────────────────
export function serviceProviderConfig(baseUrl = "") {
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
    documentationUri: "https://github.com/dark-king99/ExecUI/blob/main/docs/SSO.md",
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: 200 },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [{
      type: "oauthbearertoken",
      name: "OAuth Bearer Token",
      description: "Authentication via the SCIM bearer token issued in ExecUI (Account → Single Sign-On).",
      primary: true,
    }],
    meta: { resourceType: "ServiceProviderConfig", location: `${baseUrl}/ServiceProviderConfig` },
  };
}

export function resourceTypes(baseUrl = "") {
  const types = [
    { id: "User", name: "User", endpoint: "/Users", schema: USER_SCHEMA,
      schemaExtensions: [{ schema: ENTERPRISE_USER_SCHEMA, required: false }] },
    { id: "Group", name: "Group", endpoint: "/Groups", schema: GROUP_SCHEMA, schemaExtensions: [] },
  ].map((t) => ({
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:ResourceType"],
    ...t,
    description: `${t.name} resource`,
    meta: { resourceType: "ResourceType", location: `${baseUrl}/ResourceTypes/${t.id}` },
  }));
  return { schemas: [LIST_SCHEMA], totalResults: types.length, startIndex: 1, itemsPerPage: types.length, Resources: types };
}

const attr = (name, type = "string", extra = {}) => ({
  name, type, multiValued: false, required: false, caseExact: false,
  mutability: "readWrite", returned: "default", uniqueness: "none", ...extra,
});

export function schemas(baseUrl = "") {
  const list = [
    {
      id: USER_SCHEMA, name: "User", description: "SCIM core User",
      attributes: [
        attr("userName", "string", { required: true, uniqueness: "server" }),
        attr("name", "complex", { subAttributes: [attr("givenName"), attr("familyName"), attr("formatted")] }),
        attr("displayName"), attr("title"),
        attr("emails", "complex", { multiValued: true, subAttributes: [attr("value"), attr("type"), attr("primary", "boolean")] }),
        attr("phoneNumbers", "complex", { multiValued: true, subAttributes: [attr("value"), attr("type")] }),
        attr("active", "boolean"),
        attr("externalId"),
      ],
    },
    {
      id: ENTERPRISE_USER_SCHEMA, name: "EnterpriseUser", description: "SCIM enterprise User extension",
      attributes: [attr("department"), attr("employeeNumber")],
    },
    {
      id: GROUP_SCHEMA, name: "Group", description: "SCIM core Group (mapped to ExecUI roles)",
      attributes: [
        attr("displayName", "string", { required: true }),
        attr("members", "complex", { multiValued: true, subAttributes: [attr("value"), attr("display")] }),
      ],
    },
  ].map((s) => ({
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:Schema"],
    ...s,
    meta: { resourceType: "Schema", location: `${baseUrl}/Schemas/${s.id}` },
  }));
  return { schemas: [LIST_SCHEMA], totalResults: list.length, startIndex: 1, itemsPerPage: list.length, Resources: list };
}

async function audit(tenantId, resourceId, action, detail) {
  try {
    // SCIM acts as the directory, not a person — attribute it to the org admin
    // so the row satisfies the AuditLog → User relation.
    const admin = await prisma.user.findFirst({
      where: { tenantId, role: { name: { in: ["enterprise_admin", "system_admin"] } } },
      select: { id: true },
    });
    if (!admin) return;
    await prisma.auditLog.create({
      data: { userId: admin.id, tenantId, action, resource: "scim", resourceId, detail },
    });
  } catch { /* auditing must never fail a provisioning call */ }
}
