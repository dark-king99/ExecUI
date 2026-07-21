/**
 * Social media marketing service — connected accounts, a publishing queue that
 * pushes generated content to the business's social platforms, and engagement
 * analytics. Content typically flows in from Einstein (AI) or the Engagement
 * Content Builder via createPost({ source }).
 *
 * Publishing goes through lib/social.js, which posts for real when a platform's
 * API credentials are configured and otherwise records a clearly-labelled
 * "simulated" delivery so the whole workflow is usable without live keys.
 */
import prisma from "../../../config/database.js";
import { ValidationError, NotFoundError } from "../../../lib/errors.js";
import { encryptSecret } from "../../../lib/secrets.js";
import { assistText } from "../../../lib/aiAssist.js";
import { PLATFORMS, isPlatform, platformName, platformConfigured, publishToPlatform, replyToPlatform } from "../../../lib/social.js";

const acctShape = (a) => ({
  id: a.id, platform: a.platform, platformName: platformName(a.platform),
  handle: a.handle, displayName: a.displayName, status: a.status,
  followers: a.followers, hasToken: !!a.tokenCipher, live: platformConfigured(a.platform),
  connected: a.createdAt,
});
const postShape = (p) => ({
  id: p.id, content: p.content, mediaUrl: p.mediaUrl, platforms: p.platforms,
  status: p.status, source: p.source, scheduledAt: p.scheduledAt, publishedAt: p.publishedAt,
  authorName: p.authorName, results: p.results ?? {}, metrics: p.metrics ?? {},
  createdAt: p.createdAt, updatedAt: p.updatedAt,
});

// ── Platform catalog ─────────────────────────────────────────────────────────
export function platforms() {
  return PLATFORMS.map((p) => ({ id: p.id, name: p.name, live: platformConfigured(p.id) }));
}

// ── Accounts ─────────────────────────────────────────────────────────────────
export async function listAccounts(tenantId) {
  const rows = await prisma.socialAccount.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } });
  return rows.map(acctShape);
}

export async function connectAccount(tenantId, userId, body = {}) {
  const platform = String(body.platform || "").toLowerCase();
  if (!isPlatform(platform)) throw new ValidationError("Unknown platform");
  const handle = String(body.handle || "").trim();
  if (!handle) throw new ValidationError("An account handle/page is required");

  const enc = body.token ? encryptSecret(String(body.token)) : {};
  const row = await prisma.socialAccount.upsert({
    where: { tenantId_platform_handle: { tenantId, platform, handle } },
    update: {
      displayName: body.displayName ?? handle, status: "connected",
      ...(body.token ? { tokenCipher: enc.ciphertext, tokenIv: enc.iv, tokenTag: enc.tag } : {}),
    },
    create: {
      tenantId, platform, handle, displayName: body.displayName ?? handle,
      status: "connected", connectedById: userId ?? null,
      followers: Number(body.followers) || 0,
      tokenCipher: enc.ciphertext ?? null, tokenIv: enc.iv ?? null, tokenTag: enc.tag ?? null,
    },
  });
  return acctShape(row);
}

export async function disconnectAccount(tenantId, id) {
  const a = await prisma.socialAccount.findFirst({ where: { id, tenantId } });
  if (!a) throw new NotFoundError("Account not found");
  await prisma.socialAccount.delete({ where: { id } });
  return { deleted: true };
}

// ── Posts ────────────────────────────────────────────────────────────────────
export async function listPosts(tenantId, query = {}) {
  const where = { tenantId };
  if (query.status) where.status = String(query.status);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 100, 1), 300);
  const rows = await prisma.socialPost.findMany({ where, orderBy: { createdAt: "desc" }, take: limit });
  return rows.map(postShape);
}

function normPlatforms(list) {
  const arr = Array.isArray(list) ? list : [];
  const clean = [...new Set(arr.map((p) => String(p).toLowerCase()).filter(isPlatform))];
  return clean;
}

