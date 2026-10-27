"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useApp } from "./AppProvider";
import { Badge, type Status } from "./ui";
import type { ModelInfo } from "@/lib/models";

const STATUS: Record<ModelInfo["status"], { s: Status; w: string }> = {
  available: { s: "nominal", w: "Online" },
  "no-key": { s: "offline", w: "No key" },
  "needs-config": { s: "caution", w: "Set up" },
};

export function ModelMenu({ up = false }: { up?: boolean }) {
  const { models, settings, setSettings, selectedModel } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const label = selectedModel?.label ?? (models ? "Select model" : "Loading…");
  return (
    <div className="menu-wrap" ref={ref}>
      <button className="btn btn--sm" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span style={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <ChevronDown size={14} strokeWidth={1.5} aria-hidden />
      </button>
      {open && (
        <div className={`menu ${up ? "menu--up" : ""}`} role="listbox" aria-label="Model">
          {!models && <div style={{ padding: 12 }}><div className="skeleton" /></div>}
          {models?.map((m) => {
            const st = STATUS[m.status];
            const ok = m.status === "available";
            return (
              <button key={m.id} role="option" aria-selected={m.id === settings.model} aria-checked={m.id === settings.model} className="menu__item" disabled={!ok}
                onClick={() => { setSettings({ model: m.id }); setOpen(false); }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block" }}>{m.label}</span>
                  <span className="menu__meta">
                    {m.provider}{m.status === "available" ? ` · ${m.capabilities.join(", ")}` : m.hint ? ` · ${m.hint} in .env.local` : ""}
                  </span>
                </span>
                <Badge status={st.s}>{st.w}</Badge>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
