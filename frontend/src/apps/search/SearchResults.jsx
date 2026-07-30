/**
 * Global search results.
 *
 * The page answers one question — "where is the thing I'm thinking of?" — so it
 * is deliberately plain: one ranked list, grouped counts as filter chips, and
 * every row a link. Two details that matter:
 *
 *  • Results are ranked **across** modules, not module by module. If the best
 *    match is a contract and the second is a person, that's the order shown.
 *  • The chips say what was searched, so an empty result reads as "nothing
 *    matched in these twelve places" rather than an unexplained blank.
 */
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import { useApi } from "../../hooks/useApi";
import { search as searchApi } from "../../services/api";
import {
  Search, User, Users, TrendingUp, LifeBuoy, CheckSquare, Megaphone, Share2,
  Layers, BookOpen, Briefcase, Server, AlertTriangle, FileText, FileSignature, ArrowRight,
} from "lucide-react";

const cls = (...a) => a.filter(Boolean).join(" ");
const when = (d) => (d ? new Date(d).toLocaleDateString() : null);

// The registry names an icon; the frontend decides what that looks like.
const ICONS = {
  user: User, users: Users, "trending-up": TrendingUp, "life-buoy": LifeBuoy,
  "check-square": CheckSquare, megaphone: Megaphone, "share-2": Share2,
  layers: Layers, "book-open": BookOpen, briefcase: Briefcase, server: Server,
  "alert-triangle": AlertTriangle, "file-text": FileText, "file-signature": FileSignature,
};

export default function SearchResults() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const q = params.get("q") ?? "";
  const sourceFilter = params.get("source") ?? "";
  const [input, setInput] = useState(q);

  useEffect(() => setInput(q), [q]);

  const { data: catalog } = useApi(() => searchApi.catalog(), [], { cacheKey: "search:catalog" });
  const { data, loading } = useApi(
    () => (q.trim().length >= 2
      ? searchApi.query(q, { sources: sourceFilter || undefined, limit: 60 })
      : Promise.resolve(null)),
    [q, sourceFilter],
  );

  const submit = (e) => {
    e.preventDefault();
    setParams(input.trim() ? { q: input.trim(), ...(sourceFilter ? { source: sourceFilter } : {}) } : {});
  };

  const setSource = (id) => {
    const next = { q };
    if (id) next.source = id;
    setParams(next);
  };

  return (
    <div>
      <PageHeader
        title="Search"
        subtitle="Everything you have access to, in one place — read live from each module."
      />

      <form onSubmit={submit} className="mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search contacts, tickets, documents, contracts, people…"
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">
          Every word must match. Put a phrase in quotes to keep it together.
        </p>
      </form>

      {q.trim().length >= 2 && data && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSource("")}
            className={cls("rounded-full px-2.5 py-1 text-[11px] font-medium transition",
              !sourceFilter
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300")}>
            Everything · {data.total}
          </button>
          {data.groups.map((g) => (
            <button key={g.id} onClick={() => setSource(g.id)}
              className={cls("rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                sourceFilter === g.id
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300")}>
              {g.label} · {g.count}
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardBody className="space-y-1">
          {q.trim().length < 2 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Search size={22} className="text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Type at least two characters</p>
              <p className="max-w-md text-xs text-slate-400">
                {catalog
                  ? `Searching ${catalog.sources.length} place${catalog.sources.length === 1 ? "" : "s"}: ${catalog.sources.map((s) => s.label.toLowerCase()).join(", ")}.`
                  : "Loading what you can search…"}
              </p>
            </div>
          )}

          {loading && q.trim().length >= 2 && <p className="py-8 text-center text-sm text-slate-400">Searching…</p>}

          {data && !loading && data.results.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Search size={22} className="text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Nothing matched “{data.query}”</p>
              <p className="max-w-md text-xs text-slate-400">
                Looked in {data.searched.length} place{data.searched.length === 1 ? "" : "s"}. Try fewer words —
                every word has to match.
              </p>
            </div>
          )}

          {(data?.results ?? []).map((r) => {
            const Icon = ICONS[r.icon] ?? FileText;
            return (
              <button
                key={`${r.source}-${r.id}`}
                onClick={() => r.link && navigate(r.link)}
                disabled={!r.link}
                className="group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50 disabled:cursor-default dark:hover:bg-slate-800/60"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                  <Icon size={15} className="text-slate-500 dark:text-slate-400" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-900 dark:text-white">{r.title}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {r.sourceLabel}
                    </span>
                  </span>
                  {r.subtitle && <span className="block truncate text-xs text-slate-500">{r.subtitle}</span>}
                  {r.snippet && <span className="mt-0.5 block truncate text-[11px] text-slate-400">{r.snippet}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2 pt-1 text-[11px] text-slate-400">
                  {when(r.date)}
                  {r.link && <ArrowRight size={13} className="opacity-0 transition group-hover:opacity-100" />}
                </span>
              </button>
            );
          })}

          {data?.truncated && (
            <p className="pt-2 text-center text-[11px] text-slate-400">
              Showing the {data.results.length} best of {data.total} matches — add a word to narrow it down.
            </p>
          )}
        </CardBody>
      </Card>

      {data?.searched?.some((s) => s.failed) && (
        <p className="mt-3 text-[11px] text-amber-600 dark:text-amber-400">
          Some sources couldn't be searched just now:{" "}
          {data.searched.filter((s) => s.failed).map((s) => s.label).join(", ")}. The results above are otherwise complete.
        </p>
      )}
    </div>
  );
}
