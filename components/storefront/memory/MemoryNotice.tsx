"use client";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "cartisan.memory_notice_dismissed";

/** The plain-language notice that memory is on, with the way to manage it. */
export default function MemoryNotice({ onManage }: { onManage: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = window.localStorage.getItem(DISMISSED_KEY) === "1"; } catch { /* private mode */ }
    if (!dismissed) {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
  }, []);

  if (!visible) return null;
  const dismiss = () => {
    try { window.localStorage.setItem(DISMISSED_KEY, "1"); } catch { /* private mode */ }
    setVisible(false);
  };

  return (
    <div role="note" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border-soft bg-surface-muted px-3 py-2 text-[12.5px] text-ink-muted mb-4">
      <span>✦ Cartisan remembers what you browse and tell the assistant, to personalise your suggestions.</span>
      <button onClick={onManage} className="text-accent underline">Manage</button>
      <button onClick={dismiss} className="ml-auto text-ink-faint hover:text-ink" aria-label="Dismiss">Got it</button>
    </div>
  );
}
