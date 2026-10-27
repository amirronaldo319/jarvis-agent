"use client";
import { useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { GAUGE_C, GAUGE_R, clamp, gaugeOffset, percent, radarPoint, segmentsOn } from "./math";

export { Badge, Panel } from "../ui";
type Tone = "signal" | "warn" | "critical";
const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(" ");

export function Button({ variant = "ghost", size, className, type = "button", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "ghost" | "primary" | "danger"; size?: "sm" }) {
  return <button type={type} className={cx("btn", variant !== "ghost" && `btn--${variant}`, size === "sm" && "btn--sm", className)} {...rest} />;
}

export function Readout({ label, value, unit, delta }: { label: string; value: ReactNode; unit?: string; delta?: string }) {
  return (
    <div className="readout">
      <span className="label">{label}</span>
      <div><span className="readout__value">{value}</span>{unit && <span className="readout__unit">{unit}</span>}</div>
      {delta && <span className="readout__delta">{delta}</span>}
    </div>
  );
}

export function RingGauge({ value, max = 100, label, size = 120, tone = "signal" }: { value: number; max?: number; label?: string; size?: number; tone?: Tone }) {
  const v = clamp(value, 0, max);
  return (
    <div className={cx("gauge", tone !== "signal" && `gauge--${tone}`)}>
      <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`${label ?? "Gauge"} ${v} of ${max}`}>
        <circle className="gauge__ticks" cx="60" cy="60" r="54" fill="none" strokeWidth="1.5" strokeDasharray={`1.5 ${((2 * Math.PI * 54) / 48 - 1.5).toFixed(2)}`} />
        <circle className="gauge__track" cx="60" cy="60" r={GAUGE_R} fill="none" strokeWidth="6" />
        <circle className="gauge__arc" cx="60" cy="60" r={GAUGE_R} fill="none" strokeWidth="6" strokeDasharray={GAUGE_C} strokeDashoffset={gaugeOffset(v, max)} transform="rotate(-90 60 60)" />
        <text className="gauge__num" x="60" y="69" textAnchor="middle">{percent(v, max)}%</text>
      </svg>
      {label && <span className="label">{label}</span>}
    </div>
  );
}

export function SegmentBar({ value, max = 100, segments = 20, label, tone = "signal" }: { value: number; max?: number; segments?: number; label?: string; tone?: Tone }) {
  const on = segmentsOn(value, max, segments);
  return (
    <div className={cx("segbar", tone !== "signal" && `segbar--${tone}`)}>
      {label && <div className="segbar__head"><span className="label">{label}</span><span className="label">{percent(value, max)}%</span></div>}
      <div className="segbar__row" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label ?? "Progress"}>
        {Array.from({ length: segments }, (_, i) => <span key={i} className={cx("segbar__cell", i < on && "segbar__cell--on")} />)}
      </div>
    </div>
  );
}

const LEVEL = { info: "INFO", ok: "OK", warn: "WARN", error: "FAIL" } as const;
export interface TermLine { time: string; level: keyof typeof LEVEL; message: string }

export function Terminal({ lines, prompt, label = "System log" }: { lines: TermLine[]; prompt?: string; label?: string }) {
  return (
    <div className="term" role="log" aria-label={label}>
      {lines.map((l, i) => (
        <div key={i} className="term__line">
          <span className="term__time">{l.time}</span>
          <span className={`term__lvl term__lvl--${l.level}`}>{LEVEL[l.level]}</span>
          <span className="term__msg">{l.message}</span>
        </div>
      ))}
      {prompt !== undefined && (
        <div className="term__line"><span className="term__time">&gt;</span><span className="term__msg">{prompt}<span className="caret" aria-hidden /></span></div>
      )}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, label, children }: { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void; label?: string; children?: ReactNode }) {
  const uid = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  function onKey(e: React.KeyboardEvent) {
    const i = tabs.findIndex((t) => t.id === value);
    const n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
    if (n === null) return;
    e.preventDefault();
    const next = tabs[(n + tabs.length) % tabs.length].id;
    onChange(next);
    refs.current[next]?.focus();
  }
  return (
    <div>
      <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKey}>
        {tabs.map((t) => (
          <button key={t.id} ref={(el) => { refs.current[t.id] = el; }} type="button" role="tab" id={`${uid}-t-${t.id}`} aria-selected={t.id === value} aria-controls={`${uid}-p`} tabIndex={t.id === value ? 0 : -1} onClick={() => onChange(t.id)}>{t.label}</button>
        ))}
      </div>
      <div role="tabpanel" id={`${uid}-p`} aria-labelledby={`${uid}-t-${value}`} style={{ paddingTop: 16 }}>{children}</div>
    </div>
  );
}

export function RadarChart({ axes, max, size = 240, label = "Radar chart" }: { axes: { label: string; value: number }[]; max?: number; size?: number; label?: string }) {
  const n = axes.length;
  if (n < 3) return null;
  const top = max ?? Math.max(1, ...axes.map((a) => a.value));
  const poly = (f: number) => axes.map((_, i) => radarPoint(i, n, f).join(",")).join(" ");
  const data = axes.map((a, i) => radarPoint(i, n, clamp(a.value, 0, top) / top).join(",")).join(" ");
  return (
    <svg className="radar" width={Math.round(size * 1.3)} height={size} viewBox="-36 0 312 240" style={{ maxWidth: "100%", height: "auto" }} role="img" aria-label={`${label}: ${axes.map((a) => `${a.label} ${a.value}`).join(", ")}`}>
      {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} className="radar__ring" points={poly(f)} fill="none" strokeWidth="1" />)}
      {axes.map((_, i) => { const p = radarPoint(i, n, 1); return <line key={i} className="radar__spoke" x1="120" y1="120" x2={p[0]} y2={p[1]} strokeWidth="1" />; })}
      <polygon className="radar__data" points={data} strokeWidth="2" />
      {axes.map((a, i) => { const p = radarPoint(i, n, clamp(a.value, 0, top) / top); return <circle key={i} className="radar__dot" cx={p[0]} cy={p[1]} r="3" />; })}
      {axes.map((a, i) => { const p = radarPoint(i, n, 1.2); return <text key={i} className="radar__label" x={p[0]} y={p[1] + 4} textAnchor={p[0] < 116 ? "end" : p[0] > 124 ? "start" : "middle"}>{a.label}</text>; })}
    </svg>
  );
}

export function Field({ label, hint, error, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  return (
    <div className={cx("field", error && "field--error")}>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} className="input" aria-invalid={!!error || undefined} aria-describedby={hint || error ? `${id}-h` : undefined} {...rest} />
      {(error || hint) && <span id={`${id}-h`} className="field__hint">{error ?? hint}</span>}
    </div>
  );
}
