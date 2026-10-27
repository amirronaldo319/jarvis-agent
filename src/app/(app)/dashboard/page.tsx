"use client";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { Badge, Empty, Panel } from "@/components/ui";
import { RadarChart, Readout, RingGauge, SegmentBar, Terminal } from "@/components/hud";
import { RunList } from "@/components/RunList";
import { filterTasks } from "@/lib/tasks";
import { useToday } from "@/lib/today";
import { buildLog } from "@/lib/activity-log";

const SOURCES = [
  { name: "Gmail", note: "Inbox and drafts" },
  { name: "Google Calendar", note: "Agenda and availability" },
  { name: "Search provider", note: "Web research" },
];

export default function Dashboard() {
  const { tasks, conversations, runs, models, approvals } = useApp();
  const todayStr = useToday();
  const overdue = filterTasks(tasks, "overdue", "", todayStr).length;
  const today = filterTasks(tasks, "today", "", todayStr);
  const open = tasks.filter((t) => !t.done).length;
  const done = tasks.length - open;
  const online = models?.filter((m) => m.status === "available") ?? [];
  const finished = runs.filter((r) => r.status !== "running");
  const ok = finished.filter((r) => r.status === "completed").length;
  const count = (s: string) => approvals.filter((a) => a.status === s).length;
  const log = buildLog(runs, approvals, 6);

  return (
    <div className="page"><div className="page__inner">
      <h2 className="page-title">Briefing</h2>
      <div className="stat-row">
        <Readout label="Open tasks" value={open} />
        <Readout label="Overdue" value={overdue} />
        <Readout label="Conversations" value={conversations.length} />
        <Readout label="Agent runs" value={runs.length} />
      </div>
      <div className="grid">
        <Panel title="Task completion" code="LOCAL TASKS" tone={overdue ? "warn" : undefined}>
          {tasks.length === 0 ? <Empty title="No tasks yet"><Link href="/tasks" style={{ color: "var(--signal)", textDecoration: "underline" }}>Add a task</Link></Empty> : (
            <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
              <RingGauge value={done} max={tasks.length} label="Done" tone={overdue ? "warn" : "signal"} />
              <div style={{ flex: 1, minWidth: 160, display: "grid", gap: 12 }}>
                <SegmentBar value={done} max={tasks.length} segments={12} label={`${done} of ${tasks.length} complete`} />
                {overdue > 0 && <Badge status="caution">{overdue} overdue</Badge>}
              </div>
            </div>
          )}
        </Panel>
        <Panel title="Today" code="LOCAL TASKS">
          {today.length === 0 ? <Empty title="Nothing due today" /> :
            today.map((t) => <div key={t.id} className="row"><span className="row__main">{t.title}</span><Badge status={t.priority === "high" ? "caution" : "offline"}>{t.priority}</Badge></div>)}
        </Panel>
        <Panel title="Activity mix" code="RELATIVE COUNTS">
          {runs.length + approvals.length === 0 ? <Empty title="No activity yet" /> : (
            <div style={{ display: "grid", placeItems: "center" }}>
              <RadarChart label="Activity mix" axes={[
                { label: "Done", value: ok },
                { label: "Failed", value: finished.filter((r) => r.status === "failed").length },
                { label: "Stopped", value: finished.filter((r) => r.status === "cancelled").length },
                { label: "Approved", value: count("executed") },
                { label: "Rejected", value: count("rejected") },
              ]} />
            </div>
          )}
        </Panel>
        <Panel title="Connected sources" code="STATUS">
          {SOURCES.map((s) => (
            <div key={s.name} className="row"><div className="row__main">{s.name}<div className="muted mono" style={{ fontSize: 11 }}>{s.note}</div></div><Badge status="offline">Not connected</Badge></div>
          ))}
          <p className="muted" style={{ margin: "12px 0 0", fontSize: 14 }}>Email and calendar widgets stay hidden until a real integration is authorized. Nothing here is sample data.</p>
        </Panel>
        <Panel title="Models" code={`${online.length} ONLINE`}>
          {!models ? <div className="skeleton" /> : online.length === 0 ?
            <Empty title="No model connected">Add ANTHROPIC_API_KEY to .env.local, then restart the dev server.</Empty> :
            online.map((m) => <div key={m.id} className="row"><span className="row__main">{m.label}</span><Badge status="nominal" /></div>)}
        </Panel>
        <Panel title="Event log" code="LIVE">
          {log.length === 0 ? <Empty title="No events yet" /> : <Terminal lines={log} label="Recent events" />}
        </Panel>
        <Panel title="Recent agent runs" code="LOCAL LOG"><RunList limit={5} /></Panel>
      </div>
    </div></div>
  );
}
