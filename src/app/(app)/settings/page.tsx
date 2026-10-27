"use client";
import { useApp } from "@/components/AppProvider";
import { Badge, Panel, useToast } from "@/components/ui";
import type { ThemeId } from "@/lib/types";

const THEMES: { id: ThemeId; name: string; c: string }[] = [
  { id: "jarvis", name: "JARVIS Cyan", c: "#3fe0ff" }, { id: "alert", name: "Alert Amber", c: "#ffb02e" }, { id: "stark", name: "Stark Workshop (light)", c: "#006b8a" },
];

export default function SettingsPage() {
  const { settings, setSettings, models } = useApp();
  const toast = useToast();
  function wipe() {
    if (!confirm("Delete all conversations, tasks, runs and settings stored in this browser?")) return;
    ["jv.settings", "jv.convs", "jv.tasks", "jv.runs", "jv.ui"].forEach((k) => localStorage.removeItem(k));
    toast("Local data deleted."); setTimeout(() => window.location.replace(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`), 400);
  }
  return (
    <div className="page"><div className="page__inner">
      <h2 className="page-title">Settings</h2>
      <div className="grid">
        <Panel title="Theme" code="APPEARANCE">
          <div role="radiogroup" aria-label="Theme" style={{ display: "grid", gap: 8 }}>
            {THEMES.map((t) => (
              <button key={t.id} className="swatch" role="radio" aria-checked={settings.theme === t.id} onClick={() => setSettings({ theme: t.id })}>
                <i style={{ background: t.c }} /><span>{t.name}</span>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Providers" code="MODEL REGISTRY">
          {!models ? <div className="skeleton" /> : models.map((m) => (
            <div key={m.id} className="row"><div className="row__main">{m.label}<div className="mono muted" style={{ fontSize: 11 }}>{m.provider}{m.hint ? ` · ${m.hint}` : ""}</div></div>
              <Badge status={m.status === "available" ? "nominal" : m.status === "needs-config" ? "caution" : "offline"}>{m.status === "available" ? "Online" : m.status === "no-key" ? "No key" : "Set up"}</Badge></div>
          ))}
          <p className="muted mono" style={{ fontSize: 11, margin: "12px 0 0" }}>Keys live in server environment variables and never reach the browser.</p>
        </Panel>
        <Panel title="Your data" code="BROWSER STORAGE" tone="critical">
          <p style={{ marginTop: 0 }}>Conversations, tasks and the run log are stored only in this browser. There is no account and no sync.</p>
          <button className="btn btn--danger" onClick={wipe}>Delete local data</button>
        </Panel>
        <Panel title="Not built yet" code="HONEST LIST">
          <ul className="muted" style={{ margin: 0, paddingInlineStart: 20 }}>
            <li>Gmail, Calendar, Drive integrations</li><li>Memory, projects, notes, files</li><li>Automations and reminders</li><li>More tools (only save_note exists) and multi-step agent runs</li><li>Accounts and server-side persistence</li><li>Persian / RTL</li>
          </ul>
        </Panel>
      </div>
    </div></div>
  );
}
