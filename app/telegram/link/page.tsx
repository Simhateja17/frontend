"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAppState } from "@/lib/store/AppState";
import SignInGate from "@/components/shared/SignInGate";

/**
 * Where a Telegram bot's "Link account" button lands.
 *
 * The token names a Telegram account; the Supabase session names the Cartisan one.
 * Linking is an explicit tap showing which account will be bound, never automatic:
 * anyone can send someone a link, and following it must not quietly hand the
 * sender's Telegram chat the reader's cart, orders or operator powers.
 */
export default function TelegramLinkPage() {
  // Reading the query string suspends during static export, so it sits under a boundary.
  return (
    <Suspense fallback={null}>
      <TelegramLink />
    </Suspense>
  );
}

function TelegramLink() {
  const { session } = useAppState();
  const query = useSearchParams();
  const params = { token: query.get("token") ?? "", bot: query.get("bot") ?? "shopping" };
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function link() {
    if (!params.token) return;
    setState("busy");
    try {
      await api.linkTelegram(params.token);
      setState("done");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Linking failed.");
    }
  }

  const botName = params.bot === "merchant" ? "merchant assistant" : "shopping assistant";

  return (
    <SignInGate>
      <div className="h-full grid place-items-center px-6">
        <div className="w-full max-w-[420px] flex flex-col gap-4 bg-white border border-border-soft rounded-lg p-6">
          <h1 className="m-0 text-[20px] font-semibold tracking-tight">Link Telegram</h1>
          {!params.token ? (
            <p className="m-0 text-[14px] text-ink-muted">
              This link is missing its token. Send /link to the bot for a new one.
            </p>
          ) : state === "done" ? (
            <p className="m-0 text-[14px] text-ink-muted">
              Linked. Head back to Telegram — the {botName} will confirm in a moment.
            </p>
          ) : (
            <>
              <p className="m-0 text-[14px] text-ink-muted leading-relaxed">
                Link the Cartisan {botName} on Telegram to{" "}
                <span className="font-medium text-ink">{session?.user.email}</span>? That chat
                will act as this account. Only continue if you asked the bot for this link.
              </p>
              <button
                onClick={link}
                disabled={state === "busy"}
                className="h-10 rounded-md bg-accent text-white text-[14px] font-medium disabled:opacity-60"
              >
                {state === "busy" ? "Linking…" : "Link this account"}
              </button>
              {state === "error" && <p className="m-0 text-[13px] text-red-600">{message}</p>}
            </>
          )}
        </div>
      </div>
    </SignInGate>
  );
}
