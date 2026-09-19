"use client";
import { useCallback, useEffect, useState } from "react";
import { api, MemoryFactView, RecoveryPolicyTerms, RecoveryPolicyView } from "@/lib/api";
import { formatMinor } from "@/lib/format";
import { useAppState } from "@/lib/store/AppState";

const DEFAULTS: RecoveryPolicyTerms = {
  abandon_after_minutes: 120,
  min_cart_minor: 999_00,
  discount_percentage: 10,
  max_discount_minor: 300_00,
  cooldown_days: 30,
  monthly_budget_minor: 20_000_00,
  offer_valid_hours: 24,
};

/** Fields shown in rupees are edited in rupees and sent in paise. */
const FIELDS: { key: keyof RecoveryPolicyTerms; label: string; rupees?: boolean; suffix?: string }[] = [
  { key: "abandon_after_minutes", label: "Cart counts as abandoned after", suffix: "min" },
  { key: "min_cart_minor", label: "Minimum cart value", rupees: true },
  { key: "discount_percentage", label: "Discount", suffix: "%" },
  { key: "max_discount_minor", label: "Discount cap per order", rupees: true },
  { key: "cooldown_days", label: "At most one offer per customer every", suffix: "days" },
  { key: "monthly_budget_minor", label: "Monthly discount budget", rupees: true },
  { key: "offer_valid_hours", label: "Offer valid for", suffix: "hours" },
];

/**
 * Cart recovery and what the assistant has learned. Proposing a policy only queues it:
 * it appears in the approval queue and takes effect when approved there, like every
 * other change. Lessons are counts over the operator's own decisions.
 */
export default function StoreMemoryPanel({ onClose }: { onClose: () => void }) {
  const { refreshChanges } = useAppState();
  const [view, setView] = useState<RecoveryPolicyView | null>(null);
  const [facts, setFacts] = useState<MemoryFactView[]>([]);
  const [draft, setDraft] = useState<RecoveryPolicyTerms>(DEFAULTS);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.recoveryPolicy().then(v => {
      setView(v);
      if (v.active) setDraft(prev => ({ ...prev, ...pick(v.active!) }));
    }).catch(e => setError(e instanceof Error ? e.message : "Could not load"));
    api.portalMemory().then(r => setFacts(r.facts)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const propose = async () => {
    setBusy(true); setError(null); setMessage(null);
    try {
      await api.proposeRecoveryPolicy({ ...draft, rationale: "Operator proposed cart recovery terms from the portal" });
      setMessage("Queued for approval — approve it in the queue on the right to put it in force.");
      await refreshChanges();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not queue the policy");
    } finally { setBusy(false); }
  };
  const forget = async (id: string) => {
    try { await api.portalMemoryDelete(id); setFacts(f => f.filter(x => x.id !== id)); } catch { /* shown on reload */ }
  };

  const stats = view?.stats;
  return (
    <div role="dialog" aria-modal="true" aria-label="Recovery and lessons"
      className="absolute inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <div className="slide-in-right h-full w-full max-w-[460px] overflow-y-auto bg-white p-5 shadow-[-8px_0_28px_#00000014]"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-accent">Store memory</p>
            <h2 className="text-lg font-semibold mt-1">Cart recovery &amp; lessons</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md border border-border px-2 py-0.5 text-ink-muted hover:text-ink">×</button>
        </div>
        {error && <p role="alert" className="text-sm text-danger mt-3">{error}</p>}

        <section className="mt-5">
          <h3 className="text-sm font-semibold">Last {stats?.window_days ?? 30} days</h3>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Stat label="Offers sent" value={stats ? `${stats.offers_issued}` : "…"} hint={stats ? `${stats.coupons} coupons · ${stats.reminders} reminders` : ""} />
            <Stat label="Redeemed" value={stats ? `${Math.round(stats.redemption_rate * 100)}%` : "…"} hint={stats ? `${stats.offers_redeemed} orders` : ""} />
            <Stat label="Recovered revenue" value={stats ? formatMinor(stats.recovered_revenue_minor) : "…"} hint="paid orders only" />
            <Stat label="Discount given" value={stats ? formatMinor(stats.discount_given_minor) : "…"} hint="" />
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-semibold">Recovery policy</h3>
          <p className="text-xs text-ink-muted mt-1">
            {view?.active ? "A policy is in force. Changing it queues a new one for approval." :
              "No policy in force, so no offers are sent. Propose one below."}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {FIELDS.map(({ key, label, rupees, suffix }) => (
              <label key={key} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink-muted">{label}</span>
                <span className="flex items-center gap-1.5">
                  {rupees && <span className="text-ink-faint">₹</span>}
                  <input type="number" min={0}
                    value={rupees ? Math.round(draft[key] / 100) : draft[key]}
                    onChange={e => {
                      const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
                      setDraft(d => ({ ...d, [key]: rupees ? n * 100 : n }));
                    }}
                    className="w-24 border border-border rounded-md px-2 py-1 text-right" />
                  {suffix && <span className="text-ink-faint w-10">{suffix}</span>}
                </span>
              </label>
            ))}
          </div>
          <p className="text-[11px] text-ink-faint mt-2">
            Bounds: at most {view?.bounds.max_percentage ?? 20}% off, a cap of at most {formatMinor(view?.bounds.max_discount_minor ?? 200000)}, one offer per customer every {view?.bounds.min_cooldown_days ?? 7}+ days.
            Shoppers who usually buy at full price get a reminder instead of a discount.
          </p>
          <button disabled={busy} onClick={propose}
            className="mt-3 w-full rounded-md bg-accent text-white py-2 text-sm hover:bg-accent-hover disabled:opacity-50">
            {busy ? "Queuing…" : "Queue for approval"}
          </button>
          {message && <p role="status" className="text-xs text-success-ink mt-2">{message}</p>}
        </section>

        <section className="mt-7">
          <h3 className="text-sm font-semibold">What the assistant has learned</h3>
          <p className="text-xs text-ink-muted mt-1">
            Counted from your approve/reject decisions and their reasons. The assistant uses these to shape proposals; they never approve anything.
          </p>
          {facts.length === 0 ? (
            <p className="text-sm text-ink-faint mt-3">Nothing yet — decide a few proposals (with a reason) and lessons appear here.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {facts.map(f => (
                <li key={f.id} className="rounded-lg border border-border-soft px-3 py-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-[11px] text-ink-muted">{f.key.replace(/^(lesson|outcome):/, "").replaceAll("_", " ")}</span>
                    <button onClick={() => forget(f.id)} className="text-[11px] text-danger underline">Forget</button>
                  </div>
                  <p className="text-[13px] mt-0.5">{f.value}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function pick(terms: RecoveryPolicyTerms): Partial<RecoveryPolicyTerms> {
  const out: Partial<RecoveryPolicyTerms> = {};
  for (const { key } of FIELDS) if (typeof terms[key] === "number") out[key] = terms[key];
  return out;
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-border-soft px-3 py-2">
      <p className="text-[11px] text-ink-muted">{label}</p>
      <p className="text-base font-semibold">{value}</p>
      {hint && <p className="text-[10.5px] text-ink-faint">{hint}</p>}
    </div>
  );
}
