import { useState } from "react";
import { Wifi, Server, Check } from "lucide-react";
import { useNetwork } from "../../context/NetworkContext";
import { useUser } from "../../context/UserContext";
import { useToast } from "../../components/ui/Toast";
import { SolutionShell, PrimaryBtn } from "./components/net-ui";

const OPTIONS = [
  {
    id: "office",
    name: "Small office / branch",
    icon: Wifi,
    tagline: "Internet, routers & devices",
    points: ["Internet/ISP links + data usage", "Devices, Wi-Fi & routers", "Traffic, map, alerts & docs", "No server or datacenter clutter"],
  },
  {
    id: "datacenter",
    name: "Enterprise / datacenter",
    icon: Server,
    tagline: "Servers, capacity & change control",
    points: ["Everything in Small office, plus:", "Servers & service health", "Capacity planning", "Change management & automation"],
  },
];

export default function NetworkSetup() {
  const { profile, setProfile, loading } = useNetwork();
  const { user } = useUser();
  const toast = useToast();
  const isAdmin = ["enterprise_admin", "system_admin"].includes(user?.role);
  const [selected, setSelected] = useState(profile);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try { await setProfile(selected); toast.success(`Network set to ${selected === "office" ? "Small office" : "Enterprise"} mode`); }
    catch (e) { toast.error(e.message || "Could not update"); }
    finally { setSaving(false); }
  };

  return (
    <SolutionShell solutionId="connectivity" title="Network profile" subtitle="Match the tool to how your network is actually set up.">
      {!isAdmin && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          Only an administrator can change the network profile.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {OPTIONS.map((o) => {
          const Icon = o.icon;
          const active = selected === o.id;
          const current = profile === o.id;
          return (
            <button
              key={o.id}
              disabled={!isAdmin}
              onClick={() => setSelected(o.id)}
              className={`relative text-left rounded-2xl border-2 p-5 transition ${active ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"} ${!isAdmin ? "cursor-default opacity-90" : ""}`}
            >
              {current && <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Current</span>}
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm mb-3"><Icon size={20} className="text-white" /></div>
              <div className="flex items-center gap-1.5"><h3 className="font-semibold text-slate-900 dark:text-white">{o.name}</h3>{active && <Check size={15} className="text-emerald-500" />}</div>
              <p className="text-xs font-medium mt-0.5 text-emerald-600 dark:text-emerald-400">{o.tagline}</p>
              <ul className="mt-3 space-y-1.5">
                {o.points.map((p) => <li key={p} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"><Check size={13} className="text-emerald-500 shrink-0 mt-0.5" />{p}</li>)}
              </ul>
            </button>
          );
        })}
      </div>
      {isAdmin && <div className="flex items-center gap-3"><PrimaryBtn onClick={save} disabled={selected === profile || saving || loading}>{saving ? "Saving…" : selected === profile ? "Saved" : "Apply profile"}</PrimaryBtn></div>}
    </SolutionShell>
  );
}
