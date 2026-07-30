/**
 * Knowledge base.
 *
 * Two independent switches decide who can read an article, and both must be open:
 *
 *   `visibility`  public | internal  — is this for customers, or for staff?
 *   `status`      draft | published | archived  — is it finished?
 *
 * A public *draft* is invisible to the portal, which is what makes it safe to
 * write in the open. Every customer-facing read goes through `publicWhere()`, so
 * there is one place to be right about it rather than a condition repeated at
 * each call site.
 *
 * Helpfulness feedback is stored as rows, not just counters, because the comment
 * on a "no" is the thing that tells you what to rewrite.
 */
import prisma from "../../config/database.js";
import { log } from "../../lib/logger.js";

const err = (message, status = 400) => { const e = new Error(message); e.status = status; return e; };

const str = (v, max) => (v == null || v === "" ? null : String(v).slice(0, max));
const nameOf = (u) => (u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email : null);

export const VISIBILITIES = ["public", "internal"];
export const STATUSES = ["draft", "published", "archived"];
const MAX_BODY = 100_000;

/**
 * The only filter that decides what a customer may read. Anything the portal
 * serves is built on top of this.
 */
export const publicWhere = () => ({ status: "published", visibility: "public" });

/** URL-safe slug. Collisions get a numeric suffix rather than overwriting. */
export function slugify(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "article";
}

async function uniqueSlug(base, model, excludeId = null) {
  let slug = base, n = 1;
  for (;;) {
    const clash = await prisma[model].findFirst({ where: { slug }, select: { id: true } });
    if (!clash || clash.id === excludeId) return slug;
    n += 1;
    slug = `${base}-${n}`.slice(0, 90);
  }
}

/** Rough reading time — the small courtesy that makes a help centre feel finished. */
export const readingMinutes = (body) => Math.max(1, Math.round(String(body ?? "").trim().split(/\s+/).filter(Boolean).length / 200));

// ── Shaping ──────────────────────────────────────────────────────────────────
export const shapeCategory = (c, { articleCount } = {}) => ({
  id: c.id, name: c.name, slug: c.slug, description: c.description, icon: c.icon,
  visibility: c.visibility, sortOrder: c.sortOrder, active: c.active,
  articleCount: articleCount ?? c._count?.articles,
});

export const shapeArticle = (a, { body = true } = {}) => ({
  id: a.id,
  categoryId: a.categoryId,
  categoryName: a.category?.name ?? null,
  title: a.title,
  slug: a.slug,
  excerpt: a.excerpt,
  ...(body ? { body: a.body } : {}),
  readingMinutes: readingMinutes(a.body),
  tags: a.tags ?? [],
  visibility: a.visibility,
  status: a.status,
  pinned: a.pinned,
  views: a.views,
  helpfulYes: a.helpfulYes,
  helpfulNo: a.helpfulNo,
  helpfulRatio: a.helpfulYes + a.helpfulNo > 0
    ? Math.round((a.helpfulYes / (a.helpfulYes + a.helpfulNo)) * 100)
    : null,
  authorName: a.authorName,
  publishedAt: a.publishedAt,
  createdAt: a.createdAt,
  updatedAt: a.updatedAt,
});

// ── Categories ───────────────────────────────────────────────────────────────
export async function listCategories({ includeInactive = false, publicOnly = false } = {}) {
  const where = {};
  if (!includeInactive) where.active = true;
  if (publicOnly) where.visibility = "public";
  const rows = await prisma.kbCategory.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          // A customer-facing count must only count what a customer can open,
          // or the section header promises articles that aren't there.
          articles: publicOnly ? { where: publicWhere() } : true,
        },
      },
    },
  });
  return rows.map((c) => shapeCategory(c));
}

export async function createCategory(body = {}) {
  const name = String(body.name ?? "").trim();
  if (!name) throw err("A category needs a name");
  if (body.visibility && !VISIBILITIES.includes(body.visibility)) throw err('Visibility must be "public" or "internal"');

  const slug = await uniqueSlug(slugify(body.slug || name), "kbCategory");
  const row = await prisma.kbCategory.create({
    data: {
      name: name.slice(0, 120), slug,
      description: str(body.description, 500),
      icon: str(body.icon, 40),
      visibility: body.visibility ?? "public",
      sortOrder: Math.trunc(Number(body.sortOrder) || 0),
    },
  });
  return shapeCategory(row, { articleCount: 0 });
}

