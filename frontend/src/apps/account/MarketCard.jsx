/**
 * Where this organization sits in the price book.
 *
 * Shown rather than hidden because a discount nobody can see isn't a selling
 * point — an admin in Monrovia should be able to tell that the price they're
 * looking at is a local one, and why.
 *
 * Note the asymmetry in what's editable, which mirrors the API: country is a
 * field, segment is read-only text. A tenant that could set its own segment
 * would set itself to "sme" and pay a sixth of the price, so that one is
 * system_admin only and lives with the operator, not here.
 */
import { useState, useEffect } from "react";
import { Globe, Save, Building2, Info } from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { enterprise } from "../../services/api";

// The markets the price book has a display currency for. Everything else is
// still priced by band — it just shows USD.
const COMMON = [
  ["", "Not set — billed at list price"],
  ["LR", "Liberia"], ["GH", "Ghana"], ["NG", "Nigeria"], ["SL", "Sierra Leone"],
  ["CI", "Côte d'Ivoire"], ["SN", "Senegal"], ["KE", "Kenya"], ["ZA", "South Africa"],
  ["EG", "Egypt"], ["IN", "India"], ["PH", "Philippines"], ["BR", "Brazil"],
  ["GB", "United Kingdom"], ["US", "United States"], ["DE", "Germany"],
];

export default function MarketCard() {
  const toast = useToast();
  const { data: market, loading, refetch } = useApi(() => enterprise.market.get(), []);
  const [country, setCountry] = useState("");

  useEffect(() => { setCountry(market?.country ?? ""); }, [market?.country]);

  const { mutate: save, loading: saving } = useMutation(
    (c) => enterprise.market.setCountry(c),
    {
      onSuccess: () => { toast({ message: "Market updated", type: "success" }); refetch(); },
      onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }),
    },
  );

  if (loading && !market) return null;

  const q = market?.quote;
  const dirty = (country || null) !== (market?.country ?? null);

  return (
    <Card>
      <CardHeader title="Your market" subtitle="What sets the price you're quoted" icon={Globe} />
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="market-country" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Country
            </label>
            <div className="flex items-center gap-2">
              <select
                id="market-country" value={country} onChange={(e) => setCountry(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {COMMON.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
              <button
                onClick={() => save(country || null)}
                disabled={saving || !dirty}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save size={14} /> {saving ? "Saving…" : "Save"}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Must match your billing address. Priced as{" "}
              <span className="font-medium">{market?.bandLabel ?? "—"}</span>.
            </p>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Segment</span>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
              <Building2 size={14} className="shrink-0 text-slate-400" />
              {market?.segmentLabel ?? "—"}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Set by your account manager — talk to us if this looks wrong.
            </p>
          </div>
        </div>

        {q && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Your current plan lists at{" "}
              <span className="font-semibold">${q.listUsd.toLocaleString()}</span>/mo and is priced at{" "}
              <span className="font-semibold text-slate-900 dark:text-white">${q.usd.toLocaleString()}</span>/mo here
              {q.localFormatted && <> — about <span className="font-semibold">{q.localFormatted}</span></>}.
            </p>
            {q.indicative && (
              <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-slate-500">
                <Info size={11} className="mt-0.5 shrink-0" />
                <span>
                  The {q.currency} figure is indicative, converted at rates from {q.ratesAsOf}. You are charged in USD.
                  {q.stale && <strong className="text-amber-600 dark:text-amber-400"> These rates are out of date.</strong>}
                </span>
              </p>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
