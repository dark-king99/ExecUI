import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, SlidersHorizontal } from "lucide-react";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, Section, Loading, Field, TextInput, SelectInput, PrimaryBtn, Pill } from "../../components/net-ui";

export default function Settings() {
  const toast = useToast();
  const { data: settings, loading } = useApi(() => network.settings.get(), [], {});
  const { data: profiles } = useApi(() => network.settings.profiles.list(), [], {});
  const [form, setForm] = useState(null);
  const { mutate: save, loading: saving } = useMutation((d) => network.settings.update(d), {
    onSuccess: () => toast({ message: "Settings saved", type: "success" }),
    onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }),
  });

  useEffect(() => { if (settings && !form) setForm(settings); }, [settings, form]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const f = form ?? {};

  return (
    <SolutionShell solutionId="config" title="Settings" subtitle="Monitoring configuration and polling profiles">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Monitoring Settings" icon={SettingsIcon}
          actions={<PrimaryBtn color="amber" disabled={saving || !form} onClick={() => save(form)}>{saving ? "Saving…" : <><Save size={14} /> Save</>}</PrimaryBtn>}>
          {loading && !settings ? <Loading rows={3} /> : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="SNMP Version"><SelectInput value={f.snmpVersion ?? "v2c"} onChange={(e) => set("snmpVersion", e.target.value)}>{["v1", "v2c", "v3"].map((v) => <option key={v}>{v}</option>)}</SelectInput></Field>
                <Field label="SNMP Community"><TextInput value={f.snmpCommunity ?? ""} onChange={(e) => set("snmpCommunity", e.target.value)} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Polling Interval (s)"><TextInput type="number" value={f.pollingInterval ?? 60} onChange={(e) => set("pollingInterval", Number(e.target.value))} /></Field>
                <Field label="Alert Retention (days)"><TextInput type="number" value={f.alertRetentionDays ?? 90} onChange={(e) => set("alertRetentionDays", Number(e.target.value))} /></Field>
              </div>
              <Field label="Notification Email"><TextInput type="email" value={f.notificationEmail ?? ""} onChange={(e) => set("notificationEmail", e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Timezone"><SelectInput value={f.timezone ?? "UTC"} onChange={(e) => set("timezone", e.target.value)}>{["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Singapore"].map((tz) => <option key={tz}>{tz}</option>)}</SelectInput></Field>
                <Field label="Max Devices"><TextInput type="number" value={f.maxDevices ?? 500} onChange={(e) => set("maxDevices", Number(e.target.value))} /></Field>
              </div>
            </div>
          )}
        </Section>

        <Section title="Polling Profiles" subtitle="Monitoring templates by device class" icon={SlidersHorizontal}>
          {!profiles ? <Loading rows={3} /> : (
            <div className="space-y-3">
              {(profiles ?? []).map((p) => (
                <div key={p.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{p.name}</h3>
                    <Pill color="amber">{p.snmpVersion}</Pill>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{p.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    <span>Poll {p.pollingInterval}s</span>
                    <span>CPU {p.alertThresholds?.cpu}%</span>
                    <span>Mem {p.alertThresholds?.mem}%</span>
                    <span>BW {p.alertThresholds?.bw}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </SolutionShell>
  );
}
