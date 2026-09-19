"use client";
import { useEffect, useState } from "react";
import { api, MemorySuggestion } from "@/lib/api";
import { formatMinor } from "@/lib/format";

/**
 * "Picked for you" — catalogue rows the shopper's memory steered. Every card is a live,
 * in-stock variant priced by the server; the reason chip is computed from memory, not
 * written by a model. With no history the row simply is not there.
 */
export default function ForYouRow({
  title, onSelect, refreshKey, limit = 8,
}: {
  title: string;
  onSelect: (variantId: string) => void;
  refreshKey?: unknown;
  limit?: number;
}) {
  const [items, setItems] = useState<MemorySuggestion[]>([]);

  useEffect(() => {
    let active = true;
    api.memorySuggestions(limit)
      .then(result => { if (active) setItems(result.items); })
      .catch(() => { if (active) setItems([]); });
    return () => { active = false; };
  }, [refreshKey, limit]);

  if (!items.length) return null;

  const open = (item: MemorySuggestion) => {
    void api.memoryEvent("suggestion_click", item.variant_id);
    onSelect(item.variant_id);
  };
  const dismiss = (item: MemorySuggestion) => {
    void api.memoryEvent("rejected_recommendation", item.variant_id);
    setItems(current => current.filter(i => i.variant_id !== item.variant_id));
  };

  return (
    <section aria-label={title} className="my-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-[11px] text-ink-faint">Based on what you explored</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {items.map(item => (
          <div key={item.variant_id}
            className="relative snap-start flex-none w-[200px] rounded-xl border border-border-soft bg-white overflow-hidden hover:border-accent transition-colors">
            <button onClick={() => dismiss(item)} aria-label={`Not interested in ${item.title}`}
              title="Not interested"
              className="absolute right-1.5 top-1.5 z-10 rounded-full bg-white/90 border border-border w-6 h-6 text-[12px] text-ink-muted hover:text-ink">
              ×
            </button>
            <button onClick={() => open(item)} className="block w-full text-left">
              <div className="p-3 pr-8">
                {item.reason && (
                  <p className="inline-block text-[10.5px] leading-snug rounded-full bg-success-bg border border-success-border text-success-ink px-2 py-0.5 mb-1.5">
                    {item.reason}
                  </p>
                )}
                <p className="text-[11px] text-ink-muted">{item.brand}</p>
                <h3 className="text-sm font-medium leading-snug line-clamp-2">{item.title}</h3>
                <p className="font-semibold mt-1 text-sm">{formatMinor(item.price_minor)}</p>
              </div>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
