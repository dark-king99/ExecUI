import { useNavigate, useLocation } from "react-router-dom";
import { Server, Home, Users, TrendingUp, BarChart3, UserLock, Building2 } from "lucide-react";

function NavBtn({ icon: Icon, label, path, current }) {
  const navigate = useNavigate();
  const active = current.startsWith(path);
  return (
    <button
      onClick={() => navigate(path)}
      className={`flex items-center gap-2 w-full p-2 rounded-lg text-sm transition ${
        active
          ? "bg-indigo-600 text-white"
          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}
    >
      <Icon size={18} /> {label}
    </button>
  );
}

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-4 flex flex-col gap-8">
      {/* Enterprise header */}
      <div className="flex items-center gap-2 px-2 py-3 mb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white">
          <Building2 size={16} />
        </div>
        <div className="text-sm font-semibold truncate">My Enterprise</div>
      </div>

      <NavBtn icon={Home}       label="Home"       path="/home"       current={pathname} />
      <NavBtn icon={UserLock}   label="Account"    path="/account"    current={pathname} />
      <NavBtn icon={Users}      label="CRM"        path="/crm"        current={pathname} />
      <NavBtn icon={TrendingUp} label="Marketing"  path="/marketing"  current={pathname} />
      <NavBtn icon={Server}     label="Networks"   path="/network"    current={pathname} />
      <NavBtn icon={BarChart3}  label="Analytics"  path="/analytics"  current={pathname} />
    </aside>
  );
}
