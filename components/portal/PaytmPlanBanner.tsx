import type { PaytmPlan } from "@/lib/role-surface";

const POS_UNLOCKS = ["Stock alerts & restocks", "Product-level sales", "Pricing & listing changes"];

/** Which Paytm products feed the agent. A payments-only merchant sees what Paytm POS
 * would add; the backend refuses those tools either way. */
export default function PaytmPlanBanner({ plan }: { plan: PaytmPlan }) {
  if (plan === "pos") {
    return (
      <div className="flex items-center gap-2 text-[12px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          Paytm POS connected · catalogue, stock &amp; payments
        </span>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-white px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[12px] text-ink-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
        Paytm payments only · QR &amp; Soundbox
      </div>
      <p className="m-0 text-[13.5px] text-ink leading-relaxed">
        I can read your collections, settlements, orders and customers. Paytm payments don&apos;t
        include what was sold, so stock features are locked.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {POS_UNLOCKS.map((item) => (
          <span key={item} className="rounded-full bg-bg px-2.5 py-1 text-[12px] text-ink-muted">
            🔒 {item}
          </span>
        ))}
        <a href="https://business.paytm.com/pos-billing-software" target="_blank" rel="noreferrer"
          className="ml-auto rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-medium text-white hover:opacity-90">
          Unlock with Paytm POS
        </a>
      </div>
    </div>
  );
}
