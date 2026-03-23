import PageHeader from "../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import DataTable from "../../../components/ui/DataTable";
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle } from "lucide-react";

const policies = [
  { id: "POL-01", name: "Zero-Trust Micro-segmentation",    standard: "CIS L2", status: "pass",    score: 98, exceptions: 0 },
  { id: "POL-02", name: "Firewall Ruleset Audit",           standard: "NIST",   status: "warn",    score: 82, exceptions: 3 },
  { id: "POL-03", name: "Patch Compliance – Network Gear",  standard: "CIS L1", status: "pass",    score: 96, exceptions: 1 },
  { id: "POL-04", name: "Unused Port Shutdown",             standard: "CIS L2", status: "fail",    score: 64, exceptions: 7 },
  { id: "POL-05", name: "Encrypted Management Traffic",     standard: "SOC 2",  status: "pass",    score: 100,exceptions: 0 },
  { id: "POL-06", name: "MFA on Network Devices",           standard: "NIST",   status: "warn",    score: 75, exceptions: 2 },
];

const statusVariant = { pass: "success", warn: "warning", fail: "danger" };

const columns = [
  { key: "id",         label: "ID" },
  { key: "name",       label: "Policy Name" },
  { key: "standard",   label: "Standard" },
  { key: "score",      label: "Score", render: v => (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-2 rounded-full ${v >= 90 ? "bg-emerald-500" : v >= 75 ? "bg-amber-500" : "bg-red-500"}`}
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="text-xs font-semibold">{v}%</span>
    </div>
  )},
  { key: "status",     label: "Status",     render: v => <StatusBadge label={v.toUpperCase()} variant={statusVariant[v]} dot /> },
  { key: "exceptions", label: "Exceptions", render: v => v > 0
    ? <span className="text-amber-600 dark:text-amber-400 font-semibold text-sm">{v}</span>
    : <span className="text-emerald-500 text-sm">—</span>
  },
];

export default function PolicyCompliance() {
  const passing    = policies.filter(p => p.status === "pass").length;
  const failing    = policies.filter(p => p.status === "fail").length;
  const exceptions = policies.reduce((s, p) => s + p.exceptions, 0);
  const avgScore   = Math.round(policies.reduce((s, p) => s + p.score, 0) / policies.length);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Policy & Compliance"
        subtitle="Network policy checks, zero-trust posture, CIS benchmark scoring and exceptions"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="CIS Benchmark Score" value={`${avgScore}%`} icon={ShieldCheck} color="indigo" />
        <Stat label="Policies Passing"    value={passing}        icon={CheckCircle}  color="emerald" />
        <Stat label="Policies Failing"    value={failing}        icon={XCircle}      color="red" />
        <Stat label="Open Exceptions"     value={exceptions}     icon={AlertTriangle} color="amber" />
      </div>

      <Card>
        <CardHeader title="Policy Checks" icon={ShieldCheck} />
        <CardBody>
          <DataTable columns={columns} data={policies} searchable searchKeys={["name", "standard"]} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {policies.filter(p => p.exceptions > 0).map(p => (
          <Card key={p.id}>
            <CardBody>
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{p.name}</p>
                <StatusBadge label={`${p.exceptions} exc.`} variant="warning" />
              </div>
              <p className="text-xs text-slate-500 mb-3">Standard: {p.standard} · Score: {p.score}%</p>
              <button className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Review exceptions →</button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
