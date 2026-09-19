"use client";
import { useCallback, useEffect, useState } from "react";
import { api, MemoryPanel as MemoryPanelData } from "@/lib/api";
import { formatMinor } from "@/lib/format";

const FACT_LABELS: Record<string, string> = {
  device_owned: "Device you own",
  brand_affinity: "Brand preference",
  budget: "Budget",
  use_case: "What you use things for",
  gift_context: "Gift you're shopping for",
  rejected_item: "Not for you",
  current_project: "Current project",
};

/**
 * "What Cartisan remembers" — every item, why it is there, and a way to delete it.
 * Deleting everything also deletes the shopper's Cognee dataset (queued server-side).
 */
export default function MemoryPanel({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<MemoryPanelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingForget, setConfirmingForget] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.memoryPanel().then(d => { setData(d); setError(null); })
      .catch(e => setError(e instanceof Error ? e.message : "Could not load your memory"));
  }, []);
  useEffect(() => { load(); }, [load]);

  const removeFact = async (id: string) => {
    setBusy(true);
    try { await api.memoryDeleteFact(id); load(); } catch { setError("Could not delete that item"); }
    finally { setBusy(false); }
  };
  const forgetAll = async () => {
    setBusy(true);
    try { await api.memoryForgetEverything(); setConfirmingForget(false); load(); }
    catch { setError("Could not delete your memory"); }
    finally { setBusy(false); }
  };

  const interests = data?.interests;
  const empty = data && !data.facts.length && !data.explored.length && !interests?.top_categories.length;

  return (
    <div role="dialog" aria-modal="true" aria-label="What Cartisan remembers"
      className="absolute inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <div className="slide-in-right h-full w-full max-w-[420px] overflow-y-auto bg-white p-5 shadow-[-8px_0_28px_#00000014]"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-accent">Your memory</p>
            <h2 className="text-lg font-semibold mt-1">What Cartisan remembers</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md border border-border px-2 py-0.5 text-ink-muted hover:text-ink">×</button>
        </div>
        {data && <p className="text-xs text-ink-muted mt-2 leading-relaxed">{data.notice}</p>}
        {error && <p role="alert" className="text-sm text-danger mt-3">{error}</p>}
        {!data && !error && <p role="status" className="text-sm mt-4">Loading…</p>}
        {empty && <p className="text-sm text-ink-muted mt-5">Nothing yet. As you browse and chat, what helps personalise your shopping will appear here.</p>}

        {data && data.facts.length > 0 && (
          <section className="mt-5">
            <h3 className="text-sm font-semibold mb-2">Things you told the assistant</h3>
            <ul className="flex flex-col gap-2">
              {data.facts.map(fact => (
                <li key={fact.id} className="flex items-start justify-between gap-3 rounded-lg border border-border-soft px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-ink-muted">
                      {FACT_LABELS[fact.type] ?? fact.type}
                      {fact.key.includes(":") && ` · ${fact.key.split(":")[1].replaceAll("_", " ")}`}
                    </p>
                    <p className="text-sm">{fact.value}</p>
                    <p className="text-[10.5px] text-ink-faint mt-0.5">
                      From a chat{fact.since ? ` on ${new Date(fact.since).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <button disabled={busy} onClick={() => removeFact(fact.id)}
                    className="flex-none text-xs text-danger underline disabled:opacity-50">Delete</button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {interests && (interests.top_categories.length > 0 || interests.liked_brands.length > 0) && (
          <section className="mt-5">
            <h3 className="text-sm font-semibold mb-2">What you&apos;ve been browsing</h3>
            <dl className="text-sm flex flex-col gap-1.5">
              {interests.top_categories.length > 0 && <Row label="Categories" value={interests.top_categories.join(", ")} />}
              {interests.liked_brands.length > 0 && <Row label="Brands" value={interests.liked_brands.join(", ")} />}
              {interests.avoided_brands.length > 0 && <Row label="Moved away from" value={interests.avoided_brands.join(", ")} />}
              {interests.price_band_minor && (
                <Row label="Price range" value={`${formatMinor(interests.price_band_minor[0])} – ${formatMinor(interests.price_band_minor[1])}`} />
              )}
            </dl>
          </section>
        )}

        {data && data.explored.length > 0 && (
          <section className="mt-5">
            <h3 className="text-sm font-semibold mb-2">Recently explored</h3>
            <ul className="text-sm flex flex-col gap-1">
              {data.explored.map(item => (
                <li key={item.variant_id} className="flex justify-between gap-3">
                  <span className="truncate">{item.title}</span>
                  <span className="flex-none text-[11px] text-ink-faint">{describeSignals(item.signals)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {data && data.notes.length > 0 && (
          <section className="mt-5">
            <h3 className="text-sm font-semibold mb-2">Memory notes</h3>
            <ul className="text-[13px] text-ink-muted list-disc pl-4 flex flex-col gap-1">
              {data.notes.map((note, i) => <li key={i}>{note}</li>)}
            </ul>
          </section>
        )}

        {data && !empty && (
          <div className="mt-7 border-t border-border-soft pt-4">
            {confirmingForget ? (
              <div className="rounded-lg border border-danger-border bg-danger-bg p-3">
                <p className="text-sm">Delete everything Cartisan remembers about you? This can&apos;t be undone.</p>
                <div className="flex gap-2 mt-3">
                  <button disabled={busy} onClick={forgetAll} className="rounded-md bg-danger text-white px-3 py-1.5 text-sm disabled:opacity-50">Delete everything</button>
                  <button onClick={() => setConfirmingForget(false)} className="rounded-md border border-border px-3 py-1.5 text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmingForget(true)} className="text-sm text-danger underline">Forget everything about me</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><dt className="text-ink-muted">{label}</dt><dd className="text-right">{value}</dd></div>;
}

function describeSignals(signals: string[]): string {
  if (signals.includes("purchase")) return "bought";
  if (signals.includes("add_to_cart")) return "added to cart";
  if (signals.includes("suggestion_click")) return "opened a suggestion";
  return "viewed";
}