export async function createPost(tenantId, user = {}, body = {}) {
  const content = String(body.content || "").trim();
  if (!content) throw new ValidationError("Post content is required");
  const platforms = normPlatforms(body.platforms);
  if (!platforms.length) throw new ValidationError("Choose at least one platform");

  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  const wantsNow = !!body.publishNow;
  const status = wantsNow ? "publishing" : scheduledAt && scheduledAt > new Date() ? "scheduled" : "draft";

  const row = await prisma.socialPost.create({
    data: {
      tenantId, content, mediaUrl: body.mediaUrl || null, platforms,
      status, source: ["einstein", "engagement", "manual"].includes(body.source) ? body.source : "manual",
      scheduledAt, authorId: user.userId ?? null, authorName: body.authorName ?? null,
    },
  });
  if (wantsNow) return publishPost(tenantId, row.id);
  return postShape(row);
}

export async function updatePost(tenantId, id, patch = {}) {
  const existing = await prisma.socialPost.findFirst({ where: { id, tenantId } });
  if (!existing) throw new NotFoundError("Post not found");
  if (["published", "publishing"].includes(existing.status)) throw new ValidationError("A published post can't be edited");
  const data = {};
  if (patch.content !== undefined) data.content = String(patch.content).trim();
  if (patch.mediaUrl !== undefined) data.mediaUrl = patch.mediaUrl || null;
  if (patch.platforms !== undefined) data.platforms = normPlatforms(patch.platforms);
  if (patch.scheduledAt !== undefined) {
    data.scheduledAt = patch.scheduledAt ? new Date(patch.scheduledAt) : null;
    data.status = data.scheduledAt && data.scheduledAt > new Date() ? "scheduled" : "draft";
  }
  const row = await prisma.socialPost.update({ where: { id }, data });
  return postShape(row);
}

export async function deletePost(tenantId, id) {
  const p = await prisma.socialPost.findFirst({ where: { id, tenantId } });
  if (!p) throw new NotFoundError("Post not found");
  await prisma.socialPost.delete({ where: { id } });
  return { deleted: true };
}

// Seed plausible engagement for a delivered platform (simulated analytics).
function seedMetrics(followers) {
  const base = Math.max(followers, 200);
  const reach = Math.round(base * (0.25 + Math.random() * 0.4));
  const likes = Math.round(reach * (0.03 + Math.random() * 0.05));
  const comments = Math.round(likes * (0.05 + Math.random() * 0.1));
  const shares = Math.round(likes * (0.02 + Math.random() * 0.06));
  return { reach, likes, comments, shares };
}

export async function publishPost(tenantId, id) {
  const post = await prisma.socialPost.findFirst({ where: { id, tenantId } });
  if (!post) throw new NotFoundError("Post not found");
  const accounts = await prisma.socialAccount.findMany({ where: { tenantId, platform: { in: post.platforms } } });
  const byPlatform = Object.fromEntries(accounts.map((a) => [a.platform, a]));

  const results = {};
  const metrics = {};
  let anyOk = false;
  let anyFollowerGain = 0;

  for (const platform of post.platforms) {
    const account = byPlatform[platform] ?? null;
    const res = await publishToPlatform(platform, account, post);
    results[platform] = res;
    if (res.ok) {
      anyOk = true;
      metrics[platform] = seedMetrics(account?.followers ?? 0);
      // A published post nudges following upward (simulated growth signal).
      if (account) {
        const gain = Math.max(1, Math.round((account.followers || 100) * 0.002));
        anyFollowerGain += gain;
        await prisma.socialAccount.update({ where: { id: account.id }, data: { followers: (account.followers || 0) + gain } });
      }
    }
  }

  const row = await prisma.socialPost.update({
    where: { id },
    data: {
      status: anyOk ? "published" : "failed",
      publishedAt: anyOk ? new Date() : null,
      results, metrics,
    },
  });
  return { ...postShape(row), followerGain: anyFollowerGain };
}

