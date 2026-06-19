import { useState } from "react";
import { Share2, Plus, Database, CheckCircle2, XCircle } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, Modal, Field, TextInput, SelectInput, PrimaryBtn, GhostBtn, Pill, fmtNum } from "../../components/mkt-ui";

const ago = (d) => {
  if (!d) return "Never";
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function DataStreams() {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", type: "crm" });
  const { data: sources, loading, refetch } = useApi(() => marketing.cdp.sources(), [], { pollingInterval: 120000 });
  const { mutate: add, loading: adding } = useMutation((d) => marketing.cdp.addSource(d), {
    onSuccess: () => { toast({ message: "Data stream connected", type: "success" }); setShowModal(false); setForm({ name: "", type: "crm" }); refetch(); },
  });

  const all = sources ?? [];
  const connected = all.filter((s) => s.status === "connected");
  const metrics = [
    { label: "Data Streams", value: all.length, icon: Share2, color: "indigo" },
    { label: "Connected", value: connected.length, icon: CheckCircle2, color: "emerald" },
    { label: "Total Records", value: fmtNum(all.reduce((s, x) => s + (x.records ?? 0), 0)), icon: Database, color: "violet" },
    { label: "Disconnected", value: all.filter((s) => s.status !== "connected").length, icon: XCircle, color: "amber" },
  ];

  return (
    <SolutionShell solutionId="datacloud" title="Data Streams" subtitle="Connect and harmonize every source into Data Cloud"
      actions={<PrimaryBtn color="indigo" onClick={() => setShowModal(true)}><Plus size={15} /> Connect Source</PrimaryBtn>}>
      {showModal && (
        <Modal title="Connect Data Stream" onClose={() => setShowModal(false)}
          footer={<><GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn><PrimaryBtn color="indigo" disabled={adding || !form.name.trim()} onClick={() => add(form)}>{adding ? "Connecting…" : "Connect"}</PrimaryBtn></>}>
          <Field label="Source Name *"><TextInput value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="HubSpot CRM" /></Field>
          <Field label="Type">
            <SelectInput value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
              {["crm", "analytics", "email", "ads", "ecommerce", "webhook"].map((t) => <option key={t}>{t}</option>)}
            </SelectInput>
          </Field>
        </Modal>
      )}

      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <Section title="Connected Sources" icon={Share2} pad={false}>
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Source", "Type", "Records", "Last Sync", "Status"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {all.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{s.name}</td>
                    <td className="px-5 py-3"><Pill color="violet">{s.type}</Pill></td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{fmtNum(s.records)}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{ago(s.lastSync)}</td>
                    <td className="px-5 py-3"><StatusBadge label={s.status} variant={s.status === "connected" ? "success" : s.status === "pending" ? "warning" : "neutral"} dot /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </SolutionShell>
  );
}
