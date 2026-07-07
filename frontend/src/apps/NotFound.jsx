import { useNavigate, useLocation } from "react-router-dom";
import { AlertTriangle, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6">
        <AlertTriangle size={28} className="text-amber-600 dark:text-amber-400" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Page Not Found</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
        The page <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">{pathname}</code> doesn't exist or has been moved.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm px-4 py-2 rounded-lg hover:border-indigo-400 transition"
        >
          <ArrowLeft size={15} /> Go Back
        </button>
        <button
          onClick={() => navigate("/home")}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition"
        >
          <Home size={15} /> Go Home
        </button>
      </div>
    </div>
  );
}
