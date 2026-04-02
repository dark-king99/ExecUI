import { useState, useEffect, useCallback } from "react";
import {
  Monitor, Users, DollarSign, Building2, Wrench, BookOpen,
  RefreshCw, AlertTriangle, Loader2, Plus, Search,
} from "lucide-react";

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

const CATEGORY_ICONS = {
  it:        Monitor,
  hr:        Users,
  finance:   DollarSign,
  facilities: Building2,
  general:   Wrench,
  knowledge: BookOpen,
};

const CATEGORY_COLORS = {
  it:        "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  hr:        "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  finance:   "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
  facilities:"bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
  general:   "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  knowledge: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400",
};

// Fallback catalog items when API is unavailable
const FALLBACK_ITEMS = [
  { id: "1", name: "IT Support Request", description: "Get help with hardware, software, or network issues.", category: "it",        status: "active" },
  { id: "2", name: "HR Onboarding",      description: "Request employee onboarding services.",               category: "hr",        status: "active" },
  { id: "3", name: "Finance Approval",   description: "Submit expense reports and budget requests.",          category: "finance",   status: "active" },
  { id: "4", name: "Facilities Request", description: "Request office space, equipment, or maintenance.",     category: "facilities",status: "active" },
  { id: "5", name: "Access Management",  description: "Request access to systems and applications.",          category: "it",        status: "active" },
  { id: "6", name: "Training Request",   description: "Enroll in training and development programs.",         category: "hr",        status: "active" },
];

export default function ServiceCatalog() {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/service/catalog").catch(() => FALLBACK_ITEMS);
      setItems(Array.isArray(data) ? data : data?.data ?? FALLBACK_ITEMS);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const categories = ["all", ...new Set(items.map((i) => i.category).filter(Boolean))];

  const filtered = items.filter((item) => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "all" || item.category === activeCategory;
    return matchSearch && matchCat && item.status !== "inactive";
  });

  if (error && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-10 w-10 text-rose-500" />
        <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
        <button onClick={fetchItems} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700">
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Service Catalog</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Browse and request available services.
          </p>
        </div>
        <button onClick={fetchItems} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Search + Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search services…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition ${
                activeCategory === cat
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400 dark:text-slate-500">
          <Wrench className="h-8 w-8" />
          <p className="text-sm">No services found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const Icon = CATEGORY_ICONS[item.category] ?? Wrench;
            const iconColor = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.general;
            return (
              <div
                key={item.id}
                className="rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-5 flex flex-col gap-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${iconColor}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${iconColor}`}>
                    {item.category ?? "general"}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {item.description ?? "No description available."}
                  </p>
                </div>
                <button className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition">
                  <Plus className="h-4 w-4" /> Request
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
