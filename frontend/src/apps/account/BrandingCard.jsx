/**
 * White-labelling controls.
 *
 * Every field here is driven by the backend settings registry rather than hand
 * written, so adding a setting on the server surfaces it here with no frontend
 * change. That also means the *gating* is the server's answer, not a guess:
 * each field arrives with `allowed`, and a plan that doesn't include branding
 * shows the field locked rather than hidden — an admin should be able to see
 * what upgrading would buy.
 */
import { useState, useEffect, useMemo } from "react";
import { Palette, Save, Lock, Upload, X } from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { enterprise } from "../../services/api";

const input =
  "w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 " +
  "text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60";

function Field({ def, value, onChange }) {
  const disabled = !def.allowed;
  const id = `set-${def.key}`;

  if (def.type === "boolean") {
    return (
      <label htmlFor={id} className="flex items-start gap-3 cursor-pointer">
        <input id={id} type="checkbox" disabled={disabled} checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-60" />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{def.label}</span>
          <span className="block text-xs text-slate-500">{def.describe}</span>
        </span>
      </label>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
        {def.label}
        {disabled && <Lock size={11} className="text-slate-400" />}
      </label>
      {def.type === "color" ? (
        <div className="flex items-center gap-2">
          <input id={id} type="color" disabled={disabled} value={value || "#0e688a"}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-12 shrink-0 cursor-pointer rounded border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 disabled:opacity-60" />
          <input type="text" disabled={disabled} value={value || ""} placeholder="#0e688a"
            onChange={(e) => onChange(e.target.value)} className={input} />
        </div>
      ) : (
        <input id={id} type={def.type === "email" ? "email" : "text"} disabled={disabled}
          value={value ?? ""} maxLength={def.max} placeholder={def.type === "url" ? "Upload below, or paste a URL" : ""}
          onChange={(e) => onChange(e.target.value)} className={input} />
      )}
      <p className="mt-1 text-xs text-slate-500">{def.describe}</p>
    </div>
  );
}

export default function BrandingCard() {
  const toast = useToast();
  const { data, loading, refetch } = useApi(() => enterprise.settings.get(), []);
  const [draft, setDraft] = useState({});
  const [uploading, setUploading] = useState(false);

  const settings = useMemo(() => (data?.settings ?? []).filter((s) => s.group === "branding"), [data]);
  const entitled = settings.some((s) => s.allowed);

  useEffect(() => {
    if (!settings.length) return;
    setDraft(Object.fromEntries(settings.map((s) => [s.key, s.value])));
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const { mutate: save, loading: saving } = useMutation((patch) => enterprise.settings.update(patch), {
    onSuccess: () => {
      toast({ message: "Branding updated", type: "success" });
      refetch();
      // The app shell reads branding on load; tell it to pick the change up.
      window.dispatchEvent(new CustomEvent("branding:changed"));
    },
    onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }),
  });

  const dirty = settings.some((s) => (draft[s.key] ?? null) !== (s.value ?? null));
  const set = (key, v) => setDraft((p) => ({ ...p, [key]: v }));

  // Its own endpoint, not the avatar uploader: that one writes user.avatarUrl,
  // so a logo upload would quietly replace the admin's profile picture.
  const uploadLogo = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await enterprise.branding.uploadLogo(file);
      const url = res?.url;
      if (!url) throw new Error("Upload did not return a URL");
      set("branding.logoUrl", url);
      toast({ message: "Logo uploaded — save to apply", type: "success" });
    } catch (e) {
      toast({ message: e?.message ?? "Upload failed", type: "error" });
    } finally {
      setUploading(false);
    }
  };

  if (loading && !data) return <SkeletonCard />;

  return (
    <Card>
      <CardHeader
        title="Branding"
        subtitle={entitled ? "What your people and your customers see" : "Available on Enterprise and Executive plans"}
        icon={Palette}
      />
      <CardBody className="space-y-4">
        {!entitled && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            Your plan doesn&apos;t include white-labelling, so these fields are read-only. Anything you set
            previously is kept — it starts applying again if you upgrade.
          </div>
        )}

        {settings.map((s) => (
          <div key={s.key}>
            <Field def={s} value={draft[s.key]} onChange={(v) => set(s.key, v)} />
            {s.key === "branding.logoUrl" && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium dark:border-slate-700 ${s.allowed ? "cursor-pointer text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800" : "cursor-not-allowed text-slate-400"}`}>
                  <Upload size={12} />
                  {uploading ? "Uploading…" : "Upload a file"}
                  <input type="file" accept="image/*" className="hidden" disabled={!s.allowed || uploading}
                    onChange={(e) => uploadLogo(e.target.files?.[0])} />
                </label>
                {draft[s.key] && (
                  <>
                    <img src={draft[s.key]} alt="Logo preview" className="h-7 max-w-[140px] rounded object-contain" />
                    <button type="button" disabled={!s.allowed} onClick={() => set(s.key, "")}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 disabled:opacity-50">
                      <X size={12} /> Remove
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        <div className="flex justify-end pt-1">
          <button
            onClick={() => save(draft)}
            disabled={!entitled || saving || !dirty}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save size={14} /> {saving ? "Saving…" : "Save branding"}
          </button>
        </div>
      </CardBody>
    </Card>
  );
}
