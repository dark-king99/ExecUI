import { useState, useEffect, useCallback } from "react";
import { BookOpen, Search, RefreshCw, AlertTriangle, Loader2, Tag } from "lucide-react";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("auth_token");
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `HTTP ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  });
}

const FALLBACK_ARTICLES = [
  { id: "1", title: "How to submit a service request", summary: "Step-by-step guide to creating and tracking service requests.", category: "getting-started" },
  { id: "2", title: "Understanding SLA policies", summary: "Learn about response and resolution time expectations.", category: "policies" },
  { id: "3", title: "IT Support escalation process", summary: "When and how to escalate IT support tickets.", category: "it" },
  { id: "4", title: "HR onboarding checklist", summary: "Complete checklist for new employee onboarding requests.", category: "hr" },
  { id: "5", title: "Finance approval workflows", summary: "How budget and expense approvals are processed.", category: "finance" },
  { id: "6", title: "Access request best practices", summary: "Guidelines for requesting system access securely.", category: "it" },
];

const CATEGORY_COLORS = {
  "getting-started": "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400",
  policies:          "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  it:                "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  hr:                "bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400",
  finance:           "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
  general:           "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export default function KnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/service/knowledge").catch(() => FALLBACK_ARTICLES);
      setArticles(Array.isArray(data) ? data : data?.data ?? FALLBACK_ARTICLES);
    } catch (err) {
      setError(err.message);
      setArticles(FALLBACK_ARTICLES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const categories = ["all", ...new Set(articles.map((a) => a.category).filter(Boolean))];

  const filtered = articles.filter((article) => {
    const matchSearch = !search ||
      article.title.toLowerCase().includes(search.toLowerCase()) ||
      (article.summary ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "all" || article.category === activeCategory;
    return matchSearch && matchCat;
  });

  if (error && articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-10 w-10 text-rose-500" />
        <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
        <button onClick={fetchArticles} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Knowledge Base</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Browse articles, guides, and FAQs.
          </p>
        </div>
        <button onClick={fetchArticles} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search knowledge base…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition ${
              activeCategory === cat
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Tag className="h-3 w-3" />
            {cat}
          </button>
        ))}
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400 dark:text-slate-500">
          <BookOpen className="h-8 w-8" />
          <p className="text-sm">No articles found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((article) => {
            const catColor = CATEGORY_COLORS[article.category] ?? CATEGORY_COLORS.general;
            return (
              <div
                key={article.id}
                className="rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-5 flex flex-col gap-3 hover:shadow-md cursor-pointer transition"
              >
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                    <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${catColor}`}>
                    {article.category ?? "general"}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">{article.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-3">
                    {article.summary ?? "No summary available."}
                  </p>
                </div>
                <button className="mt-auto text-sm text-indigo-600 dark:text-indigo-400 hover:underline text-left">
                  Read more →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
