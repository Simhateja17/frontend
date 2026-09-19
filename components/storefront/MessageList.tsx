"use client";

import { useState } from "react";
import type { FeedbackReason } from "@/lib/api";
import { ChatMessage, RenderedComponent, ToolTrace } from "@/lib/types";
import AgentComponent from "./AgentComponent";
import Markdown from "./Markdown";

/**
 * The transcript, on both surfaces. The message shape and the tool trail are the same
 * whichever agent produced them; what differs is which components the surface knows
 * how to draw, so the renderer is a parameter rather than a branch in here.
 */
export default function MessageList({
  messages,
  renderComponent: Component = AgentComponent,
  onFeedback,
}: {
  messages: ChatMessage[];
  renderComponent?: (props: { component: RenderedComponent }) => React.ReactNode;
  /** When set, finished agent replies get 👍/👎; the storefront passes it, the portal does not. */
  onFeedback?: (rating: "up" | "down", reason?: FeedbackReason) => Promise<unknown>;
}) {
  return (
    <div className="flex flex-col gap-6">
      {messages.map((m) => (
        <div key={m.id} className="rise-in flex flex-col gap-3">
          {m.role === "user" && (
            <div className="self-end max-w-[78%] bg-ink text-bg px-4 py-2.5 rounded-2xl rounded-br-md text-[14.5px] leading-relaxed">
              {m.text}
            </div>
          )}

          {m.role === "agent" && (
            <div className="flex gap-2.5 items-start">
              <div className="flex-none w-[26px] h-[26px] rounded-md bg-accent text-white flex items-center justify-center font-mono text-[11px] mt-0.5">
                C
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                {m.tools && m.tools.length > 0 && <ToolTrail tools={m.tools} />}
                {m.text && (
                  <div className="text-[14.5px] leading-relaxed text-ink">
                    <Markdown text={m.text} />
                  </div>
                )}
                {m.typing && !m.text && (
                  <span className="text-[13px] text-ink-faint" aria-live="polite">
                    Thinking…
                  </span>
                )}
                {m.why && (
                  <div className="flex gap-2 items-start bg-white border border-border-soft rounded-lg px-2.5 py-2">
                    <span className="font-mono text-[9.5px] text-ink-faint tracking-wide flex-none mt-0.5">
                      WHY
                    </span>
                    <span className="text-[12.5px] text-[#5d5d58] leading-relaxed">{m.why}</span>
                  </div>
                )}
                {m.error && (
                  <div className="bg-danger-bg border border-danger-border rounded-lg px-2.5 py-2 text-[12.5px] text-[#5d5d58]">
                    {m.error}
                  </div>
                )}
                {onFeedback && !m.typing && !m.error && m.text && <Feedback onFeedback={onFeedback} />}
              </div>
            </div>
          )}

          {/* Components render in the order the agent emitted them, so the reading
              order on screen matches the order it decided to show things in. */}
          {m.components?.map((component, index) => (
            <Component key={`${m.id}-${index}`} component={component} />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * What the agent actually did this turn. A blocked call is shown, not hidden: a gate
 * holding a call is the system working, and it is the most informative thing on the
 * screen when the agent declines to do something.
 */
function ToolTrail({ tools }: { tools: ToolTrace[] }) {
  const mark: Record<ToolTrace["status"], string> = {
    running: "·",
    ok: "✓",
    error: "!",
    blocked: "⊘",
  };
  const tone: Record<ToolTrace["status"], string> = {
    running: "text-ink-faint",
    ok: "text-ink-faint",
    error: "text-danger",
    blocked: "text-danger",
  };

  return (
    <ul className="m-0 p-0 list-none flex flex-col gap-1">
      {tools.map((tool) => (
        <li key={tool.id} className="flex gap-1.5 items-baseline font-mono text-[10.5px]">
          <span className={tone[tool.status]}>{mark[tool.status]}</span>
          <span className="text-ink-faint">{tool.label ?? tool.tool}</span>
          {tool.status === "blocked" && tool.reason && (
            <span className="text-danger">held by {tool.reason}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

const DOWN_REASONS: { reason: FeedbackReason; label: string }[] = [
  { reason: "not_relevant", label: "Not relevant" },
  { reason: "wrong_info", label: "Wrong info" },
  { reason: "too_pushy", label: "Too pushy" },
];

/** A rating on one answer. It is joined to the turn's evidence server-side, and a 👎
 * reason becomes a memory signal, so the assistant learns what did not help. */
function Feedback({ onFeedback }: { onFeedback: (rating: "up" | "down", reason?: FeedbackReason) => Promise<unknown> }) {
  const [state, setState] = useState<"idle" | "asking" | "done">("idle");
  const send = (rating: "up" | "down", reason?: FeedbackReason) => {
    setState("done");
    void onFeedback(rating, reason).catch(() => {});
  };
  if (state === "done") return <span className="text-[11px] text-ink-faint">Thanks for the feedback</span>;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-faint">
      {state === "idle" ? (
        <>
          <button aria-label="Helpful" onClick={() => send("up", "helpful")} className="rounded px-1.5 py-0.5 hover:bg-surface-muted">👍</button>
          <button aria-label="Not helpful" onClick={() => setState("asking")} className="rounded px-1.5 py-0.5 hover:bg-surface-muted">👎</button>
        </>
      ) : (
        <>
          <span>What was wrong?</span>
          {DOWN_REASONS.map(({ reason, label }) => (
            <button key={reason} onClick={() => send("down", reason)}
              className="rounded-full border border-border px-2 py-0.5 hover:border-accent hover:text-accent">{label}</button>
          ))}
          <button onClick={() => send("down")} className="underline">Skip</button>
        </>
      )}
    </div>
  );
}
