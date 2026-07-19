import { useState } from "react";
import { Plus, Unlink, Users, CheckCircle2 } from "lucide-react";
import { marketing } from "../../../../services/api";
import { useApi } from "../../../../hooks/useApi";
import { useToast } from "../../../../components/ui/Toast";
import { SolutionShell, Modal, Field, TextInput, PrimaryBtn, GhostBtn, Loading, fmtNum } from "../../components/mkt-ui";
import { platformMeta } from "./platformMeta";

export default function Accounts() {
  const toast = useToast();
  const { data: platforms, loading: lp } = useApi(() => marketing.social.platforms(), []);
  const { data: accounts, loading: la, refresh } = useApi(() => marketing.social.accounts(), []);
  const [connecting, setConnecting] = useState(null); // platform id
  const [form, setForm] = useState({ handle: "", displayName: "", token: "", followers: "" });
  const [busy, setBusy] = useState(false);

  const list = platforms?.platforms ?? [];
  const byPlatform = Object.fromEntries((accounts ?? []).map((a) => [a.platform, a]));

  const open = (id) => { setForm({ handle: "", displayName: "", token: "", followers: "" }); setConnecting(id); };

  const connect = async () => {
    if (!form.handle.trim()) return toast.error("Enter the page/handle");
    setBusy(true);
    try {
      await marketing.social.connect({ platform: connecting, handle: form.handle, displayName: form.displayName, token: form.token || undefined, followers: Number(form.followers) || 0 });
      toast.success("Account connected");
      setConnecting(null);
      refresh();
    } catch (e) { toast.error(e.message || "Could not connect"); }
    finally { setBusy(false); }
  };

  const disconnect = async (id) => {
    try { await marketing.social.disconnect(id); toast.success("Disconnected"); refresh(); }
    catch (e) { toast.error(e.message || "Could not disconnect"); }
  };

  if (lp || la) return <SolutionShell solutionId="social"><Loading /></SolutionShell>;

  return (
    <SolutionShell solutionId="social" title="Accounts" subtitle="Connect the business's social channels.">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((p) => {
          const m = platformMeta(p.id);
          const acct = byPlatform[p.id];
          return (
            <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><m.Icon size={18} className={m.color} /></div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{m.name}</p>
                    <p className="text-[11px] text-slate-400">{p.live ? "Live API ready" : "Simulated"}</p>
                  </div>
                </div>
                {acct && <CheckCircle2 size={16} className="text-emerald-500" />}
              </div>

              {acct ? (
                <>
                  <p className="text-sm text-slate-700 dark:text-slate-200">@{acct.handle}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1"><Users size={12} /> {fmtNum(acct.followers)} followers</p>
                  <GhostBtn onClick={() => disconnect(acct.id)} className="mt-4 w-full justify-center"><Unlink size={13} /> Disconnect</GhostBtn>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-400 mb-4">Not connected.</p>
                  <PrimaryBtn onClick={() => open(p.id)} className="w-full justify-center"><Plus size={14} /> Connect</PrimaryBtn>
                </>
              )}
            </div>
          );
        })}
      </div>

      {connecting && (
        <Modal
          title={`Connect ${platformMeta(connecting).name}`}
          onClose={() => setConnecting(null)}
          footer={<><GhostBtn onClick={() => setConnecting(null)}>Cancel</GhostBtn><PrimaryBtn onClick={connect} disabled={busy}>{busy ? "Connecting…" : "Connect"}</PrimaryBtn></>}
        >
          <Field label="Page / handle *"><TextInput value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="mybusiness" /></Field>
          <Field label="Display name"><TextInput value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="My Business" /></Field>
          <Field label="Current followers (optional)"><TextInput type="number" value={form.followers} onChange={(e) => setForm({ ...form, followers: e.target.value })} placeholder="0" /></Field>
          <Field label="Access token (optional — enables live publishing)"><TextInput type="password" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} placeholder="Stored encrypted" /></Field>
          <p className="text-[11px] text-slate-400">Without a token, this channel works in simulation — you can still compose, schedule, publish to the queue and track growth.</p>
        </Modal>
      )}
    </SolutionShell>
  );
}
