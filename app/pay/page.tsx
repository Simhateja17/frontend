"use client";

import { Suspense, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { Baloo_2, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { api, type SimulatedPayment, type SimulatedPaymentMethod } from "@/lib/api";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });
const baloo = Baloo_2({ subsets: ["latin"], weight: ["700", "800"] });
const MONO = "var(--font-jetbrains-mono), monospace";

/**
 * The simulated Paytm payment gateway's hosted checkout page.
 *
 * The storefront's "Pay" button opens this page in a new tab, the way it used to
 * open Razorpay's. Nothing here decides that an order is paid: pressing pay sends
 * the chosen method and outcome to the backend, which turns it into a provider
 * event and settles the order through the webhook processor. The storefront tab
 * notices on its own. No real money moves and no card details leave this page.
 */
export default function PayPage() {
  // Reading the query string suspends during static export, so it sits under a boundary.
  return (
    <Suspense fallback={null}>
      <SimulatedGateway />
    </Suspense>
  );
}

const C = {
  bg: "#F5F6F7",
  ink: "#0F1729",
  ink2: "#344054",
  muted: "#667085",
  faint: "#98A2B3",
  line: "#E6E8EB",
  line2: "#EEF0F2",
  blue: "#0058BA",
  navy: "#06337A",
  tint: "#EAF1FB",
  green: "#10B981",
  red: "#B42318",
};

const METHODS: { id: SimulatedPaymentMethod; label: string; sub: string }[] = [
  { id: "upi", label: "UPI / QR code", sub: "Scan or pay with a UPI ID" },
  { id: "wallet", label: "Paytm Wallet", sub: "Pay with your saved balance" },
  { id: "credit", label: "Credit card", sub: "Visa, Mastercard, Amex, RuPay" },
  { id: "debit", label: "Debit card", sub: "All Indian banks supported" },
  { id: "net", label: "Net banking", sub: "58 banks available" },
];

const BANKS = [
  "HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra",
  "Punjab National Bank", "Bank of Baroda", "IndusInd Bank", "Yes Bank",
];

const eyebrow: CSSProperties = {
  fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: C.muted, fontWeight: 600,
};
const card: CSSProperties = {
  background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, boxShadow: "0 1px 2px rgba(15,23,41,.04)",
};
const input: CSSProperties = {
  height: 44, border: `1px solid ${C.line}`, borderRadius: 9, padding: "0 13px",
  fontSize: 13.5, color: C.ink, background: "#fff", outline: "none", fontFamily: "inherit",
};
const primary: CSSProperties = {
  height: 46, padding: "0 30px", borderRadius: 9, border: "none",
  background: `linear-gradient(135deg,${C.blue},${C.navy})`, color: "#fff", fontSize: 14, fontWeight: 600,
  display: "inline-flex", alignItems: "center", boxShadow: "0 6px 16px rgba(0,88,186,.28)", cursor: "pointer",
  fontFamily: "inherit",
};
const title: CSSProperties = { fontSize: 15, fontWeight: 600, letterSpacing: "-.02em" };
const sub: CSSProperties = { fontSize: 12.5, color: C.muted, marginTop: 4 };

