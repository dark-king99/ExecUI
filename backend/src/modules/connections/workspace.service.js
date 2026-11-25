/**
 * Using connected accounts from inside ExecUI: Drive/OneDrive file search,
 * attaching a found file to a record, and Zoom meetings for CRM meetings.
 *
 * Every operation acts as the signed-in person through THEIR connection —
 * never a colleague's — and file search returns names and links only.
 */
import prisma from "../../config/database.js";
import { getProvider } from "./providers.js";
import { personalConnection, connectionFor, accessTokenFor, canSearchFiles } from "./connections.service.js";

const err = (message, status = 400) => Object.assign(new Error(message), { status });
const ADMIN_ROLES = new Set(["enterprise_admin", "system_admin"]);

/** Find files by name in the signed-in person's Google Drive or OneDrive. */
export async function searchMyFiles({ tenantId, userId }, query, { max = 10 } = {}) {
  const q = String(query ?? "").trim();
  if (q.length < 2 || q.length > 100) throw err("Search for 2–100 characters of a file name");
  const conn = await personalConnection(tenantId, userId);
  if (!conn) throw err("Connect your Google or Microsoft account first (Account → Connected accounts).", 409);
  if (!canSearchFiles(conn)) throw err("File search wasn't granted. Reconnect with \"Include Drive / OneDrive\" ticked.", 409);
  return getProvider(conn.provider).searchFiles(await accessTokenFor(conn), q, { max });
}

const ATTACHABLE = new Set(["deal", "lead", "task", "project", "campaign", "contact"]);
const ENTITY_MODEL = { deal: "crmOpportunity", lead: "crmOpportunity", task: "crmTask", project: "bizProject", campaign: "marketingCampaign", contact: "contact" };

/**
 * Attach a Drive/OneDrive file to a record — as a link, so the file stays where
 * it lives and its sharing rules still apply. Only a link to a provider host is
 * accepted, so this can't be used to plant arbitrary URLs on records.
 */
export async function attachFile({ tenantId, userId }, { entityType, entityId, file } = {}) {
  if (!ATTACHABLE.has(entityType)) throw err(`Files can be attached to: ${[...ATTACHABLE].join(", ")}`);
  const record = await prisma[ENTITY_MODEL[entityType]].findFirst({ where: { id: String(entityId), tenantId }, select: { id: true } });
  if (!record) throw err("Record not found", 404);
  let url;
  try { url = new URL(String(file?.url)); } catch { throw err("That file has no link"); }
  if (url.protocol !== "https:" || !/(^|\.)(google\.com|sharepoint\.com|onedrive\.live\.com|1drv\.ms)$/i.test(url.hostname)) {
    throw err("Only Google Drive or OneDrive links can be attached this way");
  }
  const me = await prisma.user.findFirst({ where: { id: userId }, select: { firstName: true, lastName: true } });
  return prisma.attachment.create({
    data: {
      tenantId, entityType, entityId: record.id,
      fileName: String(file?.name ?? "Linked file").slice(0, 200),
      mimeType: file?.mimeType ? String(file.mimeType).slice(0, 120) : null,
      size: 0, url: url.toString(),
      uploadedById: userId, uploaderName: me ? `${me.firstName ?? ""} ${me.lastName ?? ""}`.trim() : null,
    },
  });
}

/**
 * Create a Zoom meeting for a CRM meeting, hosted by the signed-in person, and
 * keep the join link on it. Only the meeting's owner (or an admin) can do this.
 */
export async function addZoomMeeting({ tenantId, userId, role }, followUpId, { durationMin = 30 } = {}) {
  const meeting = await prisma.crmFollowUp.findFirst({ where: { id: String(followUpId), tenantId, follow_up_type: "meeting" } });
  if (!meeting) throw err("Meeting not found", 404);
  if (meeting.userId !== userId && !ADMIN_ROLES.has(role)) throw err("Only the meeting's owner can add a Zoom link", 403);
  if (meeting.meetingUrl) return meeting;
  const conn = await connectionFor(tenantId, userId, "zoom");
  if (!conn) throw err("Connect Zoom first (Account → Connected accounts).", 409);
  const z = await getProvider("zoom").createMeeting(await accessTokenFor(conn), {
    topic: meeting.notes || meeting.customer_name || "Meeting",
    start: meeting.scheduled_date,
    durationMin,
  });
  return prisma.crmFollowUp.update({ where: { id: meeting.id }, data: { meetingUrl: z.joinUrl, meetingProvider: "zoom" } });
}
