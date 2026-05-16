import { useState } from "react";
import { ShoppingCart, DollarSign, TrendingUp, Package, RefreshCw, AlertCircle } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useApi } from "../../hooks/useApi";
import { marketing } from "../../services/api";

const ORDER_STATUS = { completed: "success", processing: "info", pending: "warning", cancelled: "danger", refunded: "neutral" };

export default function CommerceCommand() {
  const [tab, setTab] = useState("orders");
  const { data: orders, loading: ordLoading, error, refetch } = useApi(() => marketing.commerce.orders({ limit: 100 }), [], { pollingInterval: 60000 });
  const { data: metrics, loading: metLoading } = useApi(() => marketing.commerce.metrics(), [], { pollingInterval: 120000 });
  const allOrders = orders ?? [];
  const m = metrics ?? {};
  const totalRevenue = allOrders.reduce((s, o) => s + (o.rawTotal ?? 0), 0);
  const avgOrder = allOrders.length ? Math.round(totalRevenue / allOrders.length) : 0;
  return (
    <div className="space-y-6">
      <PageHeader title="Commerce Command" subtitle="Track orders, revenue, and commerce performance"
        actions={<button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>}
      />
      {metLoading && allOrders.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total Orders" value={m.totalOrders ?? allOrders.length} icon={ShoppingCart} color="violet" />
          <Stat label="Total Revenue" value={m.totalRevenue ?? (totalRevenue ? `$${(totalRevenue / 1000).toFixed(0)}k` : "—")} icon={DollarSign} color="emerald" delta={m.revenueDelta} />
          <Stat label="Avg Order Value" value={m.avgOrderValue ?? (avgOrder ? `$${avgOrder}` : "—")} icon={TrendingUp} color="sky" />
          <Stat label="Top Product" value={m.topProduct ?? "—"} icon={Package} color="amber" />
        </div>
      )}
      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}
      <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden w-fit">
        {["orders", "metrics"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm font-medium capitalize transition ${tab === t ? "bg-violet-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{t}</button>
        ))}
      </div>
      {tab === "orders" && (
        <Card>
          {ordLoading && allOrders.length === 0 ? <div className="p-5"><SkeletonTable rows={8} /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {["Order ID", "Customer", "Product / Items", "Total", "Date", "Status"].map(h => (
                      <th key={h} className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {allOrders.length === 0 ? (
                    <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">No orders found.</td></tr>
                  ) : allOrders.map((o, i) => (
                    <tr key={o.id ?? i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-4 font-mono text-xs text-slate-400">#{o.id?.toString().slice(-6) ?? "—"}</td>
                      <td className="p-4 text-slate-900 dark:text-white font-medium">{o.customer ?? o.customerName ?? "—"}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">
                        <div className="truncate max-w-40">{o.product ?? o.items?.map(i => i.name).join(", ") ?? "—"}</div>
                        {o.quantity != null && <div className="text-xs text-slate-400">{o.quantity} items</div>}
                      </td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">{o.total ?? o.value ?? "—"}</td>
                      <td className="p-4 text-slate-400 text-xs">{o.date ?? o.createdAt ?? "—"}</td>
                      <td className="p-4"><StatusBadge label={o.status ?? "pending"} variant={ORDER_STATUS[o.status] ?? "neutral"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      {tab === "metrics" && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(m).filter(([, v]) => v != null && typeof v !== "object").map(([key, val]) => (
            <div key={key} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-1 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{String(val)}</div>
            </div>
          ))}
          {Object.keys(m).length === 0 && <p className="col-span-3 text-sm text-slate-500 text-center py-8">No metrics available.</p>}
        </div>
      )}
    </div>
  );
}
