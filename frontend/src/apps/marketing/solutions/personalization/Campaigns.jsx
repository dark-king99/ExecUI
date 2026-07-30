import { useState } from "react";
import { Sparkles, Plus, Eye, TrendingUp } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, Section, Loading, Modal, Field, TextInput, SelectInput, PrimaryBtn, GhostBtn, Pill, fmtNum } from "../../components/mkt-ui";
import useRecordFocus from "../../../../hooks/useRecordFocus";

const STATUS_VARIANT = { active: "success", paused: "warning", draft: "neutral" };

export default function Campaigns() {
  // A campaign followed from global search lands on its row.
  const focus = useRecordFocus();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", variant: "A" });
  const { data: experiences, loading, refetch } = useApi(() => marketing.personalization.list(), [], { pollingInterval: 60000 });
  const { mutate: create, loading: creating } = useMutation((d) => marketing.personalization.create(d), {
    onSuccess: () => { toast({ message: "Web campaign created", type: "success" }); setShowModal(false); setForm({ name: "", variant: "A" }); refetch(); },
  });

  const all = experiences ?? [];

  return (
    <SolutionShell solutionId="personalization" title="Web Campaigns" subtitle="Server-side and client-side personalization campaigns"
      actions={<PrimaryBtn color="pink" onClick={() => setShowModal(true)}><Plus size={15} /> New Campaign</PrimaryBtn>}>
      {showModal && (
        <Modal title="New Web Campaign" onClose={() => setShowModal(false)}
          footer={<><GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn><PrimaryBtn color="pink" disabled={creating || !form.name.trim()} onClick={() => create(form)}>{creating ? "Creating…" : "Create"}</PrimaryBtn></>}>
          <Field label="Campaign Name *"><TextInput value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Homepage Hero — Enterprise CTA" /></Field>
          <Field label="Variant">
            <SelectInput value={form.variant} onChange={(e) => setForm((p) => ({ ...p, variant: e.target.value }))}>
              {["A", "B", "C"].map((v) => <option key={v}>{v}</option>)}
            </SelectInput>
          </Field>
        </Modal>
      )}

      <Section title="Personalization Campaigns" icon={Sparkles} pad={false}>
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Campaign", "Variant", "Impressions", "Lift", "Status"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {all.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-500">No campaigns yet.</td></tr>
                ) : all.map((e) => (
                  <tr key={e.id} data-record-id={e.id} className={focus.className(e.id, "hover:bg-slate-50 dark:hover:bg-slate-800/40 transition")}>
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{e.name}</td>
                    <td className="px-5 py-3"><Pill color="violet">Variant {e.variant}</Pill></td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Eye size={13} className="text-slate-400" />{fmtNum(e.impressions)}</td>
                    <td className="px-5 py-3"><span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium"><TrendingUp size={13} />+{e.lift}%</span></td>
                    <td className="px-5 py-3"><StatusBadge label={e.status} variant={STATUS_VARIANT[e.status] ?? "neutral"} /></td>
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