export async function updateCategory(id, body = {}) {
  const existing = await prisma.kbCategory.findFirst({ where: { id } });
  if (!existing) throw err("Category not found", 404);

  const data = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) throw err("A category needs a name");
    data.name = name.slice(0, 120);
  }
  if (body.description !== undefined) data.description = str(body.description, 500);
  if (body.icon !== undefined) data.icon = str(body.icon, 40);
  if (body.visibility !== undefined) {
    if (!VISIBILITIES.includes(body.visibility)) throw err('Visibility must be "public" or "internal"');
    data.visibility = body.visibility;
  }
  if (body.sortOrder !== undefined) data.sortOrder = Math.trunc(Number(body.sortOrder) || 0);
  if (body.active !== undefined) data.active = !!body.active;
  if (body.slug !== undefined) data.slug = await uniqueSlug(slugify(body.slug), "kbCategory", id);

  await prisma.kbCategory.update({ where: { id }, data });
  const row = await prisma.kbCategory.findFirst({ where: { id }, include: { _count: { select: { articles: true } } } });
  return shapeCategory(row);
}

export async function deleteCategory(id) {
  const existing = await prisma.kbCategory.findFirst({ where: { id }, include: { _count: { select: { articles: true } } } });
  if (!existing) throw err("Category not found", 404);
  if (existing._count.articles) {
    throw err(`${existing._count.articles} article(s) are in this category. Move them first, or deactivate the category instead.`, 409);
  }
  await prisma.kbCategory.delete({ where: { id } });
  return { deleted: true };
}

// ── Articles (staff side) ────────────────────────────────────────────────────
export async function listArticles({ categoryId, status, visibility, search, limit = 200 } = {}) {
  const where = {};
  if (categoryId) where.categoryId = categoryId;
  if (status && status !== "all") where.status = status;
  if (visibility && visibility !== "all") where.visibility = visibility;
  if (search) {
    const q = String(search).slice(0, 120);
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { excerpt: { contains: q, mode: "insensitive" } },
      { body: { contains: q, mode: "insensitive" } },
      { tags: { has: q } },
    ];
  }

  const rows = await prisma.kbArticle.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: Math.min(500, Math.max(1, Number(limit) || 200)),
    include: { category: { select: { name: true } } },
  });
  // The list omits bodies — a hundred full articles is a slow response nobody reads.
  return rows.map((a) => shapeArticle(a, { body: false }));
}

export async function getArticle(id) {
  if (!id) throw err("Article not found", 404);
  const row = await prisma.kbArticle.findFirst({ where: { id }, include: { category: { select: { name: true } } } });
  if (!row) throw err("Article not found", 404);
  const feedback = await prisma.kbFeedback.findMany({
    where: { articleId: id, comment: { not: null } },
    orderBy: { createdAt: "desc" }, take: 20,
  });
  return {
    ...shapeArticle(row),
    feedback: feedback.map((f) => ({ id: f.id, helpful: f.helpful, comment: f.comment, createdAt: f.createdAt })),
  };
}

function validateArticle(body = {}, { partial = false } = {}) {
  const data = {};
  if (body.title !== undefined || !partial) {
    const title = String(body.title ?? "").trim();
    if (!title) throw err("An article needs a title");
    data.title = title.slice(0, 200);
  }
  if (body.body !== undefined || !partial) {
    const text = String(body.body ?? "").trim();
    if (!text) throw err("An article needs some content");
    if (text.length > MAX_BODY) throw err(`An article is limited to ${MAX_BODY.toLocaleString()} characters`);
    data.body = text;
  }
  if (body.excerpt !== undefined) data.excerpt = str(body.excerpt, 400);
  if (body.categoryId !== undefined) data.categoryId = body.categoryId ? String(body.categoryId) : null;
  if (body.visibility !== undefined) {
    if (!VISIBILITIES.includes(body.visibility)) throw err('Visibility must be "public" or "internal"');
    data.visibility = body.visibility;
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) throw err(`Status must be one of: ${STATUSES.join(", ")}`);
    data.status = body.status;
  }
  if (body.pinned !== undefined) data.pinned = !!body.pinned;
  if (body.tags !== undefined) {
    data.tags = Array.isArray(body.tags)
      ? body.tags.map((t) => String(t).trim().slice(0, 40)).filter(Boolean).slice(0, 12)
      : [];
  }
  return data;
}

export async function createArticle(user, body = {}) {
  const data = validateArticle(body);
  if (data.categoryId) {
    const category = await prisma.kbCategory.findFirst({ where: { id: data.categoryId }, select: { id: true } });
    if (!category) throw err("That category doesn't exist", 404);
  }

  const me = await prisma.user.findFirst({
    where: { id: user.userId }, select: { firstName: true, lastName: true, email: true },
  });

  data.slug = await uniqueSlug(slugify(body.slug || data.title), "kbArticle");
  data.visibility = data.visibility ?? "public";
  data.status = data.status ?? "draft";
  data.excerpt = data.excerpt ?? autoExcerpt(data.body);
  data.authorId = user.userId;
  data.authorName = nameOf(me);
  if (data.status === "published") data.publishedAt = new Date();

  const row = await prisma.kbArticle.create({ data });
  return shapeArticle(row);
}

