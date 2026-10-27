"use client";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { Badge, Empty, Panel } from "@/components/ui";
import { RunList } from "@/components/RunList";
import { filterTasks } from "@/lib/tasks";
import { useToday } from "@/lib/today";

const SOURCES = [
  { name: "Gmail", note: "Inbox and drafts" },
  { name: "Google Calendar", note: "Agenda and availability" },
  { name: "Search provider", note: "Web research" },
];

export default function Dashboard() {
  const { tasks, conversations, runs, models } = useApp();
  const todayStr = useToday();
  const overdue = filterTasks(tasks, "overdue", "", todayStr).length;
  const today = filterTasks(tasks, "today", "", todayStr);
  const open = tasks.filter((t) => !t.done).length;
  const online = models?.filter((m) => m.status === "available").length ?? 0;

  return (
    <div className="page"><div className="page__inner">
      <h2 className="page-title">Briefing</h2>
      <div className="stat-row">
        {[["Open tasks", open], ["Overdue", overdue], ["Conversations", conversations.length], ["Agent runs", runs.length]].map(([k, v]) => (
          <div key={k as string}><span className="label">{k}</span><div className="readout__value">{v}</div></div>
        ))}
      </div>
      <div className="grid">
        <Panel title="Today" code="LOCAL TASKS">
          {today.length === 0 ? <Empty title="Nothing due today"><Link href="/tasks" style={{ color: "var(--signal)", textDecoration: "underline" }}>Add a task</Link></Empty> :
            today.map((t) => <div key={t.id} className="row"><span className="row__main">{t.title}</span><Badge status={t.priority === "high" ? "caution" : "offline"}>{t.priority}</Badge></div>)}
        </Panel>
        <Panel title="Connected sources" code="STATUS">
          {SOURCES.map((s) => (
            <div key={s.name} className="row"><div className="row__main">{s.name}<div className="muted mono" style={{ fontSize: 11 }}>{s.note}</div></div><Badge status="offline">Not connected</Badge></div>
          ))}
          <p className="muted" style={{ margin: "12px 0 0", fontSize: 14 }}>Email and calendar widgets stay hidden until a real integration is authorized. Nothing here is sample data.</p>
        </Panel>
        <Panel title="Models" code={`${online} ONLINE`}>
          {!models ? <div className="skeleton" /> : models.filter((m) => m.status === "available").length === 0 ?
            <Empty title="No model connected">Add ANTHROPIC_API_KEY to .env.local, then restart the dev server.</Empty> :
            models.filter((m) => m.status === "available").map((m) => <div key={m.id} className="row"><span className="row__main">{m.label}</span><Badge status="nominal" /></div>)}
        </Panel>
        <Panel title="Recent agent runs" code="LOCAL LOG"><RunList limit={5} /></Panel>
      </div>
    </div></div>
  );
}
