import { useState } from "react";
import { Fingerprint, Search, Mail, Building2, CheckCircle2, XCircle, Link2 } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, Section, Loading, Pill } from "../../components/mkt-ui";

export default function Identity() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const { data: results, loading } = useApi(() => marketing.profiles.search({ q: query }), [query], { });
  const { data: profile, loading: pLoading } = useApi(() => (selected ? marketing.profiles.get(selected) : Promise.resolve(null)), [selected]);

  const list = results ?? [];

  return (
    <SolutionShell solutionId="datacloud" title="Identity Resolution" subtitle="Search the unified profile graph and inspect a single customer view">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Profile Search" icon={Search} className="lg:col-span-1" pad={false}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 bg-white dark:bg-slate-900">
              <Search size={14} className="text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email…" className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white" />
            </div>
          </div>
          {loading && list.length === 0 ? <div className="p-4"><Loading rows={3} /></div> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[28rem] overflow-y-auto">
              {list.length === 0 ? <div className="py-10 text-center text-sm text-slate-400">No profiles found.</div> : list.map((p) => (
                <button key={p.id} onClick={() => setSelected(p.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${selected === p.id ? "bg-indigo-50/50 dark:bg-indigo-500/5" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.name}</span>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">{p.score}</span>
                  </div>
                  <div className="text-xs text-slate-400 truncate">{p.email}</div>
                </button>
              ))}
            </div>
          )}
        </Section>

        <Section title={profile?.name ?? "Unified Profile"} subtitle={selected ? "Single customer view" : "Select a profile to resolve its identity graph"} icon={Fingerprint} className="lg:col-span-2">
          {!selected ? (
            <div className="py-12 text-center text-sm text-slate-400">Choose a profile on the left to see attributes, consent, and identity links.</div>
          ) : pLoading || !profile ? <Loading rows={2} /> : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300"><Mail size={14} className="text-slate-400" />{profile.email}</div>
                <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300"><Building2 size={14} className="text-slate-400" />{profile.company}</div>
                <Pill color="emerald">{profile.lifecycleStage}</Pill>
                <Pill color="violet">Score {profile.score}</Pill>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Attributes</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(profile.attributes ?? {}).map(([k, v]) => (
                    <div key={k} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
                      <div className="text-[11px] text-slate-400">{k}</div>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Consent</h4>
                  <div className="space-y-1.5">
                    {Object.entries(profile.consent ?? {}).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-sm">
                        <span className="capitalize text-slate-600 dark:text-slate-300">{k}</span>
                        {v ? <CheckCircle2 size={15} className="text-emerald-500" /> : <XCircle size={15} className="text-slate-300 dark:text-slate-600" />}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1"><Link2 size={12} /> Identity Graph</h4>
                  <div className="space-y-1.5">
                    {Object.entries(profile.identityGraph ?? {}).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-sm gap-2">
                        <span className="capitalize text-slate-500">{k}</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate">{v ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Section>
      </div>
    </SolutionShell>
  );
}
