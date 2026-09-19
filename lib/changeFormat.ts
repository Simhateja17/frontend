import { formatMinor } from "@/lib/format";

/** How a staged merchant change reads on the approval surfaces: the queue and the
 * preview card in chat format the same documents the same way. */

const MONEY_KEYS = new Set(["amount_minor", "budget_minor", "min_subtotal_minor",
  "min_cart_minor", "max_discount_minor", "monthly_budget_minor", "eligible_limit_minor",
  "restock_cost_minor", "cash_last_7_days_minor", "monthly_repayment_estimate_minor"]);

const KIND_LABELS: Record<string, string> = {
  loan_request: "Paytm merchant loan",
  recovery_policy: "Cart recovery policy",
  inventory_action: "Restock",
};

export function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind.split("_").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
}

function fmtValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (MONEY_KEYS.has(key) && typeof value === "number") return formatMinor(value);
  if (key === "units" && typeof value === "number") return value > 0 ? `+${value}` : String(value);
  return String(value);
}

export function fmtSide(doc: Record<string, unknown>): string {
  const entries = Object.entries(doc);
  if (entries.length === 0) return "new";
  return entries.map(([k, v]) => `${k.replace(/_minor$/, "").replaceAll("_", " ")}: ${fmtValue(k, v)}`).join(", ");
}

export interface LoanTerms {
  amount: string;
  tenure: number;
  monthly: string;
  purpose: string;
  limit: string;
  restockCost: string;
  cash: string;
}

export function loanTerms(before: Record<string, unknown>, after: Record<string, unknown>): LoanTerms {
  const money = (v: unknown) => (typeof v === "number" ? formatMinor(v) : "—");
  return {
    amount: money(after.amount_minor),
    tenure: Number(after.tenure_months ?? 0),
    monthly: money(after.monthly_repayment_estimate_minor),
    purpose: String(after.purpose ?? ""),
    limit: money(before.eligible_limit_minor),
    restockCost: money(before.restock_cost_minor),
    cash: money(before.cash_last_7_days_minor),
  };
}
