"use client";
import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { Badge, Empty, Panel } from "@/components/ui";
import { Button, Field, Tabs } from "@/components/hud";
import { filterTasks, type TaskFilter } from "@/lib/tasks";
import { useToday } from "@/lib/today";
import { uid } from "@/lib/store";
import type { Priority } from "@/lib/types";

const TABS: { id: TaskFilter; label: string }[] = [
  { id: "today", label: "Today" }, { id: "upcoming", label: "Upcoming" }, { id: "overdue", label: "Overdue" },
  { id: "completed", label: "Completed" }, { id: "all", label: "All" },
];

export default function Tasks() {
  const { tasks, setTasks } = useApp();
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<Priority>("med");
  const [err, setErr] = useState("");
  const today = useToday();
  const list = filterTasks(tasks, filter, q, today);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) { setErr("Enter a task title."); return; }
    setTasks((all) => [{ id: uid(), title: t.slice(0, 200), priority, due: due || undefined, done: false, createdAt: Date.now() }, ...all]);
    setTitle(""); setDue(""); setErr("");
  }

  return (
    <div className="page"><div className="page__inner">
      <h2 className="page-title">Tasks</h2>
      <Panel title="New task" code="LOCAL">
        <form className="form-row" onSubmit={add} noValidate>
          <div className="grow"><Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Review the quarterly plan" error={err || undefined} /></div>
          <div className="field"><label className="label" htmlFor="t-due">Due</label><input id="t-due" type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} /></div>
          <div className="field"><label className="label" htmlFor="t-pri">Priority</label>
            <select id="t-pri" className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}><option value="low">Low</option><option value="med">Medium</option><option value="high">High</option></select>
          </div>
          <Button variant="primary" type="submit">Add</Button>
        </form>
      </Panel>
      <div>
        <Tabs tabs={TABS} value={filter} onChange={setFilter} label="Task filter">
        <div style={{ margin: "16px 0" }}><input className="input" placeholder="Search tasks" aria-label="Search tasks" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {list.length === 0 ? <Empty title={tasks.length ? "No matching tasks" : "No tasks yet"}>{tasks.length ? "Try another filter or search." : "Add your first task above. Tasks are stored in this browser."}</Empty> :
          <div className="panel" style={{ padding: "0 16px" }}>
            {list.map((t) => (
              <div key={t.id} className={`row ${t.done ? "row--done" : ""}`}>
                <button className="check" role="checkbox" aria-checked={t.done} aria-label={`Mark ${t.title} ${t.done ? "incomplete" : "complete"}`}
                  onClick={() => setTasks((all) => all.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))}>{t.done && <Check size={14} strokeWidth={2.5} />}</button>
                <div className="row__main"><div className="row__title">{t.title}</div>
                  {t.due && <div className="mono muted" style={{ fontSize: 11 }}>Due {t.due}</div>}</div>
                {!t.done && t.due && t.due < today && <Badge status="critical">Overdue</Badge>}
                <Badge status={t.priority === "high" ? "caution" : "offline"}>{t.priority}</Badge>
                <button className="icon-btn" aria-label={`Delete ${t.title}`} onClick={() => setTasks((all) => all.filter((x) => x.id !== t.id))}><Trash2 size={16} strokeWidth={1.5} /></button>
              </div>
            ))}
          </div>}
        </Tabs>
      </div>
      <p className="muted mono" style={{ fontSize: 12 }}>Local tasks only. No external task provider is synchronized and no reminders are scheduled.</p>
    </div></div>
  );
}
