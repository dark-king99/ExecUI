import { useEffect, useState } from "react";
import {
  Activity,
  TrendingUp,
  Zap,
  Database,
  Brain,
  Timer,
  ShieldCheck,
} from "lucide-react";

export default function RealTimeEstimationEngine() {
  const [audience, setAudience] = useState(182340);
  const [delta, setDelta] = useState(0);
  const [latency, setLatency] = useState(142);
  const [confidence, setConfidence] = useState(98.4);
  const [simulationLift, setSimulationLift] = useState(12.6);

  // Simulate real-time recalculation
  useEffect(() => {
    const interval = setInterval(() => {
      const change = Math.floor(Math.random() * 800 - 400);
      setAudience(prev => prev + change);
      setDelta(change);
      setLatency(Math.floor(Math.random() * 200 + 80));
      setConfidence(prev => {
        const next = prev + (Math.random() - 0.5) * 0.2;
        return Number(next.toFixed(2));
      });
      
      setSimulationLift(prev => {
        const next = prev + (Math.random() - 0.5) * 0.4;
        return Number(next.toFixed(2));
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">

      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Activity size={18} /> Real-Time Estimation Engine
      </h2>

      {/* LIVE AUDIENCE */}
      <div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Estimated Audience Size
        </div>
        <div className="text-3xl font-bold mt-1 flex items-center gap-3">
          {audience.toLocaleString()}
          <span
            className={`text-sm ${
              delta >= 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            {delta >= 0 ? "+" : ""}
            {delta}
          </span>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">

        <Metric
          icon={ShieldCheck}
          label="Match Confidence"
          value={`${confidence}%`}
        />

        <Metric
          icon={Timer}
          label="Compute Latency"
          value={`${latency}ms`}
        />

        <Metric
          icon={TrendingUp}
          label="Projected Lift"
          value={`+${simulationLift}%`}
        />

        <Metric
          icon={Database}
          label="Data Sources Used"
          value="6 Sources"
        />

        <Metric
          icon={Brain}
          label="Identity Resolution Impact"
          value="+8.2%"
        />

        <Metric
          icon={Zap}
          label="Refresh Mode"
          value="Streaming"
        />

      </div>

      {/* COMPUTE STATUS */}
      <div className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-4">
        Engine Status: Streaming recomputation active • 4 node cluster •
        Incremental rule diff applied
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="bg-slate-100 dark:bg-slate-800 rounded-md p-3">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Icon size={14} /> {label}
      </div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}