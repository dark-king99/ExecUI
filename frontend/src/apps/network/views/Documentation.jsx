import { useState } from "react";
import { BookOpen, FileText, Settings, Terminal, Database, Folder, AlertCircle, Loader2 } from "lucide-react";
import { useApi } from "../../../hooks/useApi";
import { network } from "../../../services/api";

const ICON_MAP = { BookOpen, FileText, Settings, Terminal, Database, Folder };

export default function Documentation() {
  const [activeId, setActiveId] = useState(null);

  const { data: docs, loading, error } = useApi(
    () => network.docs.list(), [], {}
  );

  const allDocs = docs ?? [];
  const activeDoc = allDocs.find(d => d.id === activeId) ?? allDocs[0] ?? null;

  return (
    <div className="h-full w-full flex">
      <div className="w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <h2 className="text-lg font-semibold mb-4">Documentation</h2>

        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 size={18} className="animate-spin text-slate-400" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <div className="space-y-1">
          {allDocs.map((d) => {
            const Icon = ICON_MAP[d.icon] ?? FileText;
            return (
              <button
                key={d.id}
                onClick={() => setActiveId(d.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-left ${
                  activeDoc?.id === d.id
                    ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={16} />
                {d.title}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 p-8 overflow-auto bg-slate-50 dark:bg-slate-950">
        {!activeDoc && !loading && !error && (
          <p className="text-sm text-slate-500">No documentation available.</p>
        )}

        {activeDoc && (
          <div className="max-w-3xl prose dark:prose-invert">
            <h2 className="text-2xl font-semibold mb-4">{activeDoc.title}</h2>
            {activeDoc.content ? (
              <div
                className="text-sm text-slate-700 dark:text-slate-300 space-y-4"
                dangerouslySetInnerHTML={{ __html: activeDoc.content }}
              />
            ) : (
              <p className="text-sm text-slate-500">No content for this document.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