function rupees(minor: number): string {
  return "₹" + (minor / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function brand(n: string): string {
  const d = n.replace(/\D/g, "");
  if (/^4/.test(d)) return "VISA";
  if (/^5[1-5]/.test(d)) return "MASTERCARD";
  if (/^(60|65|81|82)/.test(d)) return "RUPAY";
  if (/^3[47]/.test(d)) return "AMEX";
  return "CARD";
}

/** A decorative QR: three finder squares and a pattern seeded from the link id. */
function FakeQr({ seed }: { seed: string }) {
  const size = 25;
  const salt = [...seed].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7);
  const on = (r: number, c: number) => {
    const fin = (br: number, bc: number) =>
      r >= br && r < br + 7 && c >= bc && c < bc + 7 &&
      (r === br || r === br + 6 || c === bc || c === bc + 6 || (r >= br + 2 && r <= br + 4 && c >= bc + 2 && c <= bc + 4));
    const box = (br: number, bc: number) => r >= br - 1 && r <= br + 7 && c >= bc - 1 && c <= bc + 7;
    if (box(0, 0) || box(0, size - 7) || box(size - 7, 0)) return fin(0, 0) || fin(0, size - 7) || fin(size - 7, 0);
    const h = (r * 73856093) ^ (c * 19349663) ^ (r * c * 83492791) ^ salt;
    return ((h >>> 3) & 7) > 3;
  };
  const cells = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) cells.push(<div key={`${r}-${c}`} style={{ background: on(r, c) ? C.ink : "transparent" }} />);
  return (
    <div style={{ width: 196, height: 196, display: "grid", gridTemplateColumns: `repeat(${size},1fr)`, gridTemplateRows: `repeat(${size},1fr)` }}>
      {cells}
    </div>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span style={{
      width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${on ? C.blue : "#D0D5DD"}`,
      background: on ? C.blue : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none",
    }}>
      {on && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
    </span>
  );
}

type Result = { kind: "paid" | "failed" | "settled"; message: string };

function SimulatedGateway() {
  const linkId = useSearchParams().get("link") ?? "";
  const [payment, setPayment] = useState<SimulatedPayment | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [method, setMethod] = useState<SimulatedPaymentMethod>("upi");
  const [secs, setSecs] = useState(600);
  const [vpa, setVpa] = useState("");
  const [mobile, setMobile] = useState("");
  const [remember, setRemember] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [saveCard, setSaveCard] = useState(false);
  const [bank, setBank] = useState(BANKS[0]);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!linkId) {
      setLoadError("This payment link is missing its id.");
      return;
    }
    api.simulatedPayment(linkId).then(
      (p) => {
        setPayment(p);
        if (p.status === "succeeded") setResult({ kind: "settled", message: "This order has already been paid." });
        else if (p.status !== "created" && p.status !== "pending")
          setResult({ kind: "settled", message: `This payment link is no longer active (${p.status}).` });
      },
      (e: Error) => setLoadError(e.message),
    );
  }, [linkId]);

  useEffect(() => {
    const t = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const amountText = payment ? rupees(payment.amount_minor) : "—";
  const isCard = method === "credit" || method === "debit";

  const validate = (): string | null => {
    if (method === "upi" && !/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(vpa.trim())) return "Enter a valid UPI ID, like yourname@bank.";
    if (method === "wallet" && mobile.length !== 10) return "Enter your 10-digit mobile number.";
    if (isCard) {
      if (cardNumber.replace(/\s/g, "").length < 15) return "Enter a valid card number.";
      if (!cardName.trim()) return "Enter the name on the card.";
      const [mm, yy] = expiry.split(" / ");
      if (!mm || !yy || +mm < 1 || +mm > 12 || yy.length !== 2) return "Enter the expiry as MM / YY.";
      if (cvv.length < 3) return "Enter the CVV.";
    }
    return null;
  };

  const submit = async (outcome: "success" | "failure") => {
    if (!payment || busy) return;
    if (outcome === "success") {
      const problem = validate();
      setFormError(problem);
      if (problem) return;
    }
    setBusy(true);
    try {
      const res = await api.submitSimulatedPayment(payment.link_id, method, outcome);
      if (res.result === "already_settled") setResult({ kind: "settled", message: "This payment link has already been used." });
      else if (outcome === "success") setResult({ kind: "paid", message: `${amountText} paid to ${payment.merchant}.` });
      else setResult({ kind: "failed", message: "The payment did not go through. No money was taken." });
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const methodRows = useMemo(
    () =>
      METHODS.map((m) => {
        const a = m.id === method;
        return (
          <div
            key={m.id}
            onClick={() => { setMethod(m.id); setFormError(null); }}
            style={{
              display: "flex", alignItems: "flex-start", gap: 11, padding: "13px 18px", cursor: "pointer",
              borderLeft: `3px solid ${a ? C.blue : "transparent"}`, background: a ? "#fff" : "transparent",
              color: a ? C.ink : C.ink2,
            }}
          >
            <span style={{
              width: 18, height: 18, borderRadius: 20, border: `1.5px solid ${a ? C.blue : "#D0D5DD"}`,
              display: "flex", alignItems: "center", justifyContent: "center", flex: "none", marginTop: 1,
            }}>
              {a && <span style={{ width: 8, height: 8, borderRadius: 20, background: C.blue, display: "block" }} />}
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{m.label}</span>
              <span style={{ fontSize: 11.5, color: C.muted }}>{m.sub}</span>
            </span>
          </div>
        );
      }),
    [method],
  );

  return (
    <div className={jakarta.className} style={{ height: "100%", overflowY: "auto", background: C.bg, color: C.ink }}>
      <div style={{ minHeight: "100%", padding: "28px 16px 48px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div className={grotesk.className} style={{
                width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg,${C.navy},${C.blue} 60%,#6C9FFF)`,
                boxShadow: "0 6px 16px rgba(0,88,186,.28)", display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 700, fontSize: 15,
              }}>P</div>
              <div>
                <div className={baloo.className} style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.05, color: C.navy }}>
                  paytm <span style={{ fontSize: 13, fontWeight: 700, color: C.blue }}>simulator</span>
                </div>
                <div style={{ fontSize: 11.5, color: C.muted }}>Payment gateway · secure checkout</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: C.muted }}>
              <span style={{ width: 7, height: 7, borderRadius: 20, background: C.green, display: "inline-block" }} />
              <span>Test mode · no real money moves</span>
            </div>
          </header>

          {loadError ? (
            <div style={{ ...card, padding: 26 }}>
              <div className={grotesk.className} style={title}>We couldn&apos;t open this payment</div>
              <div style={sub}>{loadError}</div>
            </div>
          ) : (
            <>
              <div style={card}>
                <div style={{ padding: "13px 18px", borderBottom: `1px solid ${C.line2}`, display: "flex", alignItems: "center", gap: 8 }}>
                  <span onClick={() => window.close()} style={{ ...eyebrow, cursor: "pointer" }}>‹ Go back</span>
                </div>
                <div style={{ padding: 18, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
                  <div>
                    <div className={grotesk.className} style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-.025em" }}>
                      {payment ? `${payment.merchant} order` : "Loading…"}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                      Transaction ID: <span style={{ fontFamily: MONO, fontSize: 11.5 }}>{payment?.order_id ?? "—"}</span>
                    </div>
                    {payment?.customer && (
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                        Customer: <span style={{ fontFamily: MONO, fontSize: 11.5 }}>{payment.customer}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={eyebrow}>Amount to be paid</div>
                    <div style={{ fontFamily: MONO, fontSize: 27, fontWeight: 600, letterSpacing: "-.03em", marginTop: 5, fontVariantNumeric: "tabular-nums" }}>
                      {amountText}
                    </div>
                  </div>
                </div>
              </div>

              {result ? (
                <ResultCard result={result} />
              ) : (
                <div className="pay-grid" style={{ ...card, overflow: "hidden", display: "grid" }}>
                  <div className="pay-methods" style={{ background: "#FCFCFD", padding: "18px 0" }}>
                    <div style={{ ...eyebrow, padding: "0 18px 12px" }}>Select an option to pay</div>
                    {methodRows}
                  </div>

                  <div style={{ padding: 26, minHeight: 420 }}>
                    {method === "upi" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                        <div>
                          <div className={grotesk.className} style={title}>Pay instantly using QR code</div>
                          <div style={sub}>Scan with any UPI app — Paytm, GPay, PhonePe, BHIM.</div>
                        </div>
                        <div style={{ display: "flex", gap: 26, alignItems: "flex-start", flexWrap: "wrap" }}>
                          <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 13, background: "#fff" }}>
                            <FakeQr seed={linkId} />
                            <div style={{ fontSize: 11, color: C.faint, textAlign: "center", marginTop: 9 }}>Simulated QR</div>
                          </div>
                          <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 13 }}>
                            <div style={{ background: C.tint, borderRadius: 9, padding: 13 }}>
                              <div style={{ ...eyebrow, color: C.navy }}>QR expires in</div>
                              <div style={{ fontFamily: MONO, fontSize: 21, fontWeight: 600, color: C.navy, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                                {secs > 0 ? `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}` : "Expired"}
                              </div>
                            </div>
                            <div style={{ fontSize: 12.5, color: C.muted }}>Or enter your UPI ID and approve the request in your app.</div>
                            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                              <input value={vpa} onChange={(e) => setVpa(e.target.value)} placeholder="yourname@bank"
                                style={{ ...input, height: 40, flex: 1, minWidth: 170 }} />
                              <button onClick={() => submit("success")} disabled={busy} style={{ ...primary, height: 40, padding: "0 20px", fontSize: 13.5 }}>
                                {busy ? "Processing…" : "Verify & pay"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {method === "wallet" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 420 }}>
                        <div>
                          <div className={grotesk.className} style={title}>Pay from your Paytm Wallet</div>
                          <div style={sub}>Enter the mobile number registered with Paytm.</div>
                        </div>
                        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                          <input value={mobile} inputMode="numeric" placeholder="10-digit mobile number"
                            onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            style={{ ...input, fontFamily: MONO, fontSize: 14, flex: 1, minWidth: 190 }} />
                          <button onClick={() => submit("success")} disabled={busy} style={{ ...primary, height: 44, padding: "0 26px", fontSize: 13.5 }}>
                            {busy ? "Processing…" : "Proceed"}
                          </button>
                        </div>
                        <div onClick={() => setRemember((r) => !r)} style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
                          <Check on={remember} />
                          <span style={{ fontSize: 12.5, color: C.muted }}>Remember me on this device</span>
                        </div>
                      </div>
                    )}

                    {isCard && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 440 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 13 }}>
                          <div>
                            <div className={grotesk.className} style={title}>
                              {method === "credit" ? "Enter credit card details" : "Enter debit card details"}
                            </div>
                            <div style={sub}>Visa, Mastercard, RuPay and Amex accepted.</div>
                          </div>
                          <span style={{ fontFamily: MONO, fontSize: 11, color: C.blue, background: C.tint, padding: "5px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>
                            {brand(cardNumber)}
                          </span>
                        </div>
                        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <span style={eyebrow}>Card number</span>
                          <input value={cardNumber} inputMode="numeric" placeholder="0000 0000 0000 0000"
                            onChange={(e) => {
                              const d = e.target.value.replace(/\D/g, "").slice(0, 16);
                              setCardNumber(d.replace(/(.{4})/g, "$1 ").trim());
                            }}
                            style={{ ...input, fontFamily: MONO, fontSize: 14, letterSpacing: ".04em" }} />
                        </label>
                        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <span style={eyebrow}>Name on card</span>
                          <input value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="As printed on the card" style={input} />
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 13 }}>
                          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <span style={eyebrow}>Expiry date</span>
                            <input value={expiry} inputMode="numeric" placeholder="MM / YY"
                              onChange={(e) => {
                                const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                                setExpiry(d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d);
                              }}
                              style={{ ...input, fontFamily: MONO, fontSize: 14 }} />
                          </label>
                          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <span style={eyebrow}>CVV</span>
                            <input value={cvv} type="password" inputMode="numeric" placeholder="•••"
                              onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                              style={{ ...input, fontFamily: MONO, fontSize: 14, letterSpacing: ".14em" }} />
                          </label>
                        </div>
                        <div onClick={() => setSaveCard((s) => !s)} style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
                          <Check on={saveCard} />
                          <span style={{ fontSize: 12.5, color: C.muted }}>Securely save this card for faster checkout</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 4 }}>
                          <button onClick={() => submit("success")} disabled={busy} style={primary}>
                            {busy ? "Processing…" : `Pay ${amountText}`}
                          </button>
                          <span onClick={() => window.close()} style={{ fontSize: 12.5, color: C.muted, cursor: "pointer" }}>Cancel</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: C.faint }}>Simulated checkout — card details never leave this page.</div>
                      </div>
                    )}

                    {method === "net" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                        <div>
                          <div className={grotesk.className} style={title}>Select your bank</div>
                          <div style={sub}>In a live gateway you&apos;d be redirected to your bank&apos;s secure page.</div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 11 }}>
                          {BANKS.map((name) => {
                            const a = bank === name;
                            return (
                              <div key={name} onClick={() => setBank(name)} style={{
                                padding: 13, border: `1px solid ${a ? C.blue : C.line}`, background: a ? C.tint : "#fff",
                                borderRadius: 9, fontSize: 13, fontWeight: a ? 600 : 500, color: a ? C.navy : C.ink2, cursor: "pointer",
                              }}>{name}</div>
                            );
                          })}
                        </div>
                        <div>
                          <button onClick={() => submit("success")} disabled={busy} style={primary}>
                            {busy ? "Processing…" : `Pay ${amountText}`}
                          </button>
                        </div>
                      </div>
                    )}

                    {formError && (
                      <div style={{ marginTop: 18, background: "#FEF3F2", border: "1px solid #FECDCA", borderRadius: 9, padding: 13, fontSize: 12.5, color: C.red }}>
                        {formError}
                      </div>
                    )}

                    <div style={{ marginTop: 26, paddingTop: 16, borderTop: `1px dashed ${C.line}`, fontSize: 12, color: C.muted }}>
                      Demo control:{" "}
                      <span onClick={() => submit("failure")} style={{ color: C.red, cursor: "pointer", fontWeight: 600 }}>
                        simulate a failed payment
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap", padding: "0 4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.muted }}>
              <span style={{ color: C.green }}>✓</span>
              <span>Simulated Paytm gateway · for demonstration only</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 13, ...eyebrow, color: C.faint }}>
              <span>Visa</span><span>Mastercard</span><span>RuPay</span><span>Amex</span><span>UPI</span>
            </div>
          </footer>
        </div>
      </div>
      <style>{`
        .pay-grid { grid-template-columns: minmax(0,300px) minmax(0,1fr); }
        .pay-methods { border-right: 1px solid ${C.line2}; }
        .pay-grid input:focus { border-color: ${C.blue} !important; box-shadow: 0 0 0 3px ${C.tint}; }
        .pay-grid input::placeholder { color: ${C.faint}; }
        .pay-grid button:disabled { opacity: .7; cursor: default; }
        @media (max-width: 720px) {
          .pay-grid { grid-template-columns: minmax(0,1fr); }
          .pay-methods { border-right: none; border-bottom: 1px solid ${C.line2}; }
        }
      `}</style>
    </div>
  );
}

function ResultCard({ result }: { result: Result }) {
  const ok = result.kind === "paid";
  const failed = result.kind === "failed";
  return (
    <div style={{ ...card, padding: 32, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 }}>
      <div style={{
        width: 52, height: 52, borderRadius: 40, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24, color: "#fff", background: ok ? C.green : failed ? C.red : C.muted,
      }}>
        {ok ? "✓" : failed ? "✕" : "i"}
      </div>
      <div className={grotesk.className} style={{ fontSize: 19, fontWeight: 600 }}>
        {ok ? "Payment successful" : failed ? "Payment failed" : "Nothing to pay"}
      </div>
      <div style={{ fontSize: 13, color: C.muted }}>{result.message}</div>
      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6 }}>
        You can close this tab — the store updates on its own.
      </div>
      <button onClick={() => window.close()} style={{ ...primary, marginTop: 10 }}>Return to store</button>
    </div>
  );
}
