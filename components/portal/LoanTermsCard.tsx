import { loanTerms } from "@/lib/changeFormat";

/** A staged Paytm merchant loan, read as terms rather than a before/after diff. */
export default function LoanTermsCard({ before, after }: {
  before: Record<string, unknown>; after: Record<string, unknown>;
}) {
  const t = loanTerms(before, after);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[18px] font-semibold tabular-nums">{t.amount}</span>
        <span className="text-[12.5px] text-ink-muted">
          over {t.tenure} months · about {t.monthly}/month
        </span>
      </div>
      <div className="text-[12px] text-ink-muted">{t.purpose}</div>
      <div className="grid grid-cols-3 gap-2 text-[11.5px]">
        <div><div className="text-ink-faint">Restock cost (est.)</div><div className="tabular-nums">{t.restockCost}</div></div>
        <div><div className="text-ink-faint">Paytm collections, 7d</div><div className="tabular-nums">{t.cash}</div></div>
        <div><div className="text-ink-faint">Eligible up to (est.)</div><div className="tabular-nums">{t.limit}</div></div>
      </div>
      <div className="text-[10.5px] text-ink-faint">
        Simulated: approving records the request for Paytm&apos;s lending partner. No money moves.
      </div>
    </div>
  );
}
