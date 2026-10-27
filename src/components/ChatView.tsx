"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, RefreshCw } from "lucide-react";
import { useApp } from "./AppProvider";
import { Composer } from "./Composer";
import { Badge, useToast } from "./ui";
import { ApprovalCard } from "./ApprovalCard";
import type { Msg } from "@/lib/types";

const PROMPTS = [
  { t: "What's on my calendar today?", s: "Needs Google Calendar, not connected" },
  { t: "Summarize my important emails.", s: "Needs Gmail, not connected" },
  { t: "Help me plan my week.", s: "Works now in Plan mode" },
  { t: "Research this topic.", s: "No search provider, answers from model only" },
  { t: "What tasks are overdue?", s: "Local tasks, see Tasks page" },
  { t: "Organize my project.", s: "Works now in Plan mode" },
];

function Message({ m, streamText, isLast }: { m: Msg; streamText?: string; isLast: boolean }) {
  const { regenerate, live, approvals } = useApp();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const streaming = streamText !== undefined;
  const content = streaming ? streamText : m.content;
  const copy = async () => {
    try { await navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { toast("Copy failed. Clipboard is blocked."); }
  };
  return (
    <article className={`msg msg--${m.role} ${m.error ? "msg--error" : ""}`} aria-label={m.role === "user" ? "You" : "Agent"}>
      <div className="msg__who">
        <span className="label" style={{ color: m.role === "user" ? "var(--ink)" : "var(--signal)" }}>{m.role === "user" ? "You" : "Jarvis"}</span>
        <span className="mono muted" style={{ fontSize: 11 }}>{new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        {m.error && <Badge status="critical">Failed</Badge>}
      </div>
      <div className="msg__body">
        {m.role === "user" ? (
          <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
        ) : (
          <>
            {content ? <div className="md" dir="auto"><ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown></div> : !m.error && <span className="muted mono">Thinking</span>}
            {streaming && <span className="caret" aria-hidden />}
            {m.error && <p className="mono" style={{ color: "var(--critical)", margin: content ? "12px 0 0" : 0, fontSize: 13 }}>{m.error}</p>}
          </>
        )}
      </div>
      {m.approvalIds?.map((id) => { const a = approvals.find((x) => x.id === id); return a ? <ApprovalCard key={id} approval={a} /> : null; })}
      {m.role === "assistant" && !streaming && (
        <div className="msg__actions">
          {content && <button className="icon-btn" onClick={copy} aria-label="Copy response">{copied ? <Check size={16} strokeWidth={1.5} /> : <Copy size={16} strokeWidth={1.5} />}</button>}
          {isLast && <button className="icon-btn" onClick={() => void regenerate()} disabled={!!live} aria-label={m.error ? "Retry" : "Regenerate response"}><RefreshCw size={16} strokeWidth={1.5} /></button>}
        </div>
      )}
    </article>
  );
}

export function ChatView() {
  const { active, live } = useApp();
  const [seed, setSeed] = useState("");
  const [seedKey, setSeedKey] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current && (active?.messages.length ?? 0) > 0) el.scrollTop = el.scrollHeight;
  }, [active?.messages.length, live?.text]);
  useEffect(() => { stick.current = true; }, [active?.id]);

  const msgs = active?.messages ?? [];
  return (
    <div className="chat">
      <div className="chat__scroll" ref={scroller} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
        {msgs.length === 0 ? (
          <div className="welcome">
            <div>
              <span className="label">All systems nominal</span>
              <h1>At your service,<br /><span>sir.</span></h1>
            </div>
            <div className="prompts">
              {PROMPTS.map((p) => (
                <button key={p.t} className="prompt" onClick={() => { setSeed(p.t); setSeedKey((k) => k + 1); }}>
                  <span>{p.t}</span><small>{p.s}</small>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="chat__col" role="log" aria-live="polite" aria-label="Conversation">
            {msgs.map((m, i) => (
              <Message key={m.id} m={m} isLast={i === msgs.length - 1} streamText={live?.msgId === m.id ? live.text : undefined} />
            ))}
          </div>
        )}
      </div>
      <Composer key={`${active?.id ?? "new"}-${seedKey}`} initial={seed} onSent={() => setSeed("")} />
    </div>
  );
}