// ── Engagement / analytics ───────────────────────────────────────────────────
export async function analytics(tenantId) {
  const [accounts, posts] = await Promise.all([
    prisma.socialAccount.findMany({ where: { tenantId } }),
    prisma.socialPost.findMany({ where: { tenantId } }),
  ]);
  const totalFollowers = accounts.reduce((s, a) => s + (a.followers || 0), 0);
  const published = posts.filter((p) => p.status === "published");
  const scheduled = posts.filter((p) => p.status === "scheduled").length;
  const drafts = posts.filter((p) => p.status === "draft").length;

  const sum = (key) => published.reduce((s, p) => s + Object.values(p.metrics ?? {}).reduce((a, m) => a + (m[key] || 0), 0), 0);
  const reach = sum("reach"), likes = sum("likes"), comments = sum("comments"), shares = sum("shares");
  const engagements = likes + comments + shares;
  const engagementRate = reach ? +((engagements / reach) * 100).toFixed(1) : 0;

  const byPlatform = accounts.map((a) => ({
    platform: a.platform, name: platformName(a.platform), handle: a.handle,
    followers: a.followers, live: platformConfigured(a.platform),
  }));

  return {
    totalFollowers, accounts: accounts.length,
    publishedCount: published.length, scheduled, drafts,
    reach, likes, comments, shares, engagements, engagementRate,
    byPlatform,
  };
}

/** AI-improve a caption for a platform (reuses the plan-gated AI layer). */
export async function improveCaption(tenantId, body = {}) {
  const content = String(body.content || "").trim();
  if (!content) throw new ValidationError("Nothing to improve");
  const platform = isPlatform(body.platform) ? platformName(body.platform) : "social media";
  const improved = await assistText({
    tenantId,
    system: `You are a social media copywriter. Rewrite the post for ${platform}: punchy, on-brand, with 2-4 relevant hashtags and a light emoji or two. Output only the post text.`,
    user: content,
    maxTokens: 220,
    fallback: () => content, // AI off/over quota → return the original unchanged
  });
  return { content: improved };
}

// ── Engagement Inbox ──────────────────────────────────────────────────────────
const engShape = (e) => ({
  id: e.id, platform: e.platform, platformName: platformName(e.platform), kind: e.kind,
  authorName: e.authorName, authorHandle: e.authorHandle, text: e.text, sentiment: e.sentiment,
  status: e.status, replyText: e.replyText, repliedAt: e.repliedAt, simulated: e.simulated,
  createdAt: e.createdAt,
});

const SAMPLE = {
  positive: [
    "This is exactly what our team needed — love it! 🙌",
    "Been using you for a month, huge time saver. Keep it up!",
    "Just recommended you to my whole network 👏",
    "The new update is 🔥. Any plans for an Android app?",
  ],
  neutral: [
    "How much is the enterprise plan?",
    "Do you integrate with our existing CRM?",
    "Is there a free trial for teams?",
    "What regions/currencies do you support?",
  ],
  negative: [
    "Support hasn't replied in 2 days — a bit frustrated.",
    "Login was down this morning, is it fixed?",
    "Pricing feels steep for a small team.",
  ],
};
const HANDLES = ["kwame_ops", "amara.b", "j_dev", "sarah_pm", "moses.t", "the_grace", "d_kollie", "aria.k"];
const NAMES = ["Kwame O.", "Amara B.", "James D.", "Sarah P.", "Moses T.", "Grace L.", "Daniel K.", "Aria N."];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export async function listEngagements(tenantId, query = {}) {
  const where = { tenantId };
  if (query.status) where.status = String(query.status);
  if (query.platform && isPlatform(query.platform)) where.platform = query.platform;
  const rows = await prisma.socialEngagement.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  return rows.map(engShape);
}

export async function engagementStats(tenantId) {
  const rows = await prisma.socialEngagement.findMany({ where: { tenantId }, select: { status: true, sentiment: true } });
  const by = (k, v) => rows.filter((r) => r[k] === v).length;
  const replied = by("status", "replied");
  const handled = replied + by("status", "archived");
  return {
    total: rows.length, new: by("status", "new"), replied, archived: by("status", "archived"),
    positive: by("sentiment", "positive"), neutral: by("sentiment", "neutral"), negative: by("sentiment", "negative"),
    responseRate: rows.length ? Math.round((handled / rows.length) * 100) : 0,
  };
}

/**
 * Pull new interactions into the inbox. Real when platform APIs are wired;
 * otherwise seeds a few clearly-labelled sample interactions from the connected
 * platforms so the team can work the growth loop today.
 */
