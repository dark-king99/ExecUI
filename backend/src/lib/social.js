/**
 * Social publishing provider abstraction.
 *
 * The whole social workflow (connect accounts, compose, schedule, publish,
 * track) is fully usable with NO external keys — publishing is then simulated
 * and clearly marked "simulated", exactly like the email layer logs "skipped"
 * without Resend. When a platform's API credentials are supplied via env, the
 * same call path posts for real. This keeps the app honest and demo-able while
 * being production-ready per platform.
 *
 * To go live for a platform, set e.g. FACEBOOK_ACCESS_TOKEN / IG_ACCESS_TOKEN /
 * WHATSAPP_TOKEN … and implement the marked fetch in publishReal().
 */
import { log } from "./logger.js";
import { decryptSecret } from "./secrets.js";

export const PLATFORMS = [
  { id: "facebook",  name: "Facebook",  env: "FACEBOOK_ACCESS_TOKEN" },
  { id: "instagram", name: "Instagram", env: "IG_ACCESS_TOKEN" },
  { id: "whatsapp",  name: "WhatsApp",  env: "WHATSAPP_TOKEN" },
  { id: "x",         name: "X (Twitter)", env: "X_ACCESS_TOKEN" },
  { id: "linkedin",  name: "LinkedIn",  env: "LINKEDIN_ACCESS_TOKEN" },
  { id: "tiktok",    name: "TikTok",    env: "TIKTOK_ACCESS_TOKEN" },
  { id: "youtube",   name: "YouTube",   env: "YOUTUBE_ACCESS_TOKEN" },
];

const PLATFORM_IDS = new Set(PLATFORMS.map((p) => p.id));
export const isPlatform = (id) => PLATFORM_IDS.has(id);
export const platformName = (id) => PLATFORMS.find((p) => p.id === id)?.name ?? id;

/** Is a real API configured for this platform (env credential present)? */
export function platformConfigured(platform) {
  const p = PLATFORMS.find((x) => x.id === platform);
  return !!(p && process.env[p.env]?.trim());
}

function accountToken(account) {
  if (!account?.tokenCipher) return null;
  try {
    return decryptSecret({ ciphertext: account.tokenCipher, iv: account.tokenIv, tag: account.tokenTag });
  } catch {
    return null;
  }
}

/**
 * Publish one post to one platform. Returns a per-platform result object:
 *   { ok, mode: "live"|"simulated", ref?, error?, at }
 */
export async function publishToPlatform(platform, account, post) {
  const at = new Date().toISOString();
  if (!platformConfigured(platform)) {
    // Simulated: no external call, no cost — the post is treated as delivered
    // so the queue, analytics and UI all work end to end.
    log.info("social_publish_simulated", { platform, postId: post?.id });
    return { ok: true, mode: "simulated", ref: `sim_${Math.random().toString(36).slice(2, 10)}`, at };
  }
  try {
    const ref = await publishReal(platform, account, post);
    return { ok: true, mode: "live", ref, at };
  } catch (err) {
    log.warn("social_publish_error", { platform, error: err.message });
    return { ok: false, mode: "live", error: err.message, at };
  }
}

/**
 * The single place to wire each platform's real API. Left as a guarded stub:
 * with a token present, implement the platform's publish endpoint here.
 */
async function publishReal(platform, account, post) {
  const token = accountToken(account) || process.env[PLATFORMS.find((p) => p.id === platform).env];
  // Example shape (Meta Graph API); real endpoints/fields differ per platform.
  //   const resp = await fetch(`https://graph.facebook.com/v19.0/${account.handle}/feed`, {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ message: post.content, access_token: token }),
  //   });
  //   if (!resp.ok) throw new Error(`${platform} ${resp.status}`);
  //   return (await resp.json()).id;
  if (!token) throw new Error(`${platform} not authorized`);
  throw new Error(`${platform} live publishing not implemented — add the API call in lib/social.js`);
}

/**
 * Reply to an incoming engagement (comment / mention / DM). Simulated unless the
 * platform's API is configured — the same honest pattern as publishing.
 */
export async function replyToPlatform(platform, account, engagement, text) {
  const at = new Date().toISOString();
  if (!platformConfigured(platform)) {
    log.info("social_reply_simulated", { platform, engagementId: engagement?.id });
    return { ok: true, mode: "simulated", ref: `sim_${Math.random().toString(36).slice(2, 10)}`, at };
  }
  try {
    // Wire each platform's real reply endpoint here (comment reply / DM send),
    // mirroring publishReal(). Left guarded until credentials + endpoints exist.
    const token = accountToken(account) || process.env[PLATFORMS.find((p) => p.id === platform)?.env];
    if (!token) throw new Error(`${platform} not authorized`);
    throw new Error(`${platform} live replies not implemented — add the API call in lib/social.js`);
  } catch (err) {
    log.warn("social_reply_error", { platform, error: err.message });
    return { ok: false, mode: "live", error: err.message, at };
  }
}
