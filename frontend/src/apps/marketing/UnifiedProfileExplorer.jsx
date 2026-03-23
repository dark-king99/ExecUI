import { useState } from "react";
import {
  Search,
  User,
  Activity,
  Brain,
  ShieldCheck,
  Link2,
  Clock,
  Database,
} from "lucide-react";

export default function UnifiedProfileExplorer() {
  const [selectedProfile, setSelectedProfile] = useState(true);

  return (
    <div className="min-h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* HEADER */}
      <div className="border-b border-slate-200 dark:border-slate-800 px-8 py-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <User size={22} /> Unified Profile Explorer
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Real-time 360° customer intelligence with identity resolution.
        </p>
      </div>

      {/* SEARCH BAR */}
      <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800">
        <div className="relative max-w-xl">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            placeholder="Search by email, phone, customer ID, device ID..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {selectedProfile && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 px-8 py-8">

          {/* LEFT PROFILE SUMMARY */}
          <div className="xl:col-span-1 space-y-6">

            <Card>
              <h2 className="font-semibold mb-2">Profile Summary</h2>
              <p className="text-sm">Name: Sarah Johnson</p>
              <p className="text-sm">Customer ID: CUST-928134</p>
              <p className="text-sm">Lifecycle: High Intent</p>
              <p className="text-sm">Location: California, US</p>
            </Card>

            <Card>
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Brain size={16} /> Predictive Scores
              </h2>
              <Score label="CLV Prediction" value="$12,480" />
              <Score label="Churn Risk" value="12%" />
              <Score label="Engagement Score" value="87/100" />
            </Card>

            <Card>
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <ShieldCheck size={16} /> Consent Status
              </h2>
              <p className="text-sm">Email: Opted-In</p>
              <p className="text-sm">SMS: Opted-Out</p>
              <p className="text-sm">Ads Personalization: Enabled</p>
            </Card>

          </div>

          {/* CENTER TIMELINE */}
          <div className="xl:col-span-2 space-y-6">

            <Card>
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Activity size={16} /> 360° Activity Timeline
              </h2>

              <TimelineEvent
                title="Opened Marketing Email"
                time="2 hours ago"
                source="Email Automation"
              />

              <TimelineEvent
                title="Visited Pricing Page"
                time="1 day ago"
                source="Web Tracking"
              />

              <TimelineEvent
                title="Added Product to Cart"
                time="2 days ago"
                source="E-Commerce Platform"
              />

              <TimelineEvent
                title="Customer Support Ticket Created"
                time="5 days ago"
                source="CRM"
              />
            </Card>

            <Card>
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Clock size={16} /> Activation History
              </h2>
              <p className="text-sm">
                Included in Segment: High Intent Buyers (v3.2)
              </p>
              <p className="text-sm">
                Entered Journey: Q4 Retargeting Flow
              </p>
            </Card>

          </div>

          {/* RIGHT DATA PANEL */}
          <div className="xl:col-span-1 space-y-6">

            <Card>
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Link2 size={16} /> Identity Graph
              </h2>
              <p className="text-sm">Email: sarah@email.com</p>
              <p className="text-sm">Device ID: DVC-129381</p>
              <p className="text-sm">CRM ID: CRM-88192</p>
              <p className="text-sm">Ad Platform ID: FB-99281</p>
            </Card>

            <Card>
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Database size={16} /> Attributes
              </h2>
              <p className="text-sm">Last Purchase: $248</p>
              <p className="text-sm">Total Orders: 18</p>
              <p className="text-sm">Preferred Channel: Email</p>
              <p className="text-sm">Customer Since: 2019</p>
            </Card>

          </div>

        </div>
      )}
    </div>
  );
}

/* COMPONENTS */

function Card({ children }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm text-sm space-y-2">
      {children}
    </div>
  );
}

function Score({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function TimelineEvent({ title, time, source }) {
  return (
    <div className="border-l-2 border-indigo-500 pl-4 mb-4">
      <div className="font-medium">{title}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {time} • {source}
      </div>
    </div>
  );
}