export async function syncEngagements(tenantId) {
  const accounts = await prisma.socialAccount.findMany({ where: { tenantId } });
  const platforms = accounts.length ? accounts.map((a) => a.platform) : ["facebook", "instagram", "whatsapp"];
  const n = 3 + Math.floor(Math.random() * 3);
  const created = [];
  for (let i = 0; i < n; i++) {
    const sentiment = pick(["positive", "positive", "neutral", "neutral", "negative"]);
    const kind = pick(["comment", "comment", "mention", "dm"]);
    const idx = Math.floor(Math.random() * NAMES.length);
    const row = await prisma.socialEngagement.create({
      data: {
        tenantId, platform: pick(platforms), kind,
        authorName: NAMES[idx], authorHandle: HANDLES[idx],
        text: pick(SAMPLE[sentiment]), sentiment, status: "new", simulated: true,
      },
    });
    created.push(engShape(row));
  }
  return { synced: created.length, live: false, items: created };
}

export async function replyEngagement(tenantId, id, text) {
  const body = String(text || "").trim();
  if (!body) throw new ValidationError("A reply is required");
  const e = await prisma.socialEngagement.findFirst({ where: { id, tenantId } });
  if (!e) throw new NotFoundError("Message not found");
  const account = await prisma.socialAccount.findFirst({ where: { tenantId, platform: e.platform } });
  const res = await replyToPlatform(e.platform, account, e, body);
  const row = await prisma.socialEngagement.update({
    where: { id }, data: { status: "replied", replyText: body, repliedAt: new Date() },
  });
  return { ...engShape(row), delivery: res };
}

export async function archiveEngagement(tenantId, id) {
  const e = await prisma.socialEngagement.findFirst({ where: { id, tenantId } });
  if (!e) throw new NotFoundError("Message not found");
  const row = await prisma.socialEngagement.update({ where: { id }, data: { status: "archived" } });
  return engShape(row);
}

/** AI-drafted reply suggestion for one engagement (fallback to a helpful canned line). */
export async function draftReply(tenantId, id) {
  const e = await prisma.socialEngagement.findFirst({ where: { id, tenantId } });
  if (!e) throw new NotFoundError("Message not found");
  const canned = e.sentiment === "negative"
    ? "So sorry for the trouble — we're on it. Could you DM us your account email so we can make this right?"
    : e.sentiment === "positive"
    ? "Thank you so much — this made our day! 🙌 Anything you'd love to see next?"
    : "Great question! Happy to help — could you share a little more so we point you the right way?";
  const reply = await assistText({
    tenantId,
    system: `You are the friendly, professional voice of a B2B software brand replying to a ${e.sentiment} ${e.kind} on ${platformName(e.platform)}. Write ONE concise reply (max 2 sentences), warm and helpful, no hashtags. Output only the reply.`,
    user: e.text,
    maxTokens: 90,
    fallback: () => canned,
  });
  return { reply };
}

// ── Growth ────────────────────────────────────────────────────────────────────
const dayKey = (d) => d.toISOString().slice(0, 10);
function lastNDays(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now); d.setUTCDate(d.getUTCDate() - i); out.push(dayKey(d));
  }
  return out;
}
// deterministic 0..1 from a string, so a synthesized series is stable across loads
const hash01 = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; };

