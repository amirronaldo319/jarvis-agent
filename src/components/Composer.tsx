"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Paperclip, Square } from "lucide-react";
import { useApp } from "./AppProvider";
import { ModelMenu } from "./ModelMenu";
import type { AgentMode } from "@/lib/types";

const MODES: { id: AgentMode; label: string; hint: string }[] = [
  { id: "ask", label: "Ask", hint: "Answers questions. No side effects." },
  { id: "plan", label: "Plan", hint: "Proposes steps. Executes nothing." },
  { id: "act", label: "Act", hint: "Proposes actions. Nothing runs until you approve." },
];

export function Composer({ initial = "", onSent }: { initial?: string; onSent?: () => void }) {
  const { send, stop, live, settings, setSettings, selectedModel } = useApp();
  const [text, setText] = useState(initial);
  const ta = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);

  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    };
    fit();
    let width = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== width) { width = el.clientWidth; fit(); }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);
  useEffect(() => { ta.current?.focus(); }, []);

  const modelBlocked = selectedModel?.status !== "available";
  const reason = modelBlocked ? "No connected model. Add ANTHROPIC_API_KEY to .env.local and restart." : "";
  const canSend = !!text.trim() && !live && !reason;

  function submit() {
    if (!canSend) return;
    const t = text.trim();
    setText("");
    onSent?.();
    void send(t);
  }

  return (
    <div className="composer-wrap">
      <div className="composer">
        <label htmlFor="composer-input" className="sr-only">Message</label>
        <textarea id="composer-input" ref={ta} rows={1} value={text} placeholder="Ask, plan or instruct…" maxLength={20000}
          onChange={(e) => setText(e.target.value)}
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={() => { composing.current = false; }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !composing.current && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }} />
        <div className="composer__bar">
          <button className="icon-btn" disabled aria-label="Attach file (not available yet)" title="Attachments are not implemented yet"><Paperclip size={18} strokeWidth={1.5} /></button>
          <div className="seg" role="radiogroup" aria-label="Agent mode" style={{ minWidth: 150 }}>
            {MODES.map((m) => (
              <button key={m.id} role="radio" aria-checked={settings.mode === m.id} title={m.hint} onClick={() => setSettings({ mode: m.id })}>{m.label}</button>
            ))}
          </div>
          <ModelMenu up />
          <span className="spacer" />
          {live ? (
            <button className="btn btn--danger btn--sm" onClick={stop} aria-label="Stop generating"><Square size={14} fill="currentColor" strokeWidth={0} /><span className="btn-label">Stop</span></button>
          ) : (
            <button className="btn btn--primary btn--sm" onClick={submit} disabled={!canSend} aria-label="Send message" title={reason || undefined}><ArrowUp size={16} strokeWidth={2} /><span className="btn-label">Send</span></button>
          )}
        </div>
      </div>
      <p className="hint" role={reason ? "alert" : undefined}>{reason || "Enter to send · Shift+Enter for a new line · ⌘K for commands"}</p>
    </div>
  );
}
