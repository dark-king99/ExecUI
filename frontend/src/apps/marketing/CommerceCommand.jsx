import { useState } from "react";
import {
  ShoppingCart,
  TrendingUp,
  Activity,
  BarChart3,
  AlertTriangle,
  Repeat,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { marketing } from "../../services/api";

export default function CommerceCommand() {
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { data: metrics, loading: metricsLoading, error: metricsError } = useApi(
    () => marketing.commerce.metrics(), [], { pollingInterval: 30000 }
  );
  const { data: orders, loading: ordersLoading } = useApi(
    () => marketing.commerce.orders({ limit: 20 }), [], { pollingInterval: 15000 }
  );

  const allOrders = orders ?? [];

  return (
    <div className="min-h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      <div className="border-b border-slate-200 dark:border-slate-800 px-8 py-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ShoppingCart size={22} /> Commerce Intelligence Platform
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Order attribution, subscription tracking, revenue intelligence & marketing impact.
        </p>
      </div>

      {metricsError && (
        <div className="mx-8 mt-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {metricsError}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-6 px-8 py-6">
        {metricsLoading && !metrics ? (
          <div className="col-span-6 grid grid-cols-6 gap-6 animate-pulse">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
          </div>
        ) : metrics && (
          <>
            <Metric label="Revenue (30d)"        value={metrics.revenue ?? "—"} />
            <Metric label="Orders"               value={metrics.orders ?? "—"} />
            <Metric label="AOV"                  value={metrics.aov ?? "—"} />
            <Metric label="Refund Rate"          value={metrics.refundRate ?? "—"} />
            <Metric label="Subscriptions Active" value={metrics.subscriptionsActive ?? "—"} />
            <Metric label="High LTV Customers"   value={metrics.highLtvCustomers ?? "—"} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 px-8 pb-10">

        <div className="space-y-6">

          <Card title="Channel Revenue Matrix" icon={BarChart3}>
            {metrics?.channelMatrix ? (
              metrics.channelMatrix.map(row => (
                <MatrixRow key={row.channel} channel={row.channel} revenue={row.revenue} lift={row.lift} />
              ))
            ) : (
              <p className="text-sm text-slate-400">No channel data available.</p>
            )}
          </Card>

          <Card title="Live Order Stream" icon={Activity}>
            {ordersLoading && allOrders.length === 0 && (
              <div className="flex justify-center py-4">
                <Loader2 size={18} className="animate-spin text-slate-400" />
              </div>
            )}
            {!ordersLoading && allOrders.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No orders found.</p>
            )}
            {allOrders.map(order => (
              <OrderRow
                key={order.id}
                order={order}
                onClick={() => setSelectedOrder(order)}
              />
            ))}
          </Card>

          <Card title="Revenue Cohort Analysis" icon={TrendingUp}>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {metrics?.cohortSummary ?? "Loading cohort data…"}
            </p>
          </Card>

        </div>

        <div className="space-y-6">

          <Card title="Subscription Lifecycle" icon={Repeat}>
            {metrics?.subscriptions ? (
              <>
                <p className="text-sm">New Subscriptions: {metrics.subscriptions.new ?? "—"}</p>
                <p className="text-sm">Upgrades: {metrics.subscriptions.upgrades ?? "—"}</p>
                <p className="text-sm">Cancellations: {metrics.subscriptions.cancellations ?? "—"}</p>
              </>
            ) : (
              <p className="text-sm text-slate-400">No subscription data.</p>
            )}
          </Card>

          <Card title="Refund & Risk Signals" icon={AlertTriangle}>
            {metrics?.riskSignals ? (
              <p className="text-sm text-red-500">{metrics.riskSignals}</p>
            ) : (
              <p className="text-sm text-slate-400">No risk signals.</p>
            )}
          </Card>

          {selectedOrder && (
            <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
          )}

        </div>

      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm text-sm">
      <div className="text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

function Card({ title, icon: Icon, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-3">
      <div className="flex items-center gap-2 font-semibold">
        <Icon size={16} /> {title}
      </div>
      {children}
    </div>
  );
}

function MatrixRow({ channel, revenue, lift }) {
  return (
    <div className="flex justify-between text-sm">
      <span>{channel}</span>
      <span>{revenue}</span>
      <span className="text-green-500">{lift}</span>
    </div>
  );
}

function OrderRow({ order, onClick }) {
  const statusColor =
    order.status === "Completed" || order.status === "completed"
      ? "text-green-500"
      : order.status === "Processing" || order.status === "processing"
      ? "text-yellow-500"
      : "text-red-500";

  return (
    <div
      onClick={onClick}
      className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <div>
        <div className="font-medium">{order.id}</div>
        <div className="text-xs text-slate-500">
          {order.customer} • {order.product}
        </div>
      </div>
      <div className="text-right text-sm">
        <div>${order.amount}</div>
        <div className={statusColor}>{order.status}</div>
      </div>
    </div>
  );
}

function OrderDrawer({ order, onClose }) {
  return (
    <div className="border border-indigo-500 rounded-xl p-4 bg-slate-100 dark:bg-slate-800 space-y-2 text-sm">
      <div className="flex justify-between">
        <div className="font-semibold">Order Intelligence</div>
        <button onClick={onClose}>✕</button>
      </div>
      <p><strong>Customer:</strong> {order.customer}</p>
      <p><strong>Campaign:</strong> {order.campaign ?? "—"}</p>
      <p><strong>Channel:</strong> {order.channel ?? "—"}</p>
      <p><strong>LTV:</strong> {order.ltv != null ? `$${order.ltv}` : "—"}</p>
      <p><strong>Status:</strong> {order.status}</p>
    </div>
  );
}
