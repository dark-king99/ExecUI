import { useState, useMemo } from "react";
import { Contact as ContactIcon, Plus, Search, Trash2, Mail } from "lucide-react";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, ErrorNote, Modal, Field, TextInput, PrimaryBtn, GhostBtn, fmtNum, fmtDate } from "../../components/crm-ui";

export default function Contacts() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });
  const [err, setErr] = useState(null);
  const { data: contacts, loading, error, refetch } = useApi(() => crm.customers.list(), [], { pollingInterval: 120000 });
  const { mutate: create, loading: creating } = useMutation((d) => crm.customers.create(d), {
    onSuccess: () => { toast({ message: "Contact created", type: "success" }); setShowModal(false); setForm({ name: "", email: "" }); refetch(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const { mutate: remove } = useMutation((id) => crm.customers.delete(id), {
    onSuccess: () => { toast({ message: "Contact removed", type: "success" }); refetch(); },
  });

  const all = contacts ?? [];
  const filtered = useMemo(() => all.filter((c) => !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())), [all, search]);

  return (
    <SolutionShell solutionId="accounts" title="Contacts" subtitle="The people behind every account"
      actions={<PrimaryBtn color="sky" onClick={() => setShowModal(true)}><Plus size={15} /> New Contact</PrimaryBtn>}>
      {showModal && (
        <Modal title="New Contact" onClose={() => setShowModal(false)}
          footer={<><GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn><PrimaryBtn color="sky" disabled={creating} onClick={() => { if (!form.name.trim()) return setErr("Name required"); create(form); }}>{creating ? "Creating…" : "Create"}</PrimaryBtn></>}>
          {err && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <Field label="Name *"><TextInput value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Jane Doe" /></Field>
          <Field label="Email"><TextInput type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="jane@acme.com" /></Field>
        </Modal>
      )}

      <ErrorNote error={error} />
      <MetricGrid items={[{ label: "Total Contacts", value: fmtNum(all.length), icon: ContactIcon, color: "sky" }]} cols={4} loading={loading && all.length === 0} />

      <Section title={`${fmtNum(filtered.length)} Contacts`} icon={ContactIcon} pad={false}
        actions={
          <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 bg-white dark:bg-slate-900">
            <Search size={13} className="text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="text-sm bg-transparent outline-none text-slate-900 dark:text-white w-32" />
          </div>
        }>
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Name", "Email", "Added", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="py-10 text-center text-sm text-slate-500">No contacts found.</td></tr>
                ) : filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{c.name}</td>
                    <td className="px-5 py-3 text-slate-500"><span className="inline-flex items-center gap-1.5"><Mail size={13} className="text-slate-400" />{c.email ?? "—"}</span></td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{fmtDate(c.createdAt)}</td>
                    <td className="px-5 py-3 text-right"><button onClick={() => remove(c.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition"><Trash2 size={15} /></button></td>
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
