"use client";
import { useEffect, useState } from "react";
import { api, RecoveryOfferView } from "@/lib/api";
import { formatMinor } from "@/lib/format";

/**
 * The on-site half of cart recovery. The offer was issued by the merchant's approved
 * policy; the discount applies itself at checkout from the stored terms, so there is
 * nothing to type and nothing here the browser could inflate.
 */
export default function OfferBanner({ onOpenCart, refreshKey }: { onOpenCart: () => void; refreshKey?: unknown }) {
  const [offer, setOffer] = useState<RecoveryOfferView | null>(null);

  useEffect(() => {
    let active = true;
    api.memoryOffer().then(r => { if (active) setOffer(r.offer); }).catch(() => {});
    return () => { active = false; };
  }, [refreshKey]);

  if (!offer) return null;
  const until = new Date(offer.expires_at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const item = offer.headline?.title ?? "your cart";

  return (
    <div role="status" className="rise-in mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-upsell-border bg-upsell-bg px-4 py-3">
      <div className="min-w-0 flex-1">
        {offer.kind === "coupon" ? (
          <>
            <p className="text-sm font-semibold text-upsell-ink">
              {offer.discount_percentage}% off {item}, just for you
            </p>
            <p className="text-xs text-ink-muted">
              Up to {formatMinor(offer.max_discount_minor ?? 0)} off · applied automatically at checkout
              {offer.code ? ` · code ${offer.code}` : ""} · until {until}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-upsell-ink">Still thinking about {item}?</p>
            <p className="text-xs text-ink-muted">Your cart is saved and ready when you are.</p>
          </>
        )}
      </div>
      <button onClick={onOpenCart} className="flex-none rounded-lg bg-ink text-white px-3.5 py-2 text-sm">
        Go to cart
      </button>
    </div>
  );
}
