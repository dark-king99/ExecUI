import { useState, useMemo } from "react";
import { Library as LibraryIcon, Search, BookOpen } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, Section, Loading, Pill, fmtDate } from "../../components/net-ui";

export default function Library() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState(null);
  const { data: docs, loading } = useApi(() => network.docs.list(), [], { pollingInterval: 300000 });

  const all = docs ?? [];
  const categories = useMemo(() => ["all", ...new Set(all.map((d) => d.category))], [all]);
  const filtered = useMemo(() => all.filter((d) => {
    const mc = category === "all" || d.category === category;
    const mq = !query || d.title?.toLowerCase().includes(query.toLowerCase()) || d.summary?.toLowerCase().includes(query.toLowerCase());
    return mc && mq;
  }), [all, query, category]);

  const doc = all.find((d) => d.id === selected) ?? filtered[0] ?? all[0];

  return (
    <SolutionShell solutionId="docs" title="Documentation" subtitle="Always-current runbooks, guides, and references">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Library" icon={LibraryIcon} className="lg:col-span-1" pad={false}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 bg-white dark:bg-slate-900">
              <Search size={14} className="text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search docs…" className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {categories.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={`text-xs px-2 py-0.5 rounded-full border capitalize transition ${category === c ? "bg-teal-600 text-white border-teal-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400"}`}>{c}</button>
              ))}
            </div>
          </div>
          {loading && all.length === 0 ? <div className="p-4"><Loading rows={3} /></div> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[30rem] overflow-y-auto">
              {filtered.length === 0 ? <div className="py-10 text-center text-sm text-slate-400">No docs found.</div> : filtered.map((d) => (
                <button key={d.id} onClick={() => setSelected(d.id)} className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${doc?.id === d.id ? "bg-teal-50/50 dark:bg-teal-500/5" : ""}`}>
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{d.title}</span>
                    <Pill color="emerald">{d.category}</Pill>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{d.summary}</p>
                </button>
              ))}
            </div>
          )}
        </Section>

        <Section title={doc?.title ?? "Document"} subtitle={doc ? `Updated ${fmtDate(doc.updatedAt)}` : ""} icon={BookOpen} className="lg:col-span-2">
          {loading && all.length === 0 ? <Loading rows={3} /> : !doc ? (
            <div className="py-12 text-center text-sm text-slate-400">Select a document.</div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">{doc.summary}</p>
              {(doc.sections ?? []).map((s, i) => (
                <div key={i}>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">{s.heading}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{s.body}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </SolutionShell>
  );
}
