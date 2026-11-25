/**
 * A device's configuration backups: versions, the text, and what changed.
 * Configs contain secrets, so this needs "Manage network collection" and
 * every view is audited server-side.
 */
import { useState } from "react";
import { useApi } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { Modal, GhostBtn, Loading } from "../../components/net-ui";

export default function ConfigHistory({ device, onClose }) {
  const { data: versions, loading, error } = useApi(() => network.configs.versions(device.id), [device.id]);
  const [view, setView] = useState(null); // { mode: "diff" | "full", data }
  const [busy, setBusy] = useState(false);

  const open = async (v, mode) => {
    setBusy(true);
    try { setView({ mode, data: mode === "diff" ? await network.configs.diff(v.id) : await network.configs.get(v.id) }); }
    catch (e) { setView({ mode: "error", data: e.message }); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={`Configuration — ${device.name}`} onClose={onClose} footer={<GhostBtn onClick={onClose}>Close</GhostBtn>}>
      {loading ? <Loading rows={3} /> : error ? <p className="text-sm text-red-600">{String(error)}</p> : (versions ?? []).length === 0 ? (
        <p className="text-sm text-slate-500">No backups yet. Run Config Backup from Network → Automation.</p>
      ) : (
        <div className="space-y-3">
          <div className="max-h-40 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-700">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center gap-2 px-3 py-2">
                <span className="flex-1 text-slate-700 dark:text-slate-200">{new Date(v.takenAt).toLocaleString()}</span>
                <span className="text-[11px] text-slate-400">{v.lines} lines{v.changed ? " · changed" : " · first"}</span>
                {v.changed && <button type="button" disabled={busy} onClick={() => open(v, "diff")} className="text-xs text-indigo-600 hover:underline">What changed</button>}
                <button type="button" disabled={busy} onClick={() => open(v, "full")} className="text-xs text-indigo-600 hover:underline">View</button>
              </div>
            ))}
          </div>
          {view?.mode === "error" && <p className="text-sm text-red-600">{view.data}</p>}
          {view?.mode === "full" && (
            <pre className="max-h-80 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-slate-100">{view.data.content}</pre>
          )}
          {view?.mode === "diff" && (
            view.data.tooLarge
              ? <p className="text-sm text-slate-500">Too many changes to show line by line ({view.data.removed} lines out, {view.data.added} in).</p>
              : (
                <pre className="max-h-80 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px]">
                  {view.data.lines.map((l, i) => (
                    <div key={i} className={l.op === "+" ? "text-emerald-300" : "text-rose-300"}>{l.op} {l.text}</div>
                  ))}
                </pre>
              )
          )}
        </div>
      )}
    </Modal>
  );
}
