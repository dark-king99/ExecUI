/**
 * Content Studio — the organization's marketing assets.
 *
 * Real uploads to object storage; the server decides the file type from the
 * file's bytes. Each replacement file is a new version with its own URL, so
 * emails that already went out keep their images. Only approved assets are
 * offered in Email Studio, and an asset that has gone out in an email can be
 * archived but not deleted.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Image as ImageIcon, Video, FileText, Plus, Trash2, FolderOpen, CheckCircle2, Share2, Upload, Archive, RotateCcw, Copy, X } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, ErrorNote, Modal, Field, TextInput, PrimaryBtn, GhostBtn, Pill, fmtNum } from "../../components/mkt-ui";

const TYPE_ICON = { image: ImageIcon, video: Video, document: FileText };
const STATUS = { draft: "neutral", approved: "success", archived: "warning" };
const size = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const ACCEPT = "image/png,image/jpeg,image/gif,image/webp,video/mp4,video/quicktime,video/webm,application/pdf";

function useRun(toast, after) {
  const [busy, setBusy] = useState(null);
  const run = async (key, fn, ok) => {
    setBusy(key);
    try { const r = await fn(); if (ok) toast({ message: typeof ok === "function" ? ok(r) : ok, type: "success" }); await after?.(); return r; }
    catch (e) { toast({ message: e.message, type: "error" }); return null; }
    finally { setBusy(null); }
  };
  return [busy, run];
}

function Preview({ a, className = "" }) {
  if (a.kind === "image") return <img src={a.url} alt={a.altText ?? ""} className={`object-contain ${className}`} loading="lazy" />;
  if (a.kind === "video") return <video src={a.url} controls preload="metadata" className={className} />;
  return <div className={`flex items-center justify-center bg-slate-100 dark:bg-slate-800 ${className}`}><FileText size={28} className="text-slate-400" /></div>;
}

function AssetDetail({ id, onClose, onChanged }) {
  const toast = useToast();
  const navigate = useNavigate();
  const { data: a, refetch } = useApi(() => marketing.content.assets.get(id), [id]);
  const [edit, setEdit] = useState(null);
  const [busy, run] = useRun(toast, async () => { await refetch(); onChanged(); });
  if (!a) return <Loading rows={4} />;
  const f = edit ?? { name: a.name, altText: a.altText ?? "", tags: a.tags.join(", ") };
  const set = (k, v) => setEdit({ ...f, [k]: v });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{a.name}</h3>
        <StatusBadge label={a.status} variant={STATUS[a.status]} dot />
        <span className="text-xs text-slate-500">v{a.version} · {a.mimeType} · {size(a.size)}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          {a.status === "draft" && <PrimaryBtn disabled={busy === "ap"} onClick={() => run("ap", () => marketing.content.assets.approve(id), "Approved — available in Email Studio")}><CheckCircle2 size={13} /> Approve</PrimaryBtn>}
          {a.status === "approved" && <GhostBtn onClick={() => run("un", () => marketing.content.assets.unapprove(id), "Back to draft")}>Unapprove</GhostBtn>}
          {a.status !== "archived"
            ? <GhostBtn onClick={() => run("ar", () => marketing.content.assets.archive(id), "Archived")}><Archive size={13} /> Archive</GhostBtn>
            : <GhostBtn onClick={() => run("re", () => marketing.content.assets.restore(id), "Restored as draft")}><RotateCcw size={13} /> Restore</GhostBtn>}
          <GhostBtn onClick={() => window.confirm("Delete this asset and all its versions?") && run("del", () => marketing.content.assets.delete(id), "Deleted").then((r) => r && onClose())}><Trash2 size={13} /> Delete</GhostBtn>
          <GhostBtn onClick={onClose}><X size={13} /></GhostBtn>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Preview a={a} className="max-h-96 w-full rounded-lg border border-slate-200 bg-white dark:border-slate-700" />
        <div className="space-y-3">
          <Field label="Name"><TextInput value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
          {a.kind === "image" && <Field label="Alt text (required to approve an image)"><TextInput value={f.altText} onChange={(e) => set("altText", e.target.value)} placeholder="What the image shows" /></Field>}
          <Field label="Tags (comma-separated)"><TextInput value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="launch, hero" /></Field>
          <PrimaryBtn disabled={!edit || busy === "save"} onClick={() => run("save", () => marketing.content.assets.update(id, { name: f.name, altText: f.altText, tags: f.tags }), "Saved").then((r) => r && setEdit(null))}>Save details</PrimaryBtn>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <GhostBtn onClick={() => navigator.clipboard?.writeText(a.absoluteUrl).then(() => toast({ message: "Link copied", type: "success" }))}><Copy size={13} /> Copy link</GhostBtn>
            <GhostBtn onClick={() => navigate("/marketing/social", { state: { content: a.name, mediaUrl: a.absoluteUrl, source: "engagement" } })}><Share2 size={13} /> Use in a social post</GhostBtn>
            {a.status !== "archived" && (
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                <Upload size={13} /> {busy === "ver" ? "Uploading…" : "Upload new version"}
                <input type="file" accept={ACCEPT} className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) run("ver", () => marketing.content.assets.newVersion(id, file), "New version uploaded — approve it again to use it"); }} />
              </label>
            )}
          </div>
          <div className="text-xs">
            <p className="mb-1 font-medium text-slate-600 dark:text-slate-300">Used in</p>
            {a.usage.length ? a.usage.map((u) => <p key={u.id} className="text-slate-500">{u.name} · {u.status}</p>) : <p className="text-slate-400">No emails use it yet.</p>}
          </div>
          <div className="text-xs">
            <p className="mb-1 font-medium text-slate-600 dark:text-slate-300">Versions</p>
            {a.versions.map((v) => <p key={v.id} className="text-slate-500">v{v.version} · {new Date(v.createdAt).toLocaleString()} · {size(v.size)}{v.note ? ` · ${v.note}` : ""} · <a href={v.url} target="_blank" rel="noreferrer" className="text-violet-600 hover:underline dark:text-violet-300">open</a></p>)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContentBuilder() {
  const toast = useToast();
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [up, setUp] = useState({ file: null, name: "", altText: "", tags: "" });
  const params = useMemo(() => ({ kind: kind || undefined, status: status || undefined, q: q.trim() || undefined }), [kind, status, q]);
  const { data: assets, loading, error, refetch } = useApi(() => marketing.content.assets.list(params), [params]);
  const { data: sum, refetch: resum } = useApi(() => marketing.content.assets.summary(), []);
  const [busy, run] = useRun(toast, async () => { await refetch(); await resum(); });
  const all = assets ?? [];

  const metrics = [
    { label: "Assets", value: fmtNum(sum?.total), icon: FolderOpen, color: "violet" },
    { label: "Approved", value: fmtNum(sum?.approved), icon: CheckCircle2, color: "emerald" },
    { label: "Images", value: fmtNum(sum?.images), icon: ImageIcon, color: "sky" },
    { label: "Videos", value: fmtNum(sum?.videos), icon: Video, color: "amber" },
  ];

  const doUpload = () => run("up", () => marketing.content.assets.upload(up.file, { name: up.name, altText: up.altText, tags: up.tags }), "Uploaded").then((r) => {
    if (r) { setShowUpload(false); setUp({ file: null, name: "", altText: "", tags: "" }); setOpen(r.id); }
  });

  return (
    <SolutionShell solutionId="engagement" title="Content Studio" subtitle="Your brand assets — uploaded, versioned and approved before they go into email"
      actions={!open && <PrimaryBtn onClick={() => setShowUpload(true)}><Plus size={15} /> Upload asset</PrimaryBtn>}>
      {showUpload && (
        <Modal title="Upload asset" onClose={() => setShowUpload(false)}
          footer={<><GhostBtn onClick={() => setShowUpload(false)}>Cancel</GhostBtn><PrimaryBtn disabled={!up.file || busy === "up"} onClick={doUpload}>{busy === "up" ? "Uploading…" : "Upload"}</PrimaryBtn></>}>
          <Field label="File — PNG, JPEG, GIF, WebP, MP4, MOV, WebM or PDF"><input type="file" accept={ACCEPT} onChange={(e) => { const file = e.target.files?.[0] ?? null; setUp((p) => ({ ...p, file, name: p.name || (file?.name ?? "").replace(/\.[^.]+$/, "") })); }} className="text-sm" /></Field>
          <Field label="Name"><TextInput value={up.name} onChange={(e) => setUp({ ...up, name: e.target.value })} /></Field>
          <Field label="Alt text (for images)"><TextInput value={up.altText} onChange={(e) => setUp({ ...up, altText: e.target.value })} /></Field>
          <Field label="Tags"><TextInput value={up.tags} onChange={(e) => setUp({ ...up, tags: e.target.value })} placeholder="launch, hero" /></Field>
        </Modal>
      )}

      {open ? (
        <Section title="Asset" icon={FolderOpen}><AssetDetail id={open} onClose={() => { setOpen(null); refetch(); resum(); }} onChanged={() => { refetch(); resum(); }} /></Section>
      ) : (
        <>
          <MetricGrid items={metrics} cols={4} loading={!sum} />
          <div className="flex flex-wrap items-center gap-1.5">
            {[["", "All"], ["image", "Images"], ["video", "Videos"], ["document", "Documents"]].map(([k, l]) => (
              <button key={l} type="button" onClick={() => setKind(k)} className={`rounded-full border px-3 py-1 text-xs transition ${kind === k ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 text-slate-600 hover:border-violet-400 dark:border-slate-700 dark:text-slate-300"}`}>{l}</button>
            ))}
            <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
            {[["", "Current"], ["approved", "Approved"], ["draft", "Drafts"], ["archived", "Archived"]].map(([k, l]) => (
              <button key={l} type="button" onClick={() => setStatus(k)} className={`rounded-full border px-3 py-1 text-xs transition ${status === k ? "border-slate-800 bg-slate-800 text-white dark:border-white dark:bg-white dark:text-slate-900" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}>{l}</button>
            ))}
            <div className="ml-auto w-56"><TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" /></div>
          </div>
          {error && <ErrorNote error={error} />}
          {loading && !assets ? <Loading rows={6} /> : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {all.map((a) => {
                const Icon = TYPE_ICON[a.kind] ?? FileText;
                return (
                  <button key={a.id} type="button" onClick={() => setOpen(a.id)} className="overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900">
                    {a.kind === "image" ? <img src={a.url} alt={a.altText ?? ""} loading="lazy" className="h-36 w-full bg-slate-50 object-contain dark:bg-slate-800" /> : <div className="flex h-36 items-center justify-center bg-slate-50 dark:bg-slate-800"><Icon size={26} className="text-slate-400" /></div>}
                    <div className="p-3">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{a.name}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Pill color={a.kind === "image" ? "violet" : a.kind === "video" ? "sky" : "amber"}>{a.kind}</Pill>
                        <span className="text-xs text-slate-400">{size(a.size)}{a.version > 1 ? ` · v${a.version}` : ""}</span>
                        <span className="ml-auto"><StatusBadge label={a.status} variant={STATUS[a.status]} /></span>
                      </div>
                    </div>
                  </button>
                );
              })}
              {all.length === 0 && <div className="col-span-full py-10 text-center text-sm text-slate-400">No assets here yet. Upload your logo, banners, product shots or PDFs.</div>}
            </div>
          )}
        </>
      )}
    </SolutionShell>
  );
}
