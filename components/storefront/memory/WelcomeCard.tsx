"use client";
import { useEffect, useState } from "react";
import { api, WelcomeCard as WelcomeCardData } from "@/lib/api";
import { formatMinor } from "@/lib/format";

const SEEN_KEY = "cartisan.welcome_seen";

/**
 * Shown once per visit to a returning shopper. Prices and stock on it are read live
 * by the server when the card is built; memory only decides what is worth mentioning.
 */
export default function WelcomeCard({
  onSelect, onOpenCart,
}: {
  onSelect: (variantId: string) => void;
  onOpenCart: () => void;
}) {
  const [card, setCard] = useState<WelcomeCardData | null>(null);

  useEffect(() => {
    let seen = false;
    try { seen = window.sessionStorage.getItem(SEEN_KEY) === "1"; } catch { /* private mode */ }
    if (seen) return;
    let active = true;
    api.memoryWelcome().then(result => { if (active) setCard(result.card); }).catch(() => {});
    return () => { active = false; };
  }, []);

  if (!card) return null;

  const dismiss = () => {
    try { window.sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* private mode */ }
    setCard(null);
  };
  const go = (variantId: string) => { dismiss(); onSelect(variantId); };

  return (
    <section aria-label="Welcome back" className="rise-in relative mb-5 rounded-2xl border border-accent/30 bg-white p-4 sm:p-5">
      <button onClick={dismiss} aria-label="Dismiss" className="absolute right-3 top-3 text-ink-muted hover:text-ink">×</button>
      <p className="text-xs uppercase tracking-widest text-accent">Welcome back</p>
      <h2 className="font-semibold mt-1">Pick up where you left off</h2>
      {card.devices.length > 0 && (
        <p className="text-xs text-ink-muted mt-1">Shopping for your {card.devices.join(", ")}.</p>
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        {card.cart_line_count > 0 && (
          <button onClick={() => { dismiss(); onOpenCart(); }}
            className="text-sm rounded-full bg-ink text-white px-3 py-1.5">
            Your cart ({card.cart_line_count}) is still here →
          </button>
        )}
        {card.still_interested.map(item => (
          <button key={item.variant_id} onClick={() => go(item.variant_id)}
            className="text-sm rounded-full border border-border px-3 py-1.5 hover:border-accent">
            Still thinking about {item.title}? · {formatMinor(item.price_minor)}
            {!item.in_stock && <span className="text-danger"> · out of stock</span>}
          </button>
        ))}
        {card.picks.map(item => (
          <button key={item.variant_id} onClick={() => { void api.memoryEvent("suggestion_click", item.variant_id); go(item.variant_id); }}
            className="text-sm rounded-full border border-success-border bg-success-bg text-success-ink px-3 py-1.5 hover:border-accent">
            {item.title} · {formatMinor(item.price_minor)}
          </button>
        ))}
      </div>
    </section>
  );
}
