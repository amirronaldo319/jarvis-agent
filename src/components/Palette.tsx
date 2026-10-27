"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { useApp } from "./AppProvider";
import { NAV } from "./nav";

interface Item { id: string; label: string; meta: string; run: () => void }

export function Palette({ onClose }: { onClose: () => void }) {
  const { conversations, tasks, setActiveId, setSettings } = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => { router.push(href); onClose(); };
    const base: Item[] = [
      { id: "new", label: "New chat", meta: "Command", run: () => { setActiveId(null); go("/")(); } },
      ...NAV.map((n) => ({ id: n.href, label: `Go to ${n.label}`, meta: "Navigate", run: go(n.href) })),
      ...(["jarvis", "alert", "stark"] as const).map((t) => ({ id: `t-${t}`, label: `Theme: ${t}`, meta: "Command", run: () => { setSettings({ theme: t }); onClose(); } })),
      ...conversations.map((c) => ({ id: c.id, label: c.title, meta: "Conversation", run: () => { setActiveId(c.id); go("/")(); } })),
      ...tasks.map((t) => ({ id: t.id, label: t.title, meta: t.done ? "Task · done" : "Task", run: go("/tasks") })),
    ];
    const s = q.trim().toLowerCase();
    return (s ? base.filter((i) => i.label.toLowerCase().includes(s)) : base).slice(0, 40);
  }, [q, conversations, tasks, router, onClose, setActiveId, setSettings]);

  const cur = Math.min(idx, Math.max(items.length - 1, 0));
  useEffect(() => {
    document.querySelector(`[data-pal="${cur}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cur]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx(Math.min(cur + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx(Math.max(cur - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); items[cur]?.run(); }
    else if (e.key === "Escape") onClose();
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette" onKeyDown={onKey}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px", borderBottom: "1px solid var(--line-subtle)" }}>
          <Search size={18} strokeWidth={1.5} aria-hidden className="muted" />
          <input ref={inputRef} className="input" style={{ background: "transparent", borderBottom: 0 }} placeholder="Search commands, chats, tasks…" aria-label="Search" value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }} />
        </div>
        <div className="palette__list" role="listbox">
          {items.length === 0 && <div className="empty" style={{ border: 0 }}>No results</div>}
          {items.map((it, i) => (
            <button key={it.id} role="option" aria-selected={i === cur} data-pal={i} data-active={i === cur} className="menu__item" onMouseEnter={() => setIdx(i)} onClick={it.run}>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</span>
              <span className="menu__meta">{it.meta}</span>
              {i === cur && <CornerDownLeft size={14} aria-hidden />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
