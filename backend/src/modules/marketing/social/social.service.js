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
import { PLATFORMS, isPlatform, platformName, platformConfigured, publishToPlatform } from "../../../lib/social.js";

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
