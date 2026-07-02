import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, MessageSquare, Megaphone, Mail, Info } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { notifications as notifApi, notificationsStreamUrl } from "../services/api";

const timeAgo = (t) => {
  if (!t) return "";
  const s = Math.floor((Date.now() - new Date(t)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
const ICON = { message: MessageSquare, dept_message: Megaphone, email: Mail, system: Info };

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  // SSE delivers instantly; polling stays only as a slow safety net.
  const { data: countData, refetch: refetchCount } = useApi(() => notifApi.unreadCount(), [], { pollingInterval: 120000, cacheKey: "notif:count" });
  const { data: items, refetch: refetchList, loading } = useApi(() => notifApi.list({ limit: 15 }), [], { immediate: false });
  const count = countData?.count ?? 0;

  // Live stream: refresh the badge (and the open feed) the moment a
  // notification is created — no more 30-second wait.
  const openRef = useRef(false);
  openRef.current = open;
  useEffect(() => {
    let es;
    let retry;
    const connect = () => {
      try { es = new EventSource(notificationsStreamUrl()); } catch { return; }
      es.addEventListener("notification", () => {
        refetchCount();
        if (openRef.current) refetchList();
      });
      es.onerror = () => {
        es.close();
        // Reconnect with a delay; polling covers the gap meanwhile.
        retry = setTimeout(connect, 15000);
      };
    };
    connect();
    return () => { es?.close(); clearTimeout(retry); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => setOpen((v) => { const n = !v; if (n) refetchList(); return n; });
  const onItem = async (n) => {
    if (!n.read) { try { await notifApi.markRead(n.id); } catch { /* ignore */ } refetchCount(); }
    setOpen(false);
    if (n.link) navigate(n.link);
  };
  const markAll = async () => { try { await notifApi.markAllRead(); } catch { /* ignore */ } refetchCount(); refetchList(); };

  return (
    <div className="relative">
      <button onClick={toggle} title="Notifications" className="relative p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
        <Bell size={15} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</span>
              {count > 0 && (
                <button onClick={markAll} className="flex items-center gap-1 text-xs text-indigo-500 hover:underline">
                  <Check size={12} /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loading && !items ? (
                <div className="space-y-2 p-3">{[1, 2, 3].map((i) => <div key={i} className="h-10 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />)}</div>
              ) : items?.length ? (
                items.map((n) => {
                  const Icon = ICON[n.type] || Info;
                  return (
                    <button key={n.id} onClick={() => onItem(n)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left border-b border-slate-50 dark:border-slate-800/60 transition hover:bg-slate-50 dark:hover:bg-slate-800/70 ${!n.read ? "bg-indigo-50/50 dark:bg-indigo-500/5" : ""}`}>
                      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${!n.read ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}>
                        <Icon size={13} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-800 dark:text-slate-100">{n.title}</p>
                        {n.body && <p className="truncate text-xs text-slate-400">{n.body}</p>}
                        <p className="mt-0.5 text-[10px] text-slate-400">{timeAgo(n.time)}</p>
                      </div>
                      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
                    </button>
                  );
                })
              ) : (
                <p className="py-10 text-center text-sm text-slate-400">You're all caught up</p>
              )}
            </div>
            <button onClick={() => { setOpen(false); navigate("/account/messaging"); }}
              className="w-full border-t border-slate-100 dark:border-slate-800 px-4 py-2.5 text-center text-xs font-medium text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition">
              Open Messaging
            </button>
          </div>
        </>
      )}
    </div>
  );
}
