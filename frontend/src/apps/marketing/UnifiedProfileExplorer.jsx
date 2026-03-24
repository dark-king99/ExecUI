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
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { marketing } from "../../services/api";

export default function UnifiedProfileExplorer() {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [profileId, setProfileId] = useState(null);

  const { data: searchResults, loading: searching } = useApi(
    () => searchTerm ? marketing.profiles.search({ q: searchTerm }) : Promise.resolve([]),
    [searchTerm]
  );

  const { data: profile, loading: profileLoading, error: profileError } = useApi(
    () => profileId ? marketing.profiles.get(profileId) : Promise.resolve(null),
    [profileId]
  );

  const allResults = searchResults ?? [];

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(query.trim());
    setProfileId(null);
  };

  return (
    <div className="min-h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      <div className="border-b border-slate-200 dark:border-slate-800 px-8 py-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <User size={22} /> Unified Profile Explorer
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Real-time 360° customer intelligence with identity resolution.
        </p>
      </div>

      <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800">
        <form onSubmit={handleSearch} className="relative max-w-xl flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by email, phone, customer ID, device ID..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2"
          >
            {searching && <Loader2 size={13} className="animate-spin" />} Search
          </button>
        </form>

        {allResults.length > 0 && !profileId && (
          <div className="mt-3 max-w-xl space-y-1">
            {allResults.map(r => (
              <button
                key={r.id}
                onClick={() => setProfileId(r.id)}
                className="w-full text-left px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm hover:border-indigo-400 transition"
              >
                <span className="font-medium">{r.name}</span>
                <span className="text-slate-500 ml-2">{r.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {profileError && (
        <div className="mx-8 mt-6 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {profileError}
        </div>
      )}

      {profileLoading && (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
        </div>
      )}

      {!profileLoading && profile && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 px-8 py-8">

          <div className="xl:col-span-1 space-y-6">
            <Card>
              <h2 className="font-semibold mb-2">Profile Summary</h2>
              <p className="text-sm">Name: {profile.name}</p>
              <p className="text-sm">Customer ID: {profile.customerId}</p>
              <p className="text-sm">Lifecycle: {profile.lifecycle}</p>
              <p className="text-sm">Location: {profile.location}</p>
            </Card>

            <Card>
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Brain size={16} /> Predictive Scores
              </h2>
              <Score label="CLV Prediction" value={profile.scores?.clv ?? "—"} />
              <Score label="Churn Risk"     value={profile.scores?.churnRisk ?? "—"} />
              <Score label="Engagement Score" value={profile.scores?.engagement ?? "—"} />
            </Card>

            <Card>
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <ShieldCheck size={16} /> Consent Status
              </h2>
              {Object.entries(profile.consent ?? {}).map(([channel, status]) => (
                <p key={channel} className="text-sm capitalize">{channel}: {status}</p>
              ))}
              {(!profile.consent || Object.keys(profile.consent).length === 0) && (
                <p className="text-sm text-slate-400">No consent data.</p>
              )}
            </Card>
          </div>

          <div className="xl:col-span-2 space-y-6">
            <Card>
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Activity size={16} /> 360° Activity Timeline
              </h2>
              {(profile.timeline ?? []).map((event, i) => (
                <TimelineEvent
                  key={event.id ?? i}
                  title={event.title}
                  time={event.time ?? event.ts}
                  source={event.source}
                />
              ))}
              {(!profile.timeline || profile.timeline.length === 0) && (
                <p className="text-sm text-slate-400">No timeline events.</p>
              )}
            </Card>

            <Card>
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Clock size={16} /> Activation History
              </h2>
              {(profile.activations ?? []).map((a, i) => (
                <p key={i} className="text-sm">{a}</p>
              ))}
              {(!profile.activations || profile.activations.length === 0) && (
                <p className="text-sm text-slate-400">No activation history.</p>
              )}
            </Card>
          </div>

          <div className="xl:col-span-1 space-y-6">
            <Card>
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Link2 size={16} /> Identity Graph
              </h2>
              {Object.entries(profile.identityGraph ?? {}).map(([key, val]) => (
                <p key={key} className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: {val}</p>
              ))}
              {(!profile.identityGraph || Object.keys(profile.identityGraph).length === 0) && (
                <p className="text-sm text-slate-400">No identity data.</p>
              )}
            </Card>

            <Card>
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Database size={16} /> Attributes
              </h2>
              {Object.entries(profile.attributes ?? {}).map(([key, val]) => (
                <p key={key} className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: {String(val)}</p>
              ))}
              {(!profile.attributes || Object.keys(profile.attributes).length === 0) && (
                <p className="text-sm text-slate-400">No attribute data.</p>
              )}
            </Card>
          </div>
        </div>
      )}

      {!profileLoading && !profile && !searching && searchTerm && allResults.length === 0 && (
        <div className="px-8 py-12 text-center text-sm text-slate-500">
          No profiles found for "{searchTerm}".
        </div>
      )}

      {!searchTerm && !profileId && (
        <div className="px-8 py-12 text-center text-sm text-slate-400">
          Search for a customer to view their unified profile.
        </div>
      )}
    </div>
  );
}

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
