"use client";
import { useApp } from "./AppProvider";
import type { ThemeId } from "@/lib/types";

const THEMES: { id: ThemeId; name: string; c: string }[] = [
  { id: "jarvis", name: "JARVIS Cyan", c: "#3fe0ff" },
  { id: "alert", name: "Alert Amber", c: "#ffb02e" },
  { id: "stark", name: "Stark Workshop (light)", c: "#006b8a" },
];

export function ThemeSwitch() {
  const { settings, setSettings } = useApp();
  return (
    <div className="theme-switch" role="radiogroup" aria-label="Theme">
      {THEMES.map((t) => (
        <button key={t.id} role="radio" aria-checked={settings.theme === t.id} aria-label={t.name} title={t.name} style={{ "--c": t.c } as React.CSSProperties} onClick={() => setSettings({ theme: t.id })}><i /></button>
      ))}
    </div>
  );
}
