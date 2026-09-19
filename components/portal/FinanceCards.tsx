"use client";

import { useState } from "react";
import { formatMinor } from "@/lib/format";
import type { PaymentHealthPayload, RestockFinancingPayload } from "@/lib/types";

/**
 * Cards for the two Paytm money reads. The tool emits them from the same record the
 * model reads, so the picture and the agent's sentence cannot disagree.
 */

const STATUS_ROWS: { key: string; label: string; tone: string }[] = [
  { key: "paid", label: "Verified by Paytm", tone: "bg-accent" },
  { key: "payment_verification_pending", label: "Awaiting verification", tone: "bg-accent/40" },
  { key: "pending_payment", label: "Not paid yet", tone: "bg-amber-400" },
  { key: "cancelled", label: "Cancelled", tone: "bg-danger/70" },
  { key: "expired", label: "Expired", tone: "bg-ink-faint" },
];

function Footer({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[9.5px] text-ink-faint tracking-wide pt-2 border-t border-border-soft">
      {children}
    </span>
  );
}

export function PaymentHealthCard({ p }: { p: PaymentHealthPayload }) {
  const [hover, setHover] = useState<number | null>(null);
  const peak = Math.max(1, ...p.daily_collections.map((d) => d.amount_minor));
  const statuses = STATUS_ROWS.filter((row) => p.orders_by_status[row.key]);
  const total = statuses.reduce((sum, row) => sum + p.orders_by_status[row.key].amount_minor, 0) || 1;
  const failed = p.failed_attempts.reduce((sum, f) => sum + f.attempts, 0);
  const hovered = hover !== null ? p.daily_collections[hover] : null;

  return (
    <section className="ml-9">
      <div className="bg-white border border-border rounded-xl p-4 flex flex-col gap-4">
        <div className="flex justify-between items-baseline gap-3">
          <span className="text-[13.5px] font-medium">Paytm payment health · last {p.window_days} days</span>
          <span className="font-mono text-[9.5px] tracking-wide text-ink-faint border border-border rounded px-1.5 py-0.5">MEASURED</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Collected (verified)" value={p.verified_collections} sub={`${p.paid_orders} orders`} />
          <Stat label="Waiting" value={p.awaiting_verification} sub="not revenue yet" tone="text-amber-700" />
          <Stat label="Stuck > 15 min" value={String(p.stuck_orders.length)} sub="orders" tone={p.stuck_orders.length ? "text-amber-700" : undefined} />
          <Stat label="Failed attempts" value={String(failed)} sub={p.failed_attempts[0]?.reason.replaceAll("_", " ") ?? "none"} tone={failed ? "text-danger" : undefined} />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-ink-faint">Verified collections per day</span>
          <div className="relative">
            {hovered && (
              <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full z-10 whitespace-nowrap bg-ink text-white text-[11px] rounded-md px-2 py-1">
                {formatMinor(hovered.amount_minor)} · {hovered.date}
              </div>
            )}
            <div className="flex items-end gap-1 h-[56px]" role="img" aria-label="Verified collections per day"
              onMouseLeave={() => setHover(null)}>
              {p.daily_collections.map((d, i) => (
                <div key={d.date} tabIndex={0} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)}
                  className={`flex-1 rounded-t-sm min-w-[3px] cursor-pointer ${hover === i ? "bg-accent/70" : "bg-accent/30"}`}
                  style={{ height: `${Math.max(3, (d.amount_minor / peak) * 100)}%` }} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-ink-faint">Where the money is, by order value</span>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-bg">
            {statuses.map((row) => (
              <div key={row.key} className={row.tone}
                style={{ width: `${(p.orders_by_status[row.key].amount_minor / total) * 100}%` }}
                title={`${row.label}: ${formatMinor(p.orders_by_status[row.key].amount_minor)}`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-muted">
            {statuses.map((row) => (
              <span key={row.key} className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-sm ${row.tone}`} aria-hidden />
                {row.label} · {formatMinor(p.orders_by_status[row.key].amount_minor)} ({p.orders_by_status[row.key].orders})
              </span>
            ))}
          </div>
        </div>

        {p.stuck_orders.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-ink-faint">Stuck orders</span>
            {p.stuck_orders.map((o) => (
              <div key={o.order_id} className="flex justify-between text-[12px] tabular-nums">
                <span className="font-mono text-ink-muted">{o.order_id}</span>
                <span>{o.amount}</span>
                <span className="text-ink-faint">since {o.since.slice(0, 10)}</span>
              </div>
            ))}
          </div>
        )}

        <Footer>ONLY PAYTM-VERIFIED PAYMENTS COUNT AS COLLECTED</Footer>
      </div>
    </section>
  );
}

export function RestockFinancingCard({ p }: { p: RestockFinancingPayload }) {
  const cost = p.restock_cost_minor;
  const cash = p.cash_last_7_days_minor;
  const scale = Math.max(cost, cash, 1);
  const covered = p.shortfall_minor === 0;

  return (
    <section className="ml-9">
      <div className="bg-white border border-border rounded-xl p-4 flex flex-col gap-4">
        <div className="flex justify-between items-baseline gap-3">
          <span className="text-[13.5px] font-medium">
            Can you afford the restock? · {p.horizon_days} days at {p.demand_multiplier}× demand
          </span>
          <span className="font-mono text-[9.5px] tracking-wide text-accent border border-accent/40 rounded px-1.5 py-0.5">ESTIMATED</span>
        </div>

        <div className="flex flex-col gap-2">
          <Bar label="Restock cost (est.)" value={p.restock_cost_estimate} pct={cost / scale} tone="bg-amber-400" />
          <Bar label="Paytm collections, last 7 days" value={p.cash_last_7_days} pct={cash / scale} tone="bg-accent" />
        </div>

        <div className={`rounded-lg px-3 py-2.5 text-[13px] ${covered ? "bg-success-bg text-success-ink" : "bg-danger-bg text-danger"}`}>
          {covered
            ? "Covered: collections pay for this restock. No loan needed."
            : <>Shortfall of <b className="tabular-nums">{p.shortfall}</b></>}
        </div>

        {p.loan && (
          <div className="rounded-lg border border-accent/40 p-3 flex flex-col gap-1.5">
            <span className="text-[11px] text-ink-faint">Paytm merchant loan offer</span>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[20px] font-semibold tabular-nums">{p.loan.suggested_amount}</span>
              <span className="text-[12.5px] text-ink-muted">about {p.loan.monthly_repayment_at_6_months}/month over 6 months</span>
            </div>
            <span className="text-[11.5px] text-ink-muted">Eligible up to {p.loan.eligible_limit} (est.) · ask the agent to request it, then approve it in the queue</span>
          </div>
        )}

        {p.restock_lines.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-ink-faint">What the restock covers</span>
            {p.restock_lines.map((line) => (
              <div key={line.variant_id} className="grid grid-cols-[1fr_auto_auto] gap-3 text-[12px] tabular-nums">
                <span className="truncate">{line.title}</span>
                <span className="text-ink-muted">+{line.units_to_order} units</span>
                <span>{formatMinor(line.cost_minor)}</span>
              </div>
            ))}
          </div>
        )}

        <Footer>COST AT 60% OF SELLING PRICE · LIMIT ILLUSTRATIVE, NOT PAYTM UNDERWRITING</Footer>
      </div>
    </section>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-ink-faint">{label}</span>
      <span className={`text-[18px] font-semibold tabular-nums leading-tight ${tone ?? ""}`}>{value}</span>
      <span className="text-[11px] text-ink-muted">{sub}</span>
    </div>
  );
}

function Bar({ label, value, pct, tone }: { label: string; value: string; pct: number; tone: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[12px]">
        <span className="text-ink-muted">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <div className="h-2.5 rounded-full bg-bg overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(2, pct * 100)}%` }} />
      </div>
    </div>
  );
}
