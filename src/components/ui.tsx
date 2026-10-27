"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Circle, Square, Triangle } from "lucide-react";

export type Status = "nominal" | "caution" | "critical" | "offline";
const WORD: Record<Status, string> = { nominal: "Nominal", caution: "Caution", critical: "Critical", offline: "Offline" };

export function Badge({ status, children }: { status: Status; children?: ReactNode }) {
  const Glyph = status === "nominal" ? Circle : status === "caution" ? Triangle : status === "critical" ? Square : Circle;
  return (
    <span className={`badge badge--${status}`}>
      <Glyph size={10} strokeWidth={status === "offline" ? 2 : 0} fill={status === "offline" ? "none" : "currentColor"} aria-hidden />
      {children ?? WORD[status]}
    </span>
  );
}

export function Panel({ title, code, tone, children, className = "" }: { title?: string; code?: string; tone?: "warn" | "critical"; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${tone ? `panel--${tone}` : ""} ${className}`}>
      {(title || code) && (
        <div className="panel__head">
          <h2 className="panel__title">{title}</h2>
          {code && <span className="panel__code">{code}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><strong>{title}</strong>{children}</div>;
}

const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([]);
  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, msg }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => <div key={t.id} className="toast">{t.msg}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}