/** First sentence-ish of the body, so a listing is never blank. */
export function autoExcerpt(body, max = 200) {
  const text = String(body ?? "")
    // Strip markup, but only where it IS markup: list bullets and quote markers
    // at the start of a line. Stripping every hyphen would turn "sign-in" into
    // "sign in" and "e-signature" into "e signature".
    .replace(/^[\s>*+-]+/gm, " ")
    .replace(/[#*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text || null;
  const cut = text.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return `${stop > 60 ? cut.slice(0, stop + 1) : cut.trim()}…`;
}

export async function updateArticle(id, body = {}) {
  const existing = await prisma.kbArticle.findFirst({ where: { id } });
  if (!existing) throw err("Article not found", 404);

  const data = validateArticle(body, { partial: true });
  if (data.categoryId) {
    const category = await prisma.kbCategory.findFirst({ where: { id: data.categoryId }, select: { id: true } });
    if (!category) throw err("That category doesn't exist", 404);
  }
  if (body.slug !== undefined) data.slug = await uniqueSlug(slugify(body.slug), "kbArticle", id);
  // Publishing for the first time stamps the date; re-publishing keeps the
  // original, because "published" is when customers first saw it.
  if (data.status === "published" && !existing.publishedAt) data.publishedAt = new Date();

  await prisma.kbArticle.update({ where: { id }, data });
  return getArticle(id);
}

export async function deleteArticle(id) {
  const existing = await prisma.kbArticle.findFirst({ where: { id } });
  if (!existing) throw err("Article not found", 404);
  if (existing.status === "published") {
    throw err("This article is published — archive it first so any link to it stops resolving deliberately rather than breaking.", 409);
  }
  await prisma.kbArticle.delete({ where: { id } });
  return { deleted: true };
}

// ── Public (portal) reads ────────────────────────────────────────────────────
/** The help centre a customer sees: public categories with published articles. */
export async function publicIndex() {
  const [categories, uncategorised, popular] = await Promise.all([
    prisma.kbCategory.findMany({
      where: { active: true, visibility: "public" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        articles: {
          where: publicWhere(),
          orderBy: [{ pinned: "desc" }, { title: "asc" }],
          select: { id: true, title: true, slug: true, excerpt: true, pinned: true, updatedAt: true, body: true },
        },
      },
    }),
    prisma.kbArticle.findMany({
      where: { ...publicWhere(), categoryId: null },
      orderBy: [{ pinned: "desc" }, { title: "asc" }],
      select: { id: true, title: true, slug: true, excerpt: true, pinned: true, updatedAt: true, body: true },
    }),
    prisma.kbArticle.findMany({
      where: publicWhere(),
      orderBy: { views: "desc" }, take: 5,
      select: { id: true, title: true, slug: true, views: true },
    }),
  ]);

  const trim = (a) => ({
    id: a.id, title: a.title, slug: a.slug,
    excerpt: a.excerpt ?? autoExcerpt(a.body),
    pinned: a.pinned, readingMinutes: readingMinutes(a.body), updatedAt: a.updatedAt,
  });

  return {
    categories: categories
      .map((c) => ({
        id: c.id, name: c.name, slug: c.slug, description: c.description, icon: c.icon,
        articles: c.articles.map(trim),
      }))
      // An empty section is a dead end for a customer, so it isn't shown.
      .filter((c) => c.articles.length > 0),
    uncategorised: uncategorised.map(trim),
    popular: popular.map((a) => ({ id: a.id, title: a.title, slug: a.slug })),
  };
}

/**
 * One article for a customer, by slug or id. Counts a view — the only reason to
 * track views is knowing which articles matter, so it's counted on the read that
 * actually served content.
 */
export async function publicArticle(slugOrId) {
  const key = String(slugOrId ?? "").trim();
  if (!key) throw err("Article not found", 404);

  const row = await prisma.kbArticle.findFirst({
    where: { ...publicWhere(), OR: [{ slug: key }, { id: key }] },
    include: { category: { select: { name: true, slug: true } } },
  });
  if (!row) throw err("That article isn't available.", 404);

  prisma.kbArticle.update({ where: { id: row.id }, data: { views: { increment: 1 } } })
    .catch((e) => log.warn?.("kb_view_count_failed", { articleId: row.id, error: e.message }));

  const related = await prisma.kbArticle.findMany({
    where: { ...publicWhere(), id: { not: row.id }, ...(row.categoryId ? { categoryId: row.categoryId } : {}) },
    orderBy: { views: "desc" }, take: 4,
    select: { id: true, title: true, slug: true },
  });

  return {
    id: row.id, title: row.title, slug: row.slug, body: row.body, excerpt: row.excerpt,
    tags: row.tags ?? [], readingMinutes: readingMinutes(row.body),
    categoryName: row.category?.name ?? null,
    updatedAt: row.updatedAt, publishedAt: row.publishedAt,
    helpfulYes: row.helpfulYes, helpfulNo: row.helpfulNo,
    related,
  };
}

/** Customer-facing search — public, published articles only, ranked simply. */
export async function publicSearch(query, { limit = 10 } = {}) {
  const q = String(query ?? "").trim().slice(0, 120);
  if (q.length < 2) return { query: q, results: [] };

  const rows = await prisma.kbArticle.findMany({
    where: {
      ...publicWhere(),
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { excerpt: { contains: q, mode: "insensitive" } },
        { body: { contains: q, mode: "insensitive" } },
        { tags: { has: q.toLowerCase() } },
      ],
    },
    orderBy: { views: "desc" },
    take: Math.min(25, Math.max(1, Number(limit) || 10)),
    select: { id: true, title: true, slug: true, excerpt: true, body: true, views: true },
  });

  const lower = q.toLowerCase();
  // A title match is what the person almost always meant.
  const ranked = rows
    .map((a) => ({
      id: a.id, title: a.title, slug: a.slug,
      excerpt: a.excerpt ?? autoExcerpt(a.body),
      readingMinutes: readingMinutes(a.body),
      rank: a.title.toLowerCase().includes(lower) ? 2 : 1,
    }))
    .sort((x, y) => y.rank - x.rank);

  return { query: q, results: ranked };
}

/**
 * "Was this helpful?" One row per response, plus the running counters the
 * console sorts on.
 */
export async function recordFeedback(articleId, { helpful, comment, email } = {}) {
  const article = await prisma.kbArticle.findFirst({ where: { id: articleId, ...publicWhere() }, select: { id: true } });
  if (!article) throw err("That article isn't available.", 404);
  if (typeof helpful !== "boolean") throw err("Tell us whether it helped");

  await prisma.kbFeedback.create({
    data: { articleId, helpful, comment: str(comment, 1000), email: str(email, 200) },
  });
  await prisma.kbArticle.update({
    where: { id: articleId },
    data: helpful ? { helpfulYes: { increment: 1 } } : { helpfulNo: { increment: 1 } },
  });
  return { recorded: true, message: helpful ? "Thanks — glad it helped." : "Thanks — we'll use this to improve the article." };
}

/**
 * Which articles are working and which aren't. Sorted by unhelpful votes,
 * because that's the list worth acting on.
 */
export async function stats() {
  const [counts, needsWork, mostRead, unanswered] = await Promise.all([
    prisma.kbArticle.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.kbArticle.findMany({
      where: { helpfulNo: { gt: 0 } },
      orderBy: [{ helpfulNo: "desc" }], take: 5,
      select: { id: true, title: true, helpfulYes: true, helpfulNo: true, views: true },
    }),
    prisma.kbArticle.findMany({
      where: publicWhere(), orderBy: { views: "desc" }, take: 5,
      select: { id: true, title: true, views: true },
    }),
    prisma.kbFeedback.count({ where: { helpful: false, comment: { not: null } } }),
  ]);

  return {
    byStatus: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
    published: counts.find((c) => c.status === "published")?._count._all ?? 0,
    needsWork: needsWork.map((a) => ({
      ...a,
      helpfulRatio: a.helpfulYes + a.helpfulNo > 0 ? Math.round((a.helpfulYes / (a.helpfulYes + a.helpfulNo)) * 100) : null,
    })),
    mostRead,
    commentsToRead: unanswered,
  };
}

/**
 * Articles worth suggesting for a ticket subject — the deflection that stops a
 * question becoming a conversation. Used by the portal when someone starts a new
 * request, and by an agent looking for something to link.
 */
export async function suggestForText(text, { limit = 3 } = {}) {
  const words = String(text ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4)
    .slice(0, 6);
  if (!words.length) return [];

  const rows = await prisma.kbArticle.findMany({
    where: {
      ...publicWhere(),
      OR: words.flatMap((w) => [
        { title: { contains: w, mode: "insensitive" } },
        { excerpt: { contains: w, mode: "insensitive" } },
      ]),
    },
    orderBy: { views: "desc" },
    take: Math.min(10, Math.max(1, Number(limit) || 3) * 3),
    select: { id: true, title: true, slug: true, excerpt: true, body: true, views: true },
  });

  // Rank by how many of the query's words the article actually covers.
  return rows
    .map((a) => {
      const haystack = `${a.title} ${a.excerpt ?? ""}`.toLowerCase();
      return {
        id: a.id, title: a.title, slug: a.slug,
        excerpt: a.excerpt ?? autoExcerpt(a.body),
        hits: words.filter((w) => haystack.includes(w)).length,
      };
    })
    .sort((x, y) => y.hits - x.hits)
    .slice(0, Math.max(1, Number(limit) || 3))
    .map(({ hits: _hits, ...rest }) => rest);
}
