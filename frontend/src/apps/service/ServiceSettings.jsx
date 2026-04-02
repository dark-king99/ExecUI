import { useState, useEffect, useCallback } from "react";
import { Settings, RefreshCw, AlertTriangle, Loader2, Save, Bell, Clock, Tag, Plus, Trash2 } from "lucide-react";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("auth_token");
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `HTTP ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  });
}

const DEFAULT_SETTINGS = {
  notifications: {
    email_on_request: true,
    email_on_approval: true,
    email_on_rejection: true,
    email_on_resolution: false,
  },
  sla_defaults: {
    response_hours: 4,
    resolution_hours: 24,
  },
  categories: ["general", "it", "hr", "finance", "facilities"],
};

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${checked ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

export default function ServiceSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/service/settings").catch(() => DEFAULT_SETTINGS);
      setSettings(data ?? DEFAULT_SETTINGS);
    } catch (err) {
      setError(err.message);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      await apiFetch("/api/service/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateNotification = (key, value) => {
    setSettings((s) => ({ ...s, notifications: { ...s.notifications, [key]: value } }));
  };

  const updateSLA = (key, value) => {
    setSettings((s) => ({ ...s, sla_defaults: { ...s.sla_defaults, [key]: Number(value) } }));
  };

  const addCategory = () => {
    const trimmed = newCategory.trim().toLowerCase();
    if (!trimmed || settings.categories.includes(trimmed)) return;
    setSettings((s) => ({ ...s, categories: [...s.categories, trimmed] }));
    setNewCategory("");
  };

  const removeCategory = (cat) => {
    setSettings((s) => ({ ...s, categories: s.categories.filter((c) => c !== cat) }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Settings</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Configure notification preferences, SLA defaults, and categories.
          </p>
        </div>
        <button onClick={fetchSettings} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {saveSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm">
          Settings saved successfully!
        </div>
      )}

      {/* Notification Preferences */}
      <div className="rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-4 w-4 text-indigo-500" />
          <h2 className="font-semibold text-slate-900 dark:text-white">Notification Preferences</h2>
        </div>
        <div className="space-y-4">
          {[
            { key: "email_on_request",    label: "Email when request submitted" },
            { key: "email_on_approval",   label: "Email when request approved" },
            { key: "email_on_rejection",  label: "Email when request rejected" },
            { key: "email_on_resolution", label: "Email when request resolved" },
          ].map(({ key, label }) => (
            <Toggle
              key={key}
              label={label}
              checked={settings.notifications?.[key] ?? false}
              onChange={(val) => updateNotification(key, val)}
            />
          ))}
        </div>
      </div>

      {/* SLA Defaults */}
      <div className="rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-indigo-500" />
          <h2 className="font-semibold text-slate-900 dark:text-white">SLA Defaults</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Response Time (hours)
            </label>
            <input
              type="number"
              min={1}
              value={settings.sla_defaults?.response_hours ?? 4}
              onChange={(e) => updateSLA("response_hours", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Resolution Time (hours)
            </label>
            <input
              type="number"
              min={1}
              value={settings.sla_defaults?.resolution_hours ?? 24}
              onChange={(e) => updateSLA("resolution_hours", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="h-4 w-4 text-indigo-500" />
          <h2 className="font-semibold text-slate-900 dark:text-white">Categories</h2>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {(settings.categories ?? []).map((cat) => (
            <span key={cat} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {cat}
              <button
                onClick={() => removeCategory(cat)}
                className="hover:text-rose-500 transition"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add category…"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
            className="flex-1 px-3 py-2 rounded-lg border text-sm border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={addCategory}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </button>
      </div>
    </div>
  );
}
