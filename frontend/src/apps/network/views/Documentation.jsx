import { useState } from "react";
import { BookOpen, FileText, Settings, Terminal, Database, Folder, AlertCircle, Loader2, Search, ChevronRight } from "lucide-react";
import { useApi } from "../../../hooks/useApi";
import { network } from "../../../services/api";
import PageHeader from "../../../components/ui/PageHeader";

const ICON_MAP = { BookOpen, FileText, Settings, Terminal, Database, Folder };

export default function Documentation() {
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState("");

  const { data: docs, loading, error } = useApi(() => network.docs.list(), [], {});

  const allDocs = docs ?? [];
  const filtered = search ? allDocs.filter(d => d.title?.toLowerCase().includes(search.toLowerCase()) || d.category?.toLowerCase().includes(search.toLowerCase())) : allDocs;
  const activeDoc = allDocs.find(d => d.id === activeId) ?? allDocs[0] ?? null;

  const categories = [...new Set(allDocs.map(d => d.category).filter(Boolean))];

  return (
    <div className="space-y-0">
      <div className="pb-4">
        <PageHeader title="Documentation" subtitle="Network runbooks, configuration guides, and SOPs" />
      </div>
      <div className="flex h-[calc(100vh-200px)] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800">
              <Search size={13} className="text-slate-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search docs…" className="flex-1 text-xs bg-transparent outline-none text-slate-700 dark:text-slate-300" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loading && (
              <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg m-1"><AlertCircle size={12} />{error}</div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">No documents found.</p>
            )}
            {categories.length > 0 ? categories.map(cat => {
              const catDocs = filtered.filter(d => d.category === cat);
              if (!catDocs.length) return null;
              return (
                <div key={cat} className="mb-3">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{cat}</p>
                  {catDocs.map((doc) => {
                    const Icon = ICON_MAP[doc.icon] ?? FileText;
                    return (
                      <button key={doc.id} onClick={() => setActiveId(doc.id)} className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition mb-0.5 ${activeDoc?.id === doc.id ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                        <Icon size={14} className="shrink-0" />
                        <span className="text-xs font-medium truncate">{doc.title}</span>
                        <ChevronRight size={12} className="ml-auto shrink-0 opacity-50" />
                      </button>
                    );
                  })}
                </div>
              );
            }) : filtered.map((doc) => {
              const Icon = ICON_MAP[doc.icon] ?? FileText;
              return (
                <button key={doc.id} onClick={() => setActiveId(doc.id)} className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition mb-0.5 ${activeDoc?.id === doc.id ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                  <Icon size={14} className="shrink-0" />
                  <span className="text-xs font-medium truncate">{doc.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
          ) : activeDoc ? (
            <article className="max-w-3xl">
              <div className="flex items-start gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  {(() => { const Icon = ICON_MAP[activeDoc.icon] ?? FileText; return <Icon size={20} className="text-emerald-600" />; })()}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">{activeDoc.title}</h1>
                  {activeDoc.category && <p className="text-xs text-slate-400 mt-0.5">{activeDoc.category}</p>}
                </div>
              </div>

              {activeDoc.summary && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3 mb-5">
                  <p className="text-sm text-emerald-800 dark:text-emerald-300">{activeDoc.summary}</p>
                </div>
              )}

              {activeDoc.content ? (
                <div className="prose prose-slate dark:prose-invert prose-sm max-w-none">
                  <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{activeDoc.content}</pre>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeDoc.sections?.map((section, i) => (
                    <div key={i}>
                      {section.heading && <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">{section.heading}</h2>}
                      <p className="text-sm text-slate-600 dark:text-slate-400">{section.body ?? section.text}</p>
                    </div>
                  ))}
                  {!activeDoc.sections && <p className="text-sm text-slate-500">No content available for this document.</p>}
                </div>
              )}

              {activeDoc.updatedAt && (
                <p className="text-xs text-slate-400 mt-8 border-t border-slate-100 dark:border-slate-800 pt-3">Last updated: {activeDoc.updatedAt}</p>
              )}
            </article>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <BookOpen size={40} className="mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm">Select a document to view its content.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
