import { useState, useEffect } from "react";
import {
  ShoppingCart,
  TrendingUp,
  Activity,
  Users,
  BarChart3,
  AlertTriangle,
  Repeat,
} from "lucide-react";
import { connectOrderStream, disconnectOrderStream } from "../../App/services/orderSocket";



export default function CommerceCommand() {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [ setOrders] = useState([]);
const [connectionStatus, setConnectionStatus] = useState("connecting");

useEffect(() => {
    connectOrderStream(
      (newOrder) => {
        setOrders(prev => [newOrder, ...prev.slice(0, 19)]);
      },
      (status) => {
        setConnectionStatus(status);
      }
    );
  
    return () => {
      disconnectOrderStream();
    };
  }, []);

  const orders = [
    {
      id: "ORD-91823",
      customer: "Sarah Johnson",
      product: "Pro Plan",
      amount: 249,
      campaign: "Q4 Retargeting",
      channel: "Email",
      status: "Completed",
      ltv: 12480,
    },
    {
      id: "ORD-91824",
      customer: "Michael Chen",
      product: "Enterprise License",
      amount: 1200,
      campaign: "LinkedIn ABM",
      channel: "Paid Social",
      status: "Processing",
      ltv: 8200,
    },
    {
      id: "ORD-91825",
      customer: "Daniel Brooks",
      product: "Marketing Toolkit",
      amount: 89,
      campaign: "SEO Organic",
      channel: "Organic",
      status: "Refunded",
      ltv: 430,
    },
  ];

  return (
    <div className="min-h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* HEADER */}
      <div className="border-b border-slate-200 dark:border-slate-800 px-8 py-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ShoppingCart size={22} /> Commerce Intelligence Platform
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Order attribution, subscription tracking, revenue intelligence & marketing impact.
        </p>
        <div className="flex items-center gap-2 text-xs">
  <div
    className={`h-2 w-2 rounded-full ${
      connectionStatus === "connected"
        ? "bg-green-500"
        : connectionStatus === "connecting"
        ? "bg-yellow-500"
        : "bg-red-500"
    }`}
  />
  {connectionStatus}
</div>
      </div>

      {/* REVENUE STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-6 px-8 py-6">
        <Metric label="Revenue (30d)" value="$2.84M" />
        <Metric label="Orders" value="18,492" />
        <Metric label="AOV" value="$154" />
        <Metric label="Refund Rate" value="2.1%" />
        <Metric label="Subscriptions Active" value="4,212" />
        <Metric label="High LTV Customers" value="1,094" />
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 px-8 pb-10">

        {/* LEFT PANEL */}
        <div className="space-y-6">

          {/* CHANNEL MATRIX */}
          <Card title="Channel Revenue Matrix" icon={BarChart3}>
            <MatrixRow channel="Email" revenue="$840k" lift="+12%" />
            <MatrixRow channel="Paid Social" revenue="$620k" lift="+18%" />
            <MatrixRow channel="Organic" revenue="$480k" lift="+4%" />
          </Card>

          {/* LIVE ORDERS */}
          <Card title="Live Order Stream" icon={Activity}>
            {orders.map(order => (
              <OrderRow
                key={order.id}
                order={order}
                onClick={() => setSelectedOrder(order)}
              />
            ))}
          </Card>

          {/* COHORT GRID */}
          <Card title="Revenue Cohort Analysis" icon={TrendingUp}>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              30-day cohort revenue up +14% • 90-day retention steady at 82%
            </p>
          </Card>

        </div>

        {/* RIGHT SIDE INTELLIGENCE PANEL */}
        <div className="space-y-6">

          <Card title="Subscription Lifecycle" icon={Repeat}>
            <p className="text-sm">New Subscriptions: 482</p>
            <p className="text-sm">Upgrades: 138</p>
            <p className="text-sm">Cancellations: 64</p>
          </Card>

          <Card title="Refund & Risk Signals" icon={AlertTriangle}>
            <p className="text-sm text-red-500">
              12 high-value customers triggered churn flags
            </p>
          </Card>

          {selectedOrder && (
            <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
          )}

        </div>

      </div>
    </div>
  );
}

/* COMPONENTS */

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
    order.status === "Completed"
      ? "text-green-500"
      : order.status === "Processing"
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
      <p><strong>Campaign:</strong> {order.campaign}</p>
      <p><strong>Channel:</strong> {order.channel}</p>
      <p><strong>LTV:</strong> ${order.ltv}</p>
      <p><strong>Status:</strong> {order.status}</p>
    </div>    
  );
}