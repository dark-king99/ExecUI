/**
 * Attachments — drop-in file panel for any entity:
 *   <Attachments entityType="deal" entityId={dealId} />
 * Uploads go to object storage through the generic attachments API; the list
 * shows type icon, size, uploader and age, with uploader/admin delete.
 */
import { useRef, useState } from "react";
import { Paperclip, Upload, Trash2, FileText, Image as ImageIcon, Film, FileArchive, File, Loader2 } from "lucide-react";
import { useApi, useMutation } from "../hooks/useApi";
import { attachments as api } from "../services/api";
import { useToast } from "./ui/Toast";

const iconFor = (mime = "", name = "") => {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.startsWith("video/")) return Film;
  if (/zip|rar|7z|tar|gz/.test(mime + name)) return FileArchive;
  if (/pdf|word|text|sheet|csv|presentation/.test(mime)) return FileText;
  return File;
};

const fmtSize = (b = 0) => {
  if (b >= 1e6) return (b / 1e6).toFixed(1) + " MB";
  if (b >= 1e3) return Math.round(b / 1e3) + " KB";
  return b + " B";
};

const timeAgo = (t) => {
  const s = Math.floor((Date.now() - new Date(t)) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function Attachments({ entityType, entityId, compact = false }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const { data: files, refetch } = useApi(
    () => (entityId ? api.list(entityType, entityId) : Promise.resolve([])),
    [entityType, entityId]
  );

  const { mutate: remove } = useMutation((id) => api.remove(id), {
    onSuccess: () => refetch(),
    onError: (e) => toast({ message: e.message, type: "error" }),
  });

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      return toast({ message: "File too large — 100 MB max.", type: "error" });
    }
    try {
      setBusy(true);
      await api.upload(entityType, entityId, file);
      toast({ message: `${file.name} attached`, type: "success" });
      refetch();
    } catch (err) {
      toast({ message: err.message ?? "Upload failed", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const list = files ?? [];

  return (
    <div className={compact ? "" : "space-y-2"}>
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <Paperclip size={13} /> Files {list.length > 0 && <span className="text-slate-400">({list.length})</span>}
        </p>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy || !entityId}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:text-indigo-400"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {busy ? "Uploading…" : "Attach file"}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={onPick} />
      </div>

      {list.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-400">No files attached yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {list.map((f) => {
            const Icon = iconFor(f.mimeType ?? "", f.fileName);
            return (
              <li key={f.id} className="group flex items-center gap-3 py-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <Icon size={14} />
                </span>
                <a href={f.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-800 hover:text-indigo-600 hover:underline dark:text-slate-200 dark:hover:text-indigo-400">{f.fileName}</p>
                  <p className="text-[11px] text-slate-400">
                    {fmtSize(f.size)}{f.uploaderName ? ` · ${f.uploaderName}` : ""} · {timeAgo(f.time)}
                  </p>
                </a>
                <button
                  onClick={() => remove(f.id)}
                  title="Delete file"
                  className="p-1.5 rounded text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-500/10"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
