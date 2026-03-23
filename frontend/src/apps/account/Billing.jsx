import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { CreditCard, DollarSign, Calendar, Download } from "lucide-react";

const invoices = [
  { id: "INV-0042", date: "Mar 1, 2026",  amount: "$3,200", status: "paid",    plan: "Enterprise" },
  { id: "INV-0041", date: "Feb 1, 2026",  amount: "$3,200", status: "paid",    plan: "Enterprise" },
  { id: "INV-0040", date: "Jan 1, 2026",  amount: "$3,200", status: "paid",    plan: "Enterprise" },
  { id: "INV-0039", date: "Dec 1, 2025",  amount: "$2,800", status: "paid",    plan: "Pro" },
];

export default function Billing() {
  const toast = useToast();

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" subtitle="Manage your subscription, payment method and invoices" />

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Current Plan" value="Enterprise" icon={CreditCard} color="indigo" />
        <Stat label="Monthly Cost"  value="$3,200"    icon={DollarSign} color="sky" />
        <Stat label="Next Renewal"  value="Apr 1"     icon={Calendar}   color="emerald" />
      </div>

      <Card>
        <CardHeader title="Subscription" icon={CreditCard} />
        <CardBody>
          <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Enterprise Plan</p>
                <ul className="mt-2 space-y-1 text-xs text-indigo-600 dark:text-indigo-400">
                  {["Unlimited users", "All modules", "Priority support", "Custom integrations", "SSO/SAML"].map(f => (
                    <li key={f} className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />{f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">$3,200</p>
                <p className="text-xs text-indigo-500">/month</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => toast({ message: "Opening plan comparison…", type: "info" })}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Compare plans →
          </button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Payment Method" icon={CreditCard} />
        <CardBody>
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="h-8 w-12 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500">VISA</div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">•••• •••• •••• 4242</p>
                <p className="text-xs text-slate-400">Expires 08/27</p>
              </div>
            </div>
            <StatusBadge label="Default" variant="success" dot />
          </div>
          <button
            onClick={() => toast({ message: "Payment method update flow opened", type: "info" })}
            className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Update payment method →
          </button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Invoices" icon={Download} />
        <CardBody className="space-y-2">
          {invoices.map(inv => (
            <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{inv.id}</p>
                <p className="text-xs text-slate-400">{inv.date} · {inv.plan}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm text-slate-900 dark:text-white">{inv.amount}</span>
                <StatusBadge label={inv.status} variant="success" dot />
                <button
                  onClick={() => toast({ message: `Downloading ${inv.id}…`, type: "info" })}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
