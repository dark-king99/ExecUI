/**
 * Files on an account: what's attached, and attaching from your Drive/OneDrive.
 *
 * Drive files are attached as links, so they stay where they live and keep
 * their own sharing rules. Search runs through the signed-in person's own
 * connection and returns names and links only.
 */
import { useState } from "react";
import { Paperclip, Search, Plus, ExternalLink } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { useToast } from "../../../../components/ui/Toast";
import { attachments, connections } from "../../../../services/api";
import { Section, fmtDate } from "../../components/crm-ui";

export default function AccountFiles({ accountId }) {
  const toast = useToast();
  const { data: files, refetch } = useApi(() => attachments.list("contact", accountId), [accountId]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    setBusy(true);
    try { setResults(await connections.files.search(q)); }
    catch (e) { toast({ message: e.message, type: "error" }); setResults(null); }
    finally { setBusy(false); }
  };
  const attach = async (file) => {
    try {
      await connections.files.attach({ entityType: "contact", entityId: accountId, file });
      toast({ message: `Attached “${file.name}”`, type: "success" });
      refetch();
    } catch (e) { toast({ message: e.message, type: "error" }); }
  };

  return (
    <Section title="Files" icon={Paperclip}>
      <div className="space-y-2">
        {(files ?? []).length === 0 && <p className="text-xs text-slate-400">No files on this account yet.</p>}
        {(files ?? []).map((f) => (
          <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-slate-700 hover:text-sky-600 dark:text-slate-200">
            <ExternalLink size={13} className="shrink-0 text-slate-400" />
            <span className="truncate">{f.fileName}</span>
            <span className="ml-auto shrink-0 text-[11px] text-slate-400">{f.uploaderName ? `${f.uploaderName} · ` : ""}{fmtDate(f.createdAt)}</span>
          </a>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && q.trim().length > 1 && search()}
          placeholder="Find a file in your Drive / OneDrive…"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        <button type="button" disabled={busy || q.trim().length < 2} onClick={search}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-sky-400 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">
          <Search size={14} /> {busy ? "Searching…" : "Search"}
        </button>
      </div>
      {results && (
        <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          {results.length === 0 && <p className="p-3 text-xs text-slate-400">No files with that name.</p>}
          {results.map((f) => (
            <div key={f.id} className="flex items-center gap-2 p-2 text-sm">
              <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{f.name}</span>
              <span className="shrink-0 text-[11px] text-slate-400">{f.source}{f.modifiedAt ? ` · ${fmtDate(f.modifiedAt)}` : ""}</span>
              <button type="button" onClick={() => attach(f)} className="flex shrink-0 items-center gap-1 rounded-md bg-sky-600 px-2 py-1 text-xs text-white hover:bg-sky-700"><Plus size={12} /> Attach</button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