export async function growth(tenantId) {
  const [accounts, posts] = await Promise.all([
    prisma.socialAccount.findMany({ where: { tenantId } }),
    prisma.socialPost.findMany({ where: { tenantId, status: "published" } }),
  ]);
  const totalFollowers = accounts.reduce((s, a) => s + (a.followers || 0), 0);
  const today = dayKey(new Date());

  // Record today's snapshot per platform (builds real history over time).
  for (const a of accounts) {
    await prisma.socialFollowerSnapshot.upsert({
      where: { tenantId_platform_day: { tenantId, platform: a.platform, day: today } },
      update: { followers: a.followers || 0 },
      create: { tenantId, platform: a.platform, day: today, followers: a.followers || 0 },
    });
  }

  const days = lastNDays(14);
  const snaps = await prisma.socialFollowerSnapshot.findMany({ where: { tenantId, day: { in: days } } });
  const realByDay = {};
  for (const s of snaps) realByDay[s.day] = (realByDay[s.day] || 0) + s.followers;
  const realDays = Object.keys(realByDay).length;
  const projected = realDays < 3;

  // Build a smooth 14-day series ending at the current total; overlay real days.
  const start = Math.max(0, Math.round(totalFollowers * 0.86));
  const series = days.map((day, i) => {
    if (realByDay[day] != null) return { day, followers: realByDay[day] };
    const t = days.length > 1 ? i / (days.length - 1) : 1;
    const base = start + (totalFollowers - start) * t;
    const jitter = (hash01(day) - 0.5) * Math.max(4, totalFollowers * 0.004);
    return { day, followers: Math.max(0, Math.round(base + jitter)) };
  });
  if (series.length) series[series.length - 1].followers = totalFollowers; // anchor to reality
  const first = series[0]?.followers ?? 0;
  const netNew = totalFollowers - first;
  const growthPct = first ? +((netNew / first) * 100).toFixed(1) : 0;

  // Engagement rate from published posts.
  const sum = (key) => posts.reduce((s, p) => s + Object.values(p.metrics ?? {}).reduce((a, m) => a + (m[key] || 0), 0), 0);
  const reach = sum("reach"); const engagements = sum("likes") + sum("comments") + sum("shares");
  const engagementRate = reach ? +((engagements / reach) * 100).toFixed(1) : 0;

  // Best times to post — from published posts' weekday/hour weighted by engagement.
  const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const slots = {};
  for (const p of posts) {
    if (!p.publishedAt) continue;
    const d = new Date(p.publishedAt);
    const key = `${WD[d.getUTCDay()]} ${String(d.getUTCHours()).padStart(2, "0")}:00`;
    const eng = Object.values(p.metrics ?? {}).reduce((a, m) => a + (m.likes || 0) + (m.comments || 0) + (m.shares || 0), 0);
    slots[key] = (slots[key] || 0) + eng + 1;
  }
  let bestTimes = Object.entries(slots).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label]) => label);
  let bestTimesProjected = false;
  if (bestTimes.length < 3) { bestTimes = ["Tue 18:00", "Thu 12:00", "Sat 10:00"]; bestTimesProjected = true; }

  // Top-performing published post.
  const scored = posts.map((p) => ({ p, e: Object.values(p.metrics ?? {}).reduce((a, m) => a + (m.likes || 0) + (m.comments || 0) + (m.shares || 0), 0) }))
    .sort((a, b) => b.e - a.e);
  const topPost = scored[0] ? { content: scored[0].p.content, engagements: scored[0].e, platforms: scored[0].p.platforms } : null;

  const byPlatform = accounts.map((a) => ({ platform: a.platform, name: platformName(a.platform), followers: a.followers, live: platformConfigured(a.platform) }))
    .sort((x, y) => y.followers - x.followers);

  return {
    totalFollowers, netNew, growthPct, projected,
    engagementRate, publishedCount: posts.length,
    series, byPlatform, bestTimes, bestTimesProjected, topPost,
  };
}

const DEFAULT_TAGS = ["#EnterpriseSoftware", "#CRM", "#Productivity", "#SmallBusiness", "#DigitalTransformation", "#Automation", "#B2B", "#TeamWork"];

/** AI hashtag suggestions from recent content (fallback to a sensible default set). */
export async function suggestHashtags(tenantId, body = {}) {
  const seed = String(body.topic || "").trim();
  let recent = seed;
  if (!recent) {
    const posts = await prisma.socialPost.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 5, select: { content: true } });
    recent = posts.map((p) => p.content).join(" \n ").slice(0, 600);
  }
  if (!recent) return { hashtags: DEFAULT_TAGS };
  const out = await assistText({
    tenantId,
    system: "Suggest 8 relevant, high-reach social media hashtags for this brand's content. Output ONLY the hashtags separated by spaces, each starting with #.",
    user: recent,
    maxTokens: 80,
    fallback: () => DEFAULT_TAGS.join(" "),
  });
  const hashtags = String(out).split(/\s+/).filter((t) => t.startsWith("#")).slice(0, 10);
  return { hashtags: hashtags.length ? hashtags : DEFAULT_TAGS };
}